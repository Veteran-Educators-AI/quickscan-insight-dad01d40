import { useState, useEffect, useCallback, useRef } from 'react';

export interface TWAINScanner {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  type: 'twain' | 'sane' | 'wia';
  isDefault?: boolean;
}

export interface TWAINScanSettings {
  colorMode: 'color' | 'grayscale' | 'blackwhite';
  resolution: number;
  paperSize: 'letter' | 'legal' | 'a4' | 'auto';
  duplex: boolean;
  useFeeder: boolean;
  brightness: number;
  contrast: number;
}

interface BridgeMessage {
  type: 'scanners' | 'scan_result' | 'scan_progress' | 'error' | 'status' | 'capabilities';
  data?: any;
  error?: string;
}

const DEFAULT_BRIDGE_PORT = 28465;
const BRIDGE_RECONNECT_INTERVAL = 5000;

export function useTWAINBridge() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [bridgeVersion, setBridgeVersion] = useState<string | null>(null);
  const [availableScanners, setAvailableScanners] = useState<TWAINScanner[]>([]);
  const [selectedScanner, setSelectedScanner] = useState<TWAINScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanSettings, setScanSettings] = useState<TWAINScanSettings>({
    colorMode: 'color',
    resolution: 300,
    paperSize: 'letter',
    duplex: false,
    useFeeder: false,
    brightness: 0,
    contrast: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttempts = useRef(0);

  const connect = useCallback(async (port: number = DEFAULT_BRIDGE_PORT) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(`ws://localhost:${port}`);
      
      ws.onopen = () => {
        console.log('TWAIN Bridge connected');
        setIsConnected(true);
        setIsConnecting(false);
        connectionAttempts.current = 0;
        
        // Request scanner list
        ws.send(JSON.stringify({ type: 'get_scanners' }));
        ws.send(JSON.stringify({ type: 'get_status' }));
      };

      ws.onmessage = (event) => {
        try {
          const message: BridgeMessage = JSON.parse(event.data);
          handleBridgeMessage(message);
        } catch (e) {
          console.error('Failed to parse bridge message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('TWAIN Bridge WebSocket error:', event);
        setError('Connection to scanner bridge failed');
      };

      ws.onclose = () => {
        console.log('TWAIN Bridge disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Attempt reconnect if we were previously connected
        if (connectionAttempts.current < 3) {
          connectionAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect(port);
          }, BRIDGE_RECONNECT_INTERVAL);
        }
      };

      wsRef.current = ws;
    } catch (e) {
      setIsConnecting(false);
      setError('Failed to connect to scanner bridge. Make sure the companion app is running.');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    connectionAttempts.current = 0;
  }, []);

  const handleBridgeMessage = (message: BridgeMessage) => {
    switch (message.type) {
      case 'status':
        setBridgeVersion(message.data?.version || null);
        break;
        
      case 'scanners':
        setAvailableScanners(message.data || []);
        // Auto-select default scanner
        const defaultScanner = message.data?.find((s: TWAINScanner) => s.isDefault);
        if (defaultScanner && !selectedScanner) {
          setSelectedScanner(defaultScanner);
        }
        break;
        
      case 'scan_progress':
        setScanProgress(message.data?.progress || 0);
        break;
        
      case 'scan_result':
        setIsScanning(false);
        setScanProgress(100);
        if (message.data?.images) {
          setScannedImages(prev => [...prev, ...message.data.images]);
        }
        break;
        
      case 'error':
        setIsScanning(false);
        setError(message.error || 'Unknown scanning error');
        break;
        
      case 'capabilities':
        // Could store scanner capabilities if needed
        break;
    }
  };

  const refreshScanners = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get_scanners' }));
    }
  }, []);

  const selectScanner = useCallback((scanner: TWAINScanner) => {
    setSelectedScanner(scanner);
    // Request capabilities for selected scanner
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'get_capabilities',
        scannerId: scanner.id 
      }));
    }
  }, []);

  const updateSettings = useCallback((updates: Partial<TWAINScanSettings>) => {
    setScanSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const startScan = useCallback(async (): Promise<string[]> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to scanner bridge');
      return [];
    }

    if (!selectedScanner) {
      setError('No scanner selected');
      return [];
    }

    setIsScanning(true);
    setScanProgress(0);
    setError(null);

    return new Promise((resolve) => {
      const handleResult = (event: MessageEvent) => {
        try {
          const message: BridgeMessage = JSON.parse(event.data);
          if (message.type === 'scan_result') {
            wsRef.current?.removeEventListener('message', handleResult);
            resolve(message.data?.images || []);
          } else if (message.type === 'error') {
            wsRef.current?.removeEventListener('message', handleResult);
            resolve([]);
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      wsRef.current?.addEventListener('message', handleResult);

      wsRef.current?.send(JSON.stringify({
        type: 'scan',
        scannerId: selectedScanner.id,
        settings: scanSettings,
      }));

      // Timeout after 2 minutes
      setTimeout(() => {
        wsRef.current?.removeEventListener('message', handleResult);
        if (isScanning) {
          setIsScanning(false);
          setError('Scan timed out');
          resolve([]);
        }
      }, 120000);
    });
  }, [selectedScanner, scanSettings, isScanning]);

  const cancelScan = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel_scan' }));
    }
    setIsScanning(false);
    setScanProgress(0);
  }, []);

  const clearImages = useCallback(() => {
    setScannedImages([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    bridgeVersion,
    error,
    
    // Scanner management
    availableScanners,
    selectedScanner,
    selectScanner,
    refreshScanners,
    
    // Scan settings
    scanSettings,
    updateSettings,
    
    // Scanning
    isScanning,
    scanProgress,
    scannedImages,
    startScan,
    cancelScan,
    clearImages,
    
    // Connection management
    connect,
    disconnect,
  };
}
