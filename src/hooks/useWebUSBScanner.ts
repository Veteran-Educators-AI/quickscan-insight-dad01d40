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

interface UseWebUSBScannerReturn {
  isSupported: boolean;
  isConnecting: boolean;
  isScanning: boolean;
  connectedDevice: WebUSBScannerDevice | null;
  capabilities: ScannerCapabilities | null;
  scanSettings: ScanSettings;
  scannedImages: string[];
  error: string | null;
  requestDevice: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  startScan: () => Promise<string[]>;
  cancelScan: () => void;
  updateSettings: (settings: Partial<ScanSettings>) => void;
  clearImages: () => void;
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
  const [connectedDevice, setConnectedDevice] = useState<WebUSBScannerDevice | null>(null);
  const [capabilities, setCapabilities] = useState<ScannerCapabilities | null>(null);
  const [scanSettings, setScanSettings] = useState<ScanSettings>(DEFAULT_SETTINGS);
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const scanAbortRef = useRef(false);
  const deviceRef = useRef<USBDevice | null>(null);

  // Check for previously paired devices on mount
  useEffect(() => {
    if (!isSupported) return;

    const checkPairedDevices = async () => {
      try {
        const devices = await navigator.usb.getDevices();
        const scanner = devices.find(d => 
          KNOWN_SCANNER_VENDORS.includes(d.vendorId) ||
          d.deviceClass === 0x10 // Image class
        );
        
        if (scanner) {
          console.log('Found previously paired scanner:', scanner.productName);
        }
      } catch (err) {
        console.error('Error checking paired devices:', err);
      }
    };

    checkPairedDevices();

    // Listen for device connections/disconnections
    const handleConnect = (event: USBConnectionEvent) => {
      if (deviceRef.current?.serialNumber === event.device.serialNumber) {
        setConnectedDevice(prev => prev ? { ...prev, isConnected: true } : null);
        toast.success('Scanner reconnected');
      }
    };

    const handleDisconnect = (event: USBConnectionEvent) => {
      if (deviceRef.current?.serialNumber === event.device.serialNumber) {
        setConnectedDevice(prev => prev ? { ...prev, isConnected: false } : null);
        toast.warning('Scanner disconnected');
      }
    };

    navigator.usb.addEventListener('connect', handleConnect);
    navigator.usb.addEventListener('disconnect', handleDisconnect);

    return () => {
      navigator.usb.removeEventListener('connect', handleConnect);
      navigator.usb.removeEventListener('disconnect', handleDisconnect);
    };
  }, [isSupported]);

  const requestDevice = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('WebUSB is not supported in this browser. Please use Chrome or Edge.');
      return false;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request a USB device with scanner-like characteristics
      const device = await navigator.usb.requestDevice({
        filters: [
          // Known scanner vendors
          ...KNOWN_SCANNER_VENDORS.map(vendorId => ({ vendorId })),
          // USB Image class (scanners)
          { classCode: 0x10 },
        ],
      });

      if (!device) {
        throw new Error('No device selected');
      }

      console.log('Selected device:', device.productName, device.vendorId, device.productId);

      // Open the device
      await device.open();
      
      // Select configuration if not already selected
      if (device.configuration === null && device.configurations.length > 0) {
        await device.selectConfiguration(device.configurations[0].configurationValue);
      }

      // Claim the first interface
      if (device.configuration && device.configuration.interfaces.length > 0) {
        const interfaceNumber = device.configuration.interfaces[0].interfaceNumber;
        await device.claimInterface(interfaceNumber);
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
      console.error('Error connecting to scanner:', err);
      
      if (err.name === 'NotFoundError') {
        // User cancelled the dialog or no device was selected - not an error to display
        setError(null);
      } else if (err.name === 'SecurityError') {
        setError('Permission denied. Please allow access to the scanner.');
      } else if (err.name === 'NetworkError' && deviceRef.current) {
        // Only show "in use" error if we actually had a device reference
        setError('Scanner is in use by another application. Please close other scanning software.');
      } else if (err.message?.includes('Unable to claim interface')) {
        setError('Scanner is busy or in use by another application.');
      } else {
        // Don't show generic errors for connection cancellation
        setError(null);
      }
      
      return false;
    } finally {
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

  return {
    isSupported,
    isConnecting,
    isScanning,
    connectedDevice,
    capabilities,
    scanSettings,
    scannedImages,
    error,
    requestDevice,
    disconnect,
    startScan,
    cancelScan,
    updateSettings,
    clearImages,
  };
}
