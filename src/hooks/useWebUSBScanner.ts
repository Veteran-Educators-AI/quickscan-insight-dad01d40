import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

// WebUSB type declarations for browsers that support it
declare global {
  interface Navigator {
    usb?: USB;
  }

  interface USB {
    getDevices(): Promise<USBDevice[]>;
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
    addEventListener(type: 'connect' | 'disconnect', listener: (event: USBConnectionEvent) => void): void;
    removeEventListener(type: 'connect' | 'disconnect', listener: (event: USBConnectionEvent) => void): void;
  }

  interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[];
  }

  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
    subclassCode?: number;
    protocolCode?: number;
    serialNumber?: string;
  }

  interface USBDevice {
    vendorId: number;
    productId: number;
    deviceClass: number;
    deviceSubclass: number;
    deviceProtocol: number;
    deviceVersionMajor: number;
    deviceVersionMinor: number;
    deviceVersionSubminor: number;
    manufacturerName?: string;
    productName?: string;
    serialNumber?: string;
    configuration?: USBConfiguration;
    configurations: USBConfiguration[];
    opened: boolean;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;
    controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>;
    controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
    clearHalt(direction: 'in' | 'out', endpointNumber: number): Promise<void>;
    reset(): Promise<void>;
  }

  interface USBConfiguration {
    configurationValue: number;
    configurationName?: string;
    interfaces: USBInterface[];
  }

  interface USBInterface {
    interfaceNumber: number;
    alternate: USBAlternateInterface;
    alternates: USBAlternateInterface[];
    claimed: boolean;
  }

  interface USBAlternateInterface {
    alternateSetting: number;
    interfaceClass: number;
    interfaceSubclass: number;
    interfaceProtocol: number;
    interfaceName?: string;
    endpoints: USBEndpoint[];
  }

  interface USBEndpoint {
    endpointNumber: number;
    direction: 'in' | 'out';
    type: 'bulk' | 'interrupt' | 'isochronous';
    packetSize: number;
  }

  interface USBControlTransferParameters {
    requestType: 'standard' | 'class' | 'vendor';
    recipient: 'device' | 'interface' | 'endpoint' | 'other';
    request: number;
    value: number;
    index: number;
  }

  interface USBInTransferResult {
    data?: DataView;
    status: 'ok' | 'stall' | 'babble';
  }

  interface USBOutTransferResult {
    bytesWritten: number;
    status: 'ok' | 'stall';
  }

  interface USBConnectionEvent extends Event {
    device: USBDevice;
  }
}

export interface WebUSBScannerDevice {
  device: USBDevice;
  name: string;
  vendorId: number;
  productId: number;
  isConnected: boolean;
}

export interface ScannerCapabilities {
  colorModes: string[];
  resolutions: number[];
  paperSizes: string[];
  hasDuplex: boolean;
  hasFeeder: boolean;
}

export interface ScanSettings {
  colorMode: 'color' | 'grayscale' | 'blackwhite';
  resolution: number;
  paperSize: 'letter' | 'legal' | 'a4' | 'auto';
  duplex: boolean;
  useFeeder: boolean;
}

export interface CompatibilityCheck {
  isCompatible: boolean;
  hasImageClass: boolean;
  hasBulkEndpoints: boolean;
  hasInputEndpoint: boolean;
  hasOutputEndpoint: boolean;
  interfaceCount: number;
  endpointCount: number;
  warnings: string[];
  details: string;
}

interface UseWebUSBScannerReturn {
  isSupported: boolean;
  isConnecting: boolean;
  isScanning: boolean;
  isCheckingCompatibility: boolean;
  isAutoReconnecting: boolean;
  connectedDevice: WebUSBScannerDevice | null;
  capabilities: ScannerCapabilities | null;
  compatibility: CompatibilityCheck | null;
  scanSettings: ScanSettings;
  scannedImages: string[];
  error: string | null;
  pairedDevices: USBDevice[];
  requestDevice: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  startScan: () => Promise<string[]>;
  cancelScan: () => void;
  updateSettings: (settings: Partial<ScanSettings>) => void;
  clearImages: () => void;
  checkCompatibility: () => Promise<CompatibilityCheck | null>;
  reconnectToDevice: (device: USBDevice) => Promise<boolean>;
}

// Common scanner vendor IDs
const KNOWN_SCANNER_VENDORS = [
  0x04a9, // Canon
  0x04b8, // Epson
  0x03f0, // HP
  0x04f9, // Brother
  0x04c5, // Fujitsu
  0x0638, // Avision
  0x1083, // Canon (alternate)
  0x05da, // Microtek
  0x055f, // Mustek
  0x04e8, // Samsung
  0x0a17, // Pentax
  0x06dc, // Lexmark
  0x043d, // Lexmark (alternate)
  0x0424, // Standard scanner class
];

const DEFAULT_SETTINGS: ScanSettings = {
  colorMode: 'color',
  resolution: 300,
  paperSize: 'letter',
  duplex: false,
  useFeeder: false,
};

const DEFAULT_CAPABILITIES: ScannerCapabilities = {
  colorModes: ['color', 'grayscale', 'blackwhite'],
  resolutions: [150, 200, 300, 600],
  paperSizes: ['letter', 'a4', 'legal'],
  hasDuplex: false,
  hasFeeder: false,
};

export function useWebUSBScanner(): UseWebUSBScannerReturn {
  const [isSupported] = useState(() => 'usb' in navigator);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingCompatibility, setIsCheckingCompatibility] = useState(false);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<WebUSBScannerDevice | null>(null);
  const [capabilities, setCapabilities] = useState<ScannerCapabilities | null>(null);
  const [compatibility, setCompatibility] = useState<CompatibilityCheck | null>(null);
  const [scanSettings, setScanSettings] = useState<ScanSettings>(DEFAULT_SETTINGS);
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pairedDevices, setPairedDevices] = useState<USBDevice[]>([]);
  
  const scanAbortRef = useRef(false);
  const deviceRef = useRef<USBDevice | null>(null);
  const autoReconnectAttemptedRef = useRef(false);

  // Connect to a specific device (used for auto-reconnect)
  const connectToDevice = useCallback(async (device: USBDevice, isAutoReconnect = false): Promise<boolean> => {
    if (isAutoReconnect) {
      setIsAutoReconnecting(true);
    } else {
      setIsConnecting(true);
    }
    setError(null);

    const OPEN_TIMEOUT = 8000;

    try {
      // Open the device with timeout
      const openWithTimeout = Promise.race([
        device.open(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('OPEN_TIMEOUT')), OPEN_TIMEOUT)
        )
      ]);
      
      await openWithTimeout;
      
      // Select configuration if not already selected
      if (device.configuration === null && device.configurations.length > 0) {
        await Promise.race([
          device.selectConfiguration(device.configurations[0].configurationValue),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('CONFIG_TIMEOUT')), 5000)
          )
        ]);
      }

      // Claim the first interface
      if (device.configuration && device.configuration.interfaces.length > 0) {
        const interfaceNumber = device.configuration.interfaces[0].interfaceNumber;
        await Promise.race([
          device.claimInterface(interfaceNumber),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('CLAIM_TIMEOUT')), 5000)
          )
        ]);
      }

      deviceRef.current = device;

      const scannerDevice: WebUSBScannerDevice = {
        device,
        name: device.productName || `Scanner (${device.vendorId.toString(16)}:${device.productId.toString(16)})`,
        vendorId: device.vendorId,
        productId: device.productId,
        isConnected: true,
      };

      setConnectedDevice(scannerDevice);
      
      const deviceCapabilities: ScannerCapabilities = {
        ...DEFAULT_CAPABILITIES,
      };
      setCapabilities(deviceCapabilities);

      if (isAutoReconnect) {
        toast.success(`Auto-reconnected to ${scannerDevice.name}`, {
          description: 'Previously paired scanner detected and connected.'
        });
      } else {
        toast.success(`Connected to ${scannerDevice.name}`);
      }
      
      return true;

    } catch (err: any) {
      console.error('Error connecting to device:', err);
      
      if (err.message === 'OPEN_TIMEOUT') {
        if (!isAutoReconnect) {
          setError('Connection timed out. The scanner may be busy.');
          toast.error('Scanner connection timed out');
        }
      } else if (err.message === 'CONFIG_TIMEOUT' || err.message === 'CLAIM_TIMEOUT') {
        if (!isAutoReconnect) {
          setError('Failed to configure scanner.');
          toast.error('Scanner configuration failed');
        }
      } else if (!isAutoReconnect) {
        setError('Could not connect to scanner.');
      }
      
      return false;
    } finally {
      setIsConnecting(false);
      setIsAutoReconnecting(false);
    }
  }, []);

  // Reconnect to a previously paired device
  const reconnectToDevice = useCallback(async (device: USBDevice): Promise<boolean> => {
    return connectToDevice(device, false);
  }, [connectToDevice]);

  // Check for previously paired devices on mount (NO auto-reconnect - user must click)
  useEffect(() => {
    if (!isSupported) return;

    const checkPairedDevices = async () => {
      try {
        const devices = await navigator.usb!.getDevices();
        const scanners = devices.filter(d => 
          KNOWN_SCANNER_VENDORS.includes(d.vendorId) ||
          d.deviceClass === 0x10
        );
        
        setPairedDevices(scanners);
        
        // NOTE: We intentionally do NOT auto-reconnect here.
        // The browser remembers paired devices, but the scanner is not actually connected
        // until the user explicitly clicks "Reconnect" or "Connect Scanner".
        // Auto-reconnecting was confusing users as it showed "paired" before any action.
        if (scanners.length > 0) {
          console.log('Found remembered scanners (not yet connected):', scanners.map(s => s.productName));
        }
      } catch (err) {
        console.error('Error checking paired devices:', err);
      }
    };

    checkPairedDevices();

    // Listen for device connections/disconnections
    const handleConnect = async (event: USBConnectionEvent) => {
      const device = event.device;
      const isKnownScanner = KNOWN_SCANNER_VENDORS.includes(device.vendorId) || device.deviceClass === 0x10;
      
      if (isKnownScanner) {
        // Update paired devices list
        setPairedDevices(prev => {
          const exists = prev.some(d => d.serialNumber === device.serialNumber);
          return exists ? prev : [...prev, device];
        });
        
        // If currently connected device was reconnected
        if (deviceRef.current?.serialNumber === device.serialNumber) {
          setConnectedDevice(prev => prev ? { ...prev, isConnected: true } : null);
          toast.success('Scanner reconnected');
        } else if (!connectedDevice) {
          // Auto-connect to newly connected scanner if none connected
          toast.info(`Scanner detected: ${device.productName || 'Unknown Scanner'}`, {
            description: 'Attempting to auto-connect...',
            duration: 2000,
          });
          
          setTimeout(async () => {
            const success = await connectToDevice(device, true);
            if (!success) {
              toast.info('Scanner available for connection', {
                description: 'Click "Connect Scanner" to use it.',
              });
            }
          }, 1000);
        }
      }
    };

    const handleDisconnect = (event: USBConnectionEvent) => {
      const device = event.device;
      
      // Update paired devices list
      setPairedDevices(prev => prev.filter(d => d.serialNumber !== device.serialNumber));
      
      if (deviceRef.current?.serialNumber === device.serialNumber) {
        setConnectedDevice(prev => prev ? { ...prev, isConnected: false } : null);
        toast.warning('Scanner disconnected', {
          description: 'Reconnect the scanner to continue.',
        });
      }
    };

    navigator.usb!.addEventListener('connect', handleConnect);
    navigator.usb!.addEventListener('disconnect', handleDisconnect);

    return () => {
      navigator.usb!.removeEventListener('connect', handleConnect);
      navigator.usb!.removeEventListener('disconnect', handleDisconnect);
    };
  }, [isSupported, connectedDevice, connectToDevice]);

  const requestDevice = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('WebUSB is not supported in this browser. Please use Chrome or Edge.');
      return false;
    }

    setIsConnecting(true);
    setError(null);

    // Connection timeout - 15 seconds total for device selection + connection
    const CONNECTION_TIMEOUT = 15000;
    let timeoutId: NodeJS.Timeout | null = null;
    let connectionAborted = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        connectionAborted = true;
        reject(new Error('CONNECTION_TIMEOUT'));
      }, CONNECTION_TIMEOUT);
    });

    try {
      // Request a USB device with scanner-like characteristics
      const device = await navigator.usb!.requestDevice({
        filters: [
          // Known scanner vendors
          ...KNOWN_SCANNER_VENDORS.map(vendorId => ({ vendorId })),
          // USB Image class (scanners)
          { classCode: 0x10 },
        ],
      });

      if (timeoutId) clearTimeout(timeoutId);
      
      if (!device) {
        throw new Error('No device selected');
      }

      if (connectionAborted) {
        throw new Error('CONNECTION_TIMEOUT');
      }

      console.log('Selected device:', device.productName, device.vendorId, device.productId);

      // Open the device with timeout
      const OPEN_TIMEOUT = 8000;
      const openWithTimeout = Promise.race([
        device.open(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('OPEN_TIMEOUT')), OPEN_TIMEOUT)
        )
      ]);
      
      await openWithTimeout;
      
      // Select configuration if not already selected (with timeout)
      if (device.configuration === null && device.configurations.length > 0) {
        await Promise.race([
          device.selectConfiguration(device.configurations[0].configurationValue),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('CONFIG_TIMEOUT')), 5000)
          )
        ]);
      }

      // Claim the first interface (with timeout)
      if (device.configuration && device.configuration.interfaces.length > 0) {
        const interfaceNumber = device.configuration.interfaces[0].interfaceNumber;
        await Promise.race([
          device.claimInterface(interfaceNumber),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('CLAIM_TIMEOUT')), 5000)
          )
        ]);
      }

      deviceRef.current = device;

      const scannerDevice: WebUSBScannerDevice = {
        device,
        name: device.productName || `Scanner (${device.vendorId.toString(16)}:${device.productId.toString(16)})`,
        vendorId: device.vendorId,
        productId: device.productId,
        isConnected: true,
      };

      setConnectedDevice(scannerDevice);
      
      // Query device capabilities (simplified - real implementation would parse device descriptors)
      const deviceCapabilities: ScannerCapabilities = {
        ...DEFAULT_CAPABILITIES,
        // Could query actual capabilities via control transfers
      };
      setCapabilities(deviceCapabilities);

      toast.success(`Connected to ${scannerDevice.name}`);
      return true;

    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error('Error connecting to scanner:', err);
      
      // Handle timeout errors specifically
      if (err.message === 'CONNECTION_TIMEOUT' || err.message === 'OPEN_TIMEOUT') {
        setError('Connection timed out. The scanner may be busy or unresponsive. Try power cycling it.');
        toast.error('Scanner connection timed out', {
          description: 'Try unplugging and reconnecting the scanner.'
        });
      } else if (err.message === 'CONFIG_TIMEOUT' || err.message === 'CLAIM_TIMEOUT') {
        setError('Failed to configure scanner. It may be in use by another application.');
        toast.error('Scanner configuration failed', {
          description: 'Close any other scanning software and try again.'
        });
      } else if (err.name === 'NotFoundError' || err.name === 'AbortError') {
        // User cancelled the dialog or no device was selected - not an error
        setError(null);
      } else if (err.name === 'SecurityError') {
        setError('Permission denied. Please allow access to the scanner.');
      } else if (err.message?.includes('Unable to claim interface')) {
        setError('Scanner interface is busy. Try unplugging and reconnecting the scanner.');
      } else if (err.name === 'NetworkError') {
        setError('Connection lost. Check USB cable and try again.');
      } else {
        // Generic fallback with actionable message
        setError('Could not connect to scanner. Please check the connection and try again.');
      }
      
      return false;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsConnecting(false);
    }
  }, [isSupported]);

  const disconnect = useCallback(async () => {
    if (deviceRef.current) {
      try {
        await deviceRef.current.close();
      } catch (err) {
        console.error('Error closing device:', err);
      }
      deviceRef.current = null;
    }
    setConnectedDevice(null);
    setCapabilities(null);
    toast.info('Scanner disconnected');
  }, []);

  const startScan = useCallback(async (): Promise<string[]> => {
    if (!deviceRef.current || !connectedDevice?.isConnected) {
      setError('Scanner not connected');
      return [];
    }

    setIsScanning(true);
    setError(null);
    scanAbortRef.current = false;

    try {
      const device = deviceRef.current;
      const images: string[] = [];

      // Note: Real scanner communication requires device-specific protocols
      // Most scanners use SANE, TWAIN, or WIA protocols which are complex
      // This is a simplified demonstration that works with USB scanner class devices
      
      toast.info('Scanning... Please wait');

      // Find bulk endpoints for data transfer
      let inEndpoint: USBEndpoint | undefined;
      let outEndpoint: USBEndpoint | undefined;

      if (device.configuration) {
        for (const iface of device.configuration.interfaces) {
          for (const alt of iface.alternates) {
            for (const endpoint of alt.endpoints) {
              if (endpoint.direction === 'in' && endpoint.type === 'bulk') {
                inEndpoint = endpoint;
              } else if (endpoint.direction === 'out' && endpoint.type === 'bulk') {
                outEndpoint = endpoint;
              }
            }
          }
        }
      }

      if (!inEndpoint) {
        // Many scanners require proprietary protocols
        // For demo purposes, we'll simulate a scan with a timeout
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In a real implementation, you would:
        // 1. Send scan parameters via control transfer
        // 2. Wait for scan ready signal
        // 3. Read image data from bulk endpoint
        // 4. Decode image data (usually raw RGB or compressed)
        
        toast.warning('Scanner communication protocol not fully implemented. Using simulated scan.');
        
        // For demonstration, return empty - user would need to use file import
        setScannedImages([]);
        return [];
      }

      // Attempt to read data from scanner
      // This is device-specific and may not work with all scanners
      try {
        // Send scan command (device-specific)
        if (outEndpoint) {
          const scanCommand = new Uint8Array([0x1B, 0x49]); // ESC I - common scan initiate
          await device.transferOut(outEndpoint.endpointNumber, scanCommand);
        }

        // Read scan data
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;
        const maxBytes = 50 * 1024 * 1024; // 50MB max

        while (!scanAbortRef.current && totalBytes < maxBytes) {
          const result = await device.transferIn(inEndpoint.endpointNumber, 65536);
          
          if (result.status === 'ok' && result.data && result.data.byteLength > 0) {
            chunks.push(new Uint8Array(result.data.buffer));
            totalBytes += result.data.byteLength;
          } else if (result.status === 'stall') {
            // End of data
            break;
          }
        }

        if (chunks.length > 0) {
          // Combine chunks into single buffer
          const fullData = new Uint8Array(totalBytes);
          let offset = 0;
          for (const chunk of chunks) {
            fullData.set(chunk, offset);
            offset += chunk.length;
          }

          // Convert to image (assuming raw image data or common format)
          const blob = new Blob([fullData], { type: 'image/png' });
          const imageUrl = URL.createObjectURL(blob);
          images.push(imageUrl);
        }
      } catch (transferErr) {
        console.error('Transfer error:', transferErr);
        toast.error('Failed to read scan data. Scanner may require specific driver support.');
      }

      setScannedImages(prev => [...prev, ...images]);
      
      if (images.length > 0) {
        toast.success(`Scanned ${images.length} page(s)`);
      }
      
      return images;

    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err.message || 'Scan failed');
      toast.error('Scan failed: ' + (err.message || 'Unknown error'));
      return [];
    } finally {
      setIsScanning(false);
    }
  }, [connectedDevice]);

  const cancelScan = useCallback(() => {
    scanAbortRef.current = true;
    setIsScanning(false);
    toast.info('Scan cancelled');
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ScanSettings>) => {
    setScanSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const clearImages = useCallback(() => {
    // Revoke object URLs to free memory
    scannedImages.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setScannedImages([]);
  }, [scannedImages]);

  // Comprehensive compatibility check
  const checkCompatibility = useCallback(async (): Promise<CompatibilityCheck | null> => {
    if (!deviceRef.current) {
      return null;
    }

    setIsCheckingCompatibility(true);
    
    try {
      const device = deviceRef.current;
      const warnings: string[] = [];
      
      let hasImageClass = false;
      let hasBulkEndpoints = false;
      let hasInputEndpoint = false;
      let hasOutputEndpoint = false;
      let interfaceCount = 0;
      let endpointCount = 0;

      // Check device class
      if (device.deviceClass === 0x10) {
        hasImageClass = true;
      }

      // Analyze configuration and interfaces
      if (device.configuration) {
        interfaceCount = device.configuration.interfaces.length;
        
        for (const iface of device.configuration.interfaces) {
          for (const alt of iface.alternates) {
            // Check for Image class in interface
            if (alt.interfaceClass === 0x10 || alt.interfaceClass === 0x06) {
              hasImageClass = true;
            }
            
            endpointCount += alt.endpoints.length;
            
            for (const endpoint of alt.endpoints) {
              if (endpoint.type === 'bulk') {
                hasBulkEndpoints = true;
                if (endpoint.direction === 'in') {
                  hasInputEndpoint = true;
                } else if (endpoint.direction === 'out') {
                  hasOutputEndpoint = true;
                }
              }
            }
          }
        }
      }

      // Generate warnings
      if (!hasImageClass) {
        warnings.push('Scanner may not support USB Image Class protocol');
      }
      if (!hasBulkEndpoints) {
        warnings.push('No bulk data transfer endpoints detected');
      }
      if (!hasInputEndpoint) {
        warnings.push('No data input endpoint found - cannot receive scanned images');
      }
      if (!hasOutputEndpoint) {
        warnings.push('No command output endpoint found - may not be able to control scanner');
      }
      if (interfaceCount === 0) {
        warnings.push('No USB interfaces detected on device');
      }

      // Build details string
      const details = [
        `Device: ${device.productName || 'Unknown'}`,
        `Vendor: ${device.manufacturerName || device.vendorId.toString(16).toUpperCase()}`,
        `Interfaces: ${interfaceCount}`,
        `Endpoints: ${endpointCount}`,
        `Image Class: ${hasImageClass ? 'Yes' : 'No'}`,
        `Bulk Transfer: ${hasBulkEndpoints ? 'Available' : 'Not Available'}`,
      ].join(' | ');

      const isCompatible = hasImageClass && hasInputEndpoint;

      const result: CompatibilityCheck = {
        isCompatible,
        hasImageClass,
        hasBulkEndpoints,
        hasInputEndpoint,
        hasOutputEndpoint,
        interfaceCount,
        endpointCount,
        warnings,
        details,
      };

      setCompatibility(result);
      
      if (!isCompatible) {
        toast.warning('Scanner may have limited compatibility', {
          description: 'Some features may not work. Consider using file import.',
        });
      } else if (warnings.length > 0) {
        toast.info('Scanner connected with warnings', {
          description: warnings[0],
        });
      } else {
        toast.success('Scanner fully compatible!');
      }

      return result;
    } catch (err) {
      console.error('Compatibility check error:', err);
      return null;
    } finally {
      setIsCheckingCompatibility(false);
    }
  }, []);

  return {
    isSupported,
    isConnecting,
    isScanning,
    isCheckingCompatibility,
    isAutoReconnecting,
    connectedDevice,
    capabilities,
    compatibility,
    scanSettings,
    scannedImages,
    error,
    pairedDevices,
    requestDevice,
    disconnect,
    startScan,
    cancelScan,
    updateSettings,
    clearImages,
    checkCompatibility,
    reconnectToDevice,
  };
}
