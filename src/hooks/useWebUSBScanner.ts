import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

// WebUSB type declarations for browsers that support it
declare global {
  interface Navigator {
    usb?: USB;
  }

  interface USB {
    getDevices(): Promise<USBDevice[]>;
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
    addEventListener(type: "connect" | "disconnect", listener: (event: USBConnectionEvent) => void): void;
    removeEventListener(type: "connect" | "disconnect", listener: (event: USBConnectionEvent) => void): void;
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
    clearHalt(direction: "in" | "out", endpointNumber: number): Promise<void>;
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
    direction: "in" | "out";
    type: "bulk" | "interrupt" | "isochronous";
    packetSize: number;
  }

  interface USBControlTransferParameters {
    requestType: "standard" | "class" | "vendor";
    recipient: "device" | "interface" | "endpoint" | "other";
    request: number;
    value: number;
    index: number;
  }

  interface USBInTransferResult {
    data?: DataView;
    status: "ok" | "stall" | "babble";
  }

  interface USBOutTransferResult {
    bytesWritten: number;
    status: "ok" | "stall";
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
  colorMode: "color" | "grayscale" | "blackwhite";
  resolution: number;
  paperSize: "letter" | "legal" | "a4" | "auto";
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
  clearError: () => void;
  checkCompatibility: () => Promise<CompatibilityCheck | null>;
  reconnectToDevice: (device: USBDevice) => Promise<boolean>;
}

// Comprehensive scanner vendor IDs for maximum compatibility
const KNOWN_SCANNER_VENDORS = [
  // Major scanner manufacturers
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
  // Additional vendors
  0x1000, // Kodak/Alaris
  0x0482, // Kyocera
  0x0801, // MagTek
  0x1038, // Xerox
  0x0a82, // Plustek
  0x0a53, // Genius
  0x0409, // NEC
  0x04da, // Panasonic
  0x0789, // Logitec
  0x07b3, // Plustek (alternate)
  0x0458, // KYE Systems (Genius)
];

// Scanner protocol commands - ESC/POS and common protocols
const SCANNER_COMMANDS = {
  // ESC/POS Commands (widely supported)
  ESC_INIT: new Uint8Array([0x1b, 0x40]), // Initialize
  ESC_SCAN: new Uint8Array([0x1b, 0x49]), // Start scan
  ESC_STATUS: new Uint8Array([0x1b, 0x76]), // Get status
  ESC_ABORT: new Uint8Array([0x1b, 0x18]), // Cancel/Abort

  // USB Still Image Capture Device commands
  STILL_CAPTURE: new Uint8Array([0x10, 0x01]), // Capture still image
  STILL_GET_INFO: new Uint8Array([0x10, 0x02]), // Get device info

  // Generic scan parameters
  SET_RESOLUTION_300: new Uint8Array([0x1b, 0x52, 0x01, 0x2c]), // 300 DPI
  SET_RESOLUTION_600: new Uint8Array([0x1b, 0x52, 0x02, 0x58]), // 600 DPI
  SET_COLOR_MODE: new Uint8Array([0x1b, 0x43, 0x01]), // Color
  SET_GRAYSCALE_MODE: new Uint8Array([0x1b, 0x43, 0x02]), // Grayscale
  SET_BW_MODE: new Uint8Array([0x1b, 0x43, 0x03]), // Black & White
};

// Image format signatures for detection
const IMAGE_SIGNATURES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47],
  TIFF_LE: [0x49, 0x49, 0x2a, 0x00],
  TIFF_BE: [0x4d, 0x4d, 0x00, 0x2a],
  BMP: [0x42, 0x4d],
  GIF: [0x47, 0x49, 0x46],
};

const DEFAULT_SETTINGS: ScanSettings = {
  colorMode: "color",
  resolution: 300,
  paperSize: "letter",
  duplex: false,
  useFeeder: false,
};

const DEFAULT_CAPABILITIES: ScannerCapabilities = {
  colorModes: ["color", "grayscale", "blackwhite"],
  resolutions: [150, 200, 300, 600],
  paperSizes: ["letter", "a4", "legal"],
  hasDuplex: false,
  hasFeeder: false,
};

// Helper function to detect image format from data
function detectImageFormat(data: Uint8Array): string | null {
  if (data.length < 4) return null;

  const checkSignature = (sig: number[]) => sig.every((byte, i) => data[i] === byte);

  if (checkSignature(IMAGE_SIGNATURES.JPEG)) return "image/jpeg";
  if (checkSignature(IMAGE_SIGNATURES.PNG)) return "image/png";
  if (checkSignature(IMAGE_SIGNATURES.TIFF_LE) || checkSignature(IMAGE_SIGNATURES.TIFF_BE)) return "image/tiff";
  if (checkSignature(IMAGE_SIGNATURES.BMP)) return "image/bmp";
  if (checkSignature(IMAGE_SIGNATURES.GIF)) return "image/gif";

  return null;
}

// Helper function to find JPEG in raw data (some scanners embed JPEG in proprietary format)
function findJPEGInData(data: Uint8Array): Uint8Array | null {
  // Look for JPEG start marker (FFD8FF)
  for (let i = 0; i < data.length - 2; i++) {
    if (data[i] === 0xff && data[i + 1] === 0xd8 && data[i + 2] === 0xff) {
      // Find JPEG end marker (FFD9)
      for (let j = data.length - 1; j > i + 2; j--) {
        if (data[j] === 0xd9 && data[j - 1] === 0xff) {
          return data.slice(i, j + 1);
        }
      }
      // No end marker found, return from start to end
      return data.slice(i);
    }
  }
  return null;
}

// Helper function to convert raw RGB data to canvas image
function rawRGBToDataURL(data: Uint8Array, width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imageData = ctx.createImageData(width, height);
  const pixelData = imageData.data;

  // Convert RGB to RGBA
  let srcIndex = 0;
  let dstIndex = 0;
  for (let i = 0; i < width * height && srcIndex < data.length - 2; i++) {
    pixelData[dstIndex++] = data[srcIndex++]; // R
    pixelData[dstIndex++] = data[srcIndex++]; // G
    pixelData[dstIndex++] = data[srcIndex++]; // B
    pixelData[dstIndex++] = 255; // A
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

// Helper to build scan parameter command
function buildScanCommand(settings: ScanSettings, vendorId: number): Uint8Array[] {
  const commands: Uint8Array[] = [];

  // Initialize scanner
  commands.push(SCANNER_COMMANDS.ESC_INIT);

  // Set resolution
  const resolutionByte =
    settings.resolution === 600 ? 0x02 : settings.resolution === 300 ? 0x01 : settings.resolution === 200 ? 0x00 : 0x00;
  commands.push(new Uint8Array([0x1b, 0x52, resolutionByte, settings.resolution & 0xff]));

  // Set color mode
  const colorCommand =
    settings.colorMode === "color"
      ? SCANNER_COMMANDS.SET_COLOR_MODE
      : settings.colorMode === "grayscale"
        ? SCANNER_COMMANDS.SET_GRAYSCALE_MODE
        : SCANNER_COMMANDS.SET_BW_MODE;
  commands.push(colorCommand);

  // Paper size (simplified - actual implementation varies by vendor)
  const paperSizeBytes: Record<string, number> = {
    letter: 0x01,
    legal: 0x02,
    a4: 0x03,
    auto: 0x00,
  };
  commands.push(new Uint8Array([0x1b, 0x50, paperSizeBytes[settings.paperSize] || 0x00]));

  // Start scan command
  commands.push(SCANNER_COMMANDS.ESC_SCAN);

  return commands;
}

export function useWebUSBScanner(): UseWebUSBScannerReturn {
  const [isSupported] = useState(() => "usb" in navigator);
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
      // If device is already open, try to close it first
      if (device.opened) {
        console.log("[WebUSB] Device already open, closing first...");
        try {
          await device.close();
          // Small delay after closing
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (closeErr) {
          console.log("[WebUSB] Error closing device (continuing):", closeErr);
        }
      }

      // Open the device with timeout
      const openWithTimeout = Promise.race([
        device.open(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("OPEN_TIMEOUT")), OPEN_TIMEOUT)),
      ]);

      await openWithTimeout;
      console.log("[WebUSB] Device opened successfully");

      // Select configuration if not already selected
      if (device.configuration === null && device.configurations.length > 0) {
        await Promise.race([
          device.selectConfiguration(device.configurations[0].configurationValue),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("CONFIG_TIMEOUT")), 5000)),
        ]);
        console.log("[WebUSB] Configuration selected");
      }

      // Try to claim an interface - try multiple if first fails
      let interfaceClaimed = false;
      if (device.configuration && device.configuration.interfaces.length > 0) {
        for (const iface of device.configuration.interfaces) {
          const interfaceNumber = iface.interfaceNumber;

          // Skip if already claimed
          if (iface.claimed) {
            console.log(`[WebUSB] Interface ${interfaceNumber} already claimed`);
            interfaceClaimed = true;
            break;
          }

          try {
            console.log(`[WebUSB] Attempting to claim interface ${interfaceNumber}...`);
            await Promise.race([
              device.claimInterface(interfaceNumber),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error("CLAIM_TIMEOUT")), 5000)),
            ]);
            console.log(`[WebUSB] Successfully claimed interface ${interfaceNumber}`);
            interfaceClaimed = true;
            break;
          } catch (claimErr: any) {
            console.log(`[WebUSB] Failed to claim interface ${interfaceNumber}:`, claimErr.message);
            // Try next interface
          }
        }

        if (!interfaceClaimed) {
          // Try resetting the device and claiming again
          console.log("[WebUSB] All interfaces failed, attempting device reset...");
          try {
            await device.reset();
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Try claiming first interface after reset
            const interfaceNumber = device.configuration.interfaces[0].interfaceNumber;
            await device.claimInterface(interfaceNumber);
            interfaceClaimed = true;
            console.log("[WebUSB] Claimed interface after reset");
          } catch (resetErr) {
            console.log("[WebUSB] Reset failed:", resetErr);
          }
        }
      }

      if (!interfaceClaimed) {
        throw new Error("CLAIM_FAILED");
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
          description: "Previously paired scanner detected and connected.",
        });
      } else {
        toast.success(`Connected to ${scannerDevice.name}`);
      }

      return true;
    } catch (err: any) {
      console.error("Error connecting to device:", err);

      if (err.message === "OPEN_TIMEOUT") {
        if (!isAutoReconnect) {
          setError("Connection timed out. The scanner may be busy.");
          toast.error("Scanner connection timed out");
        }
      } else if (err.message === "CONFIG_TIMEOUT" || err.message === "CLAIM_TIMEOUT") {
        if (!isAutoReconnect) {
          setError("Failed to configure scanner.");
          toast.error("Scanner configuration failed");
        }
      } else if (err.message === "CLAIM_FAILED") {
        if (!isAutoReconnect) {
          setError("Scanner is in use. Close other scanning apps, unplug the scanner for 5 seconds, then reconnect.");
          toast.error("Scanner interface busy", {
            description: "Close Epson Scan or other apps, then unplug and replug the scanner.",
            duration: 6000,
          });
        }
      } else if (err.message?.includes("Unable to claim interface") || err.message?.includes("LIBUSB_ERROR_BUSY")) {
        if (!isAutoReconnect) {
          setError("Scanner is being used by another application. Close other scanning software and try again.");
          toast.error("Scanner in use by another app", {
            description: "Close Epson Scan, Windows Fax and Scan, or similar apps.",
            duration: 6000,
          });
        }
      } else if (!isAutoReconnect) {
        setError("Could not connect to scanner. Try unplugging and reconnecting it.");
      }

      return false;
    } finally {
      setIsConnecting(false);
      setIsAutoReconnecting(false);
    }
  }, []);

  // Reconnect to a previously paired device
  const reconnectToDevice = useCallback(
    async (device: USBDevice): Promise<boolean> => {
      return connectToDevice(device, false);
    },
    [connectToDevice],
  );

  // Check for previously paired devices on mount (NO auto-reconnect - user must click)
  useEffect(() => {
    if (!isSupported) return;

    // Clear any stale error state from previous sessions
    setError(null);

    const checkPairedDevices = async () => {
      try {
        const devices = await navigator.usb!.getDevices();
        const scanners = devices.filter((d) => KNOWN_SCANNER_VENDORS.includes(d.vendorId) || d.deviceClass === 0x10);

        setPairedDevices(scanners);

        // NOTE: We intentionally do NOT auto-reconnect here.
        // The browser remembers paired devices, but the scanner is not actually connected
        // until the user explicitly clicks "Reconnect" or "Connect Scanner".
        if (scanners.length > 0) {
          console.log(
            "Found remembered scanners (not yet connected):",
            scanners.map((s) => s.productName),
          );
        }
      } catch (err) {
        console.error("Error checking paired devices:", err);
      }
    };

    checkPairedDevices();

    // Listen for device connections/disconnections
    const handleConnect = (event: USBConnectionEvent) => {
      const device = event.device;
      const isKnownScanner = KNOWN_SCANNER_VENDORS.includes(device.vendorId) || device.deviceClass === 0x10;

      if (isKnownScanner) {
        // Update paired devices list only - NO auto-connect
        setPairedDevices((prev) => {
          const exists = prev.some((d) => d.serialNumber === device.serialNumber);
          return exists ? prev : [...prev, device];
        });

        // If currently connected device was reconnected (user already had it open)
        if (deviceRef.current?.serialNumber === device.serialNumber) {
          setConnectedDevice((prev) => (prev ? { ...prev, isConnected: true } : null));
          toast.success("Scanner reconnected");
        } else {
          // Just notify user - don't auto-connect
          toast.info(`Scanner detected: ${device.productName || "Unknown Scanner"}`, {
            description: 'Click "Connect" to use it.',
            duration: 3000,
          });
        }
      }
    };

    const handleDisconnect = (event: USBConnectionEvent) => {
      const device = event.device;

      // Update paired devices list
      setPairedDevices((prev) => prev.filter((d) => d.serialNumber !== device.serialNumber));

      if (deviceRef.current?.serialNumber === device.serialNumber) {
        setConnectedDevice((prev) => (prev ? { ...prev, isConnected: false } : null));
        toast.warning("Scanner disconnected", {
          description: "Reconnect the scanner to continue.",
        });
      }
    };

    navigator.usb!.addEventListener("connect", handleConnect);
    navigator.usb!.addEventListener("disconnect", handleDisconnect);

    return () => {
      navigator.usb!.removeEventListener("connect", handleConnect);
      navigator.usb!.removeEventListener("disconnect", handleDisconnect);
    };
  }, [isSupported, connectedDevice, connectToDevice]);

  const requestDevice = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("WebUSB is not supported in this browser. Please use Chrome or Edge.");
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
        reject(new Error("CONNECTION_TIMEOUT"));
      }, CONNECTION_TIMEOUT);
    });

    try {
      // Request a USB device with scanner-like characteristics
      const device = await navigator.usb!.requestDevice({
        filters: [
          // Known scanner vendors
          ...KNOWN_SCANNER_VENDORS.map((vendorId) => ({ vendorId })),
          // USB Image class (scanners)
          { classCode: 0x10 },
        ],
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!device) {
        throw new Error("No device selected");
      }

      if (connectionAborted) {
        throw new Error("CONNECTION_TIMEOUT");
      }

      console.log("Selected device:", device.productName, device.vendorId, device.productId);

      // If device is already open, try to close it first
      if (device.opened) {
        console.log("[WebUSB] Device already open, closing first...");
        try {
          await device.close();
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (closeErr) {
          console.log("[WebUSB] Error closing device (continuing):", closeErr);
        }
      }

      // Open the device with timeout
      const OPEN_TIMEOUT = 8000;
      const openWithTimeout = Promise.race([
        device.open(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("OPEN_TIMEOUT")), OPEN_TIMEOUT)),
      ]);

      await openWithTimeout;
      console.log("[WebUSB] Device opened successfully");

      // Select configuration if not already selected (with timeout)
      if (device.configuration === null && device.configurations.length > 0) {
        await Promise.race([
          device.selectConfiguration(device.configurations[0].configurationValue),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("CONFIG_TIMEOUT")), 5000)),
        ]);
        console.log("[WebUSB] Configuration selected");
      }

      // Try to claim an interface - try multiple if first fails
      let interfaceClaimed = false;
      if (device.configuration && device.configuration.interfaces.length > 0) {
        for (const iface of device.configuration.interfaces) {
          const interfaceNumber = iface.interfaceNumber;

          if (iface.claimed) {
            console.log(`[WebUSB] Interface ${interfaceNumber} already claimed`);
            interfaceClaimed = true;
            break;
          }

          try {
            console.log(`[WebUSB] Attempting to claim interface ${interfaceNumber}...`);
            await Promise.race([
              device.claimInterface(interfaceNumber),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error("CLAIM_TIMEOUT")), 5000)),
            ]);
            console.log(`[WebUSB] Successfully claimed interface ${interfaceNumber}`);
            interfaceClaimed = true;
            break;
          } catch (claimErr: any) {
            console.log(`[WebUSB] Failed to claim interface ${interfaceNumber}:`, claimErr.message);
          }
        }

        if (!interfaceClaimed) {
          console.log("[WebUSB] All interfaces failed, attempting device reset...");
          try {
            await device.reset();
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const interfaceNumber = device.configuration.interfaces[0].interfaceNumber;
            await device.claimInterface(interfaceNumber);
            interfaceClaimed = true;
            console.log("[WebUSB] Claimed interface after reset");
          } catch (resetErr) {
            console.log("[WebUSB] Reset failed:", resetErr);
          }
        }
      }

      if (!interfaceClaimed) {
        throw new Error("CLAIM_FAILED");
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
      console.error("Error connecting to scanner:", err);

      // Handle timeout errors specifically
      if (err.message === "CONNECTION_TIMEOUT" || err.message === "OPEN_TIMEOUT") {
        setError("Connection timed out. The scanner may be busy or unresponsive. Try power cycling it.");
        toast.error("Scanner connection timed out", {
          description: "Try unplugging and reconnecting the scanner.",
        });
      } else if (err.message === "CONFIG_TIMEOUT" || err.message === "CLAIM_TIMEOUT") {
        setError("Failed to configure scanner. It may be in use by another application.");
        toast.error("Scanner configuration failed", {
          description: "Close any other scanning software and try again.",
        });
      } else if (err.message === "CLAIM_FAILED") {
        setError(
          "Scanner is in use. Close other scanning apps (like Epson Scan), unplug the scanner for 5 seconds, then reconnect.",
        );
        toast.error("Scanner interface busy", {
          description: "Close all scanning apps, unplug scanner for 5 seconds, then replug.",
          duration: 7000,
        });
      } else if (err.name === "NotFoundError" || err.name === "AbortError") {
        // User cancelled the dialog or no device was selected - not an error
        setError(null);
      } else if (err.name === "SecurityError") {
        setError("Permission denied. Please allow access to the scanner.");
      } else if (err.message?.includes("Unable to claim interface") || err.message?.includes("LIBUSB_ERROR_BUSY")) {
        setError(
          "Scanner is being used by another application. Close Epson Scan or other scanning software and try again.",
        );
        toast.error("Scanner in use", {
          description: "Close Epson Scan, then unplug and replug the scanner.",
          duration: 6000,
        });
      } else if (err.name === "NetworkError") {
        setError("Connection lost. Check USB cable and try again.");
      } else {
        // Generic fallback with actionable message
        setError("Could not connect to scanner. Please check the connection and try again.");
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
        console.error("Error closing device:", err);
      }
      deviceRef.current = null;
    }
    setConnectedDevice(null);
    setCapabilities(null);
    toast.info("Scanner disconnected");
  }, []);

  const startScan = useCallback(async (): Promise<string[]> => {
    if (!deviceRef.current || !connectedDevice?.isConnected) {
      setError("Scanner not connected");
      return [];
    }

    setIsScanning(true);
    setError(null);
    scanAbortRef.current = false;

    try {
      const device = deviceRef.current;
      const images: string[] = [];

      console.log("[WebUSB Scanner] Starting scan with settings:", scanSettings);
      toast.info("Initializing scanner...", { duration: 2000 });

      // Find bulk endpoints for data transfer
      let inEndpoint: USBEndpoint | undefined;
      let outEndpoint: USBEndpoint | undefined;
      let claimedInterface: number | null = null;

      if (device.configuration) {
        for (const iface of device.configuration.interfaces) {
          for (const alt of iface.alternates) {
            for (const endpoint of alt.endpoints) {
              if (endpoint.direction === "in" && endpoint.type === "bulk") {
                inEndpoint = endpoint;
                claimedInterface = iface.interfaceNumber;
              } else if (endpoint.direction === "out" && endpoint.type === "bulk") {
                outEndpoint = endpoint;
              }
            }
          }
          // Once we find endpoints, break
          if (inEndpoint) break;
        }
      }

      console.log("[WebUSB Scanner] Endpoints found:", {
        inEndpoint: inEndpoint?.endpointNumber,
        outEndpoint: outEndpoint?.endpointNumber,
        claimedInterface,
      });

      if (!inEndpoint) {
        // Try control transfer approach for scanners without bulk endpoints
        console.log("[WebUSB Scanner] No bulk endpoints, trying control transfer method...");

        try {
          // Try USB Still Image Capture protocol
          const statusResult = await device.controlTransferIn(
            {
              requestType: "class",
              recipient: "interface",
              request: 0x01, // GET_STATUS
              value: 0x00,
              index: 0,
            },
            64,
          );

          console.log("[WebUSB Scanner] Control transfer result:", statusResult);

          if (statusResult.status === "ok" && statusResult.data) {
            // Scanner responded - attempt to initiate scan
            await device.controlTransferOut(
              {
                requestType: "class",
                recipient: "interface",
                request: 0x02, // INITIATE_SCAN
                value: 0x00,
                index: 0,
              },
              SCANNER_COMMANDS.ESC_SCAN,
            );

            // Wait for scan to complete
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Try to read result
            const dataResult = await device.controlTransferIn(
              {
                requestType: "class",
                recipient: "interface",
                request: 0x03, // GET_DATA
                value: 0x00,
                index: 0,
              },
              65536,
            );

            if (dataResult.status === "ok" && dataResult.data && dataResult.data.byteLength > 0) {
              const rawData = new Uint8Array(dataResult.data.buffer);
              const imageFormat = detectImageFormat(rawData);

              if (imageFormat) {
                const blob = new Blob([rawData.buffer as ArrayBuffer], { type: imageFormat });
                const imageUrl = URL.createObjectURL(blob);
                images.push(imageUrl);
              }
            }
          }
        } catch (controlErr) {
          console.log("[WebUSB Scanner] Control transfer method failed:", controlErr);
        }

        if (images.length === 0) {
          toast.warning("This scanner requires native driver support", {
            description: 'Use "Import Scans" or "Watch Folder" for best results with this device.',
            duration: 5000,
          });
          setScannedImages([]);
          return [];
        }
      } else {
        // Use bulk transfer method (preferred for most scanners)
        console.log("[WebUSB Scanner] Using bulk transfer method");

        try {
          // Build and send scan commands
          const commands = buildScanCommand(scanSettings, device.vendorId);

          if (outEndpoint) {
            for (const cmd of commands) {
              console.log(
                "[WebUSB Scanner] Sending command:",
                Array.from(cmd)
                  .map((b) => b.toString(16))
                  .join(" "),
              );
              try {
                await device.transferOut(outEndpoint.endpointNumber, cmd.buffer as ArrayBuffer);
                // Small delay between commands
                await new Promise((resolve) => setTimeout(resolve, 50));
              } catch (cmdErr) {
                console.log("[WebUSB Scanner] Command send failed (continuing):", cmdErr);
              }
            }
          } else {
            // No output endpoint - send via control transfer
            console.log("[WebUSB Scanner] No output endpoint, sending scan via control transfer");
            await device.controlTransferOut(
              {
                requestType: "vendor",
                recipient: "device",
                request: 0x01,
                value: 0x00,
                index: 0,
              },
              SCANNER_COMMANDS.ESC_SCAN,
            );
          }

          toast.info("Scanning in progress...", { duration: 3000 });

          // Wait for scanner to process (scanning typically takes 3-15 seconds)
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Read scan data in chunks
          const chunks: Uint8Array[] = [];
          let totalBytes = 0;
          const maxBytes = 100 * 1024 * 1024; // 100MB max for high-res scans
          const readTimeout = 30000; // 30 second timeout
          const startTime = Date.now();
          let consecutiveEmptyReads = 0;
          const maxEmptyReads = 10;

          console.log("[WebUSB Scanner] Starting data read from endpoint:", inEndpoint.endpointNumber);

          while (!scanAbortRef.current && totalBytes < maxBytes) {
            // Check timeout
            if (Date.now() - startTime > readTimeout) {
              console.log("[WebUSB Scanner] Read timeout reached");
              break;
            }

            try {
              const result = await Promise.race([
                device.transferIn(inEndpoint.endpointNumber, inEndpoint.packetSize || 65536),
                new Promise<USBInTransferResult>((_, reject) =>
                  setTimeout(() => reject(new Error("READ_TIMEOUT")), 5000),
                ),
              ]);

              if (result.status === "ok" && result.data && result.data.byteLength > 0) {
                const chunk = new Uint8Array(result.data.buffer);
                chunks.push(chunk);
                totalBytes += result.data.byteLength;
                consecutiveEmptyReads = 0;

                // Log progress every 100KB
                if (totalBytes % 102400 < result.data.byteLength) {
                  console.log(`[WebUSB Scanner] Read ${(totalBytes / 1024).toFixed(1)} KB`);
                }
              } else if (result.status === "stall") {
                // End of data signaled
                console.log("[WebUSB Scanner] Stall received - end of data");
                await device.clearHalt("in", inEndpoint.endpointNumber);
                break;
              } else {
                consecutiveEmptyReads++;
                if (consecutiveEmptyReads >= maxEmptyReads) {
                  console.log("[WebUSB Scanner] Too many empty reads - assuming end of data");
                  break;
                }
              }
            } catch (readErr: any) {
              if (readErr.message === "READ_TIMEOUT") {
                console.log("[WebUSB Scanner] Single read timeout - checking if more data");
                consecutiveEmptyReads++;
                if (consecutiveEmptyReads >= 3) break;
              } else {
                console.error("[WebUSB Scanner] Read error:", readErr);
                break;
              }
            }
          }

          console.log(`[WebUSB Scanner] Total data read: ${totalBytes} bytes in ${chunks.length} chunks`);

          if (chunks.length > 0 && totalBytes > 0) {
            // Combine chunks into single buffer
            const fullData = new Uint8Array(totalBytes);
            let offset = 0;
            for (const chunk of chunks) {
              fullData.set(chunk, offset);
              offset += chunk.length;
            }

            // Detect image format
            let imageFormat = detectImageFormat(fullData);
            let imageData: Uint8Array | null = fullData;

            if (!imageFormat) {
              // Try to find embedded JPEG
              console.log("[WebUSB Scanner] Unknown format, searching for embedded JPEG...");
              const jpegData = findJPEGInData(fullData);
              if (jpegData) {
                imageFormat = "image/jpeg";
                imageData = jpegData;
                console.log("[WebUSB Scanner] Found embedded JPEG:", jpegData.length, "bytes");
              } else {
                // Assume raw RGB and try to convert (letter size at 300 DPI)
                // 8.5 x 11 inches at 300 DPI = 2550 x 3300 pixels
                // Color: 2550 * 3300 * 3 = 25,245,000 bytes
                // Grayscale: 2550 * 3300 = 8,415,000 bytes

                console.log("[WebUSB Scanner] Attempting raw data conversion...");
                const expectedColorSize = 2550 * 3300 * 3;
                const expectedGraySize = 2550 * 3300;

                if (totalBytes >= expectedColorSize * 0.8) {
                  // Likely raw RGB color data
                  const dataUrl = rawRGBToDataURL(fullData, 2550, Math.floor(totalBytes / (2550 * 3)));
                  if (dataUrl) {
                    images.push(dataUrl);
                    imageData = null; // Already processed
                  }
                } else if (totalBytes >= expectedGraySize * 0.8) {
                  // Likely grayscale data - convert to RGB
                  const rgbData = new Uint8Array(totalBytes * 3);
                  for (let i = 0; i < totalBytes; i++) {
                    rgbData[i * 3] = fullData[i];
                    rgbData[i * 3 + 1] = fullData[i];
                    rgbData[i * 3 + 2] = fullData[i];
                  }
                  const dataUrl = rawRGBToDataURL(rgbData, 2550, Math.floor(totalBytes / 2550));
                  if (dataUrl) {
                    images.push(dataUrl);
                    imageData = null;
                  }
                } else {
                  // Data too small or unknown format
                  console.log("[WebUSB Scanner] Cannot interpret scan data - unknown format");
                  imageData = null;
                }
              }
            }

            if (imageFormat && imageData) {
              const blob = new Blob([imageData.buffer as ArrayBuffer], { type: imageFormat });
              const imageUrl = URL.createObjectURL(blob);
              images.push(imageUrl);
              console.log("[WebUSB Scanner] Image created:", imageFormat, imageData.length, "bytes");
            }
          }
        } catch (transferErr: any) {
          console.error("[WebUSB Scanner] Transfer error:", transferErr);

          if (transferErr.message?.includes("LIBUSB")) {
            toast.error("USB communication error", {
              description: "Try disconnecting and reconnecting the scanner.",
            });
          } else {
            toast.error("Failed to read scan data", {
              description: "Scanner may require specific driver support.",
            });
          }
        }
      }

      setScannedImages((prev) => [...prev, ...images]);

      if (images.length > 0) {
        toast.success(`Successfully scanned ${images.length} page(s)!`);
      } else {
        toast.warning("No image data received from scanner", {
          description: 'Try using "Import Scans" to upload scanned files.',
        });
      }

      return images;
    } catch (err: any) {
      console.error("[WebUSB Scanner] Scan error:", err);
      setError(err.message || "Scan failed");
      toast.error("Scan failed: " + (err.message || "Unknown error"));
      return [];
    } finally {
      setIsScanning(false);
    }
  }, [connectedDevice, scanSettings]);

  const cancelScan = useCallback(() => {
    scanAbortRef.current = true;
    setIsScanning(false);
    toast.info("Scan cancelled");
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ScanSettings>) => {
    setScanSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const clearImages = useCallback(() => {
    // Revoke object URLs to free memory
    scannedImages.forEach((url) => {
      if (url.startsWith("blob:")) {
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
              if (endpoint.type === "bulk") {
                hasBulkEndpoints = true;
                if (endpoint.direction === "in") {
                  hasInputEndpoint = true;
                } else if (endpoint.direction === "out") {
                  hasOutputEndpoint = true;
                }
              }
            }
          }
        }
      }

      // Generate warnings
      if (!hasImageClass) {
        warnings.push("Scanner may not support USB Image Class protocol");
      }
      if (!hasBulkEndpoints) {
        warnings.push("No bulk data transfer endpoints detected");
      }
      if (!hasInputEndpoint) {
        warnings.push("No data input endpoint found - cannot receive scanned images");
      }
      if (!hasOutputEndpoint) {
        warnings.push("No command output endpoint found - may not be able to control scanner");
      }
      if (interfaceCount === 0) {
        warnings.push("No USB interfaces detected on device");
      }

      // Build details string
      const details = [
        `Device: ${device.productName || "Unknown"}`,
        `Vendor: ${device.manufacturerName || device.vendorId.toString(16).toUpperCase()}`,
        `Interfaces: ${interfaceCount}`,
        `Endpoints: ${endpointCount}`,
        `Image Class: ${hasImageClass ? "Yes" : "No"}`,
        `Bulk Transfer: ${hasBulkEndpoints ? "Available" : "Not Available"}`,
      ].join(" | ");

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
        toast.warning("Scanner may have limited compatibility", {
          description: "Some features may not work. Consider using file import.",
        });
      } else if (warnings.length > 0) {
        toast.info("Scanner connected with warnings", {
          description: warnings[0],
        });
      } else {
        toast.success("Scanner fully compatible!");
      }

      return result;
    } catch (err) {
      console.error("Compatibility check error:", err);
      return null;
    } finally {
      setIsCheckingCompatibility(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
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
    clearError,
    checkCompatibility,
    reconnectToDevice,
  };
}
