import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Usb, 
  ScanLine, 
  Unplug, 
  Settings2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  FileImage,
  Trash2,
  RefreshCw,
  Download,
  Monitor,
  HelpCircle,
  ChevronDown,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { useWebUSBScanner } from '@/hooks/useWebUSBScanner';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface WebUSBScannerPanelProps {
  onImagesScanned?: (images: string[]) => void;
  className?: string;
}

export function WebUSBScannerPanel({ onImagesScanned, className }: WebUSBScannerPanelProps) {
  const {
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
  } = useWebUSBScanner();

  const [showSettings, setShowSettings] = useState(false);

  // Run compatibility check when device connects
  useEffect(() => {
    if (connectedDevice?.isConnected && !compatibility) {
      checkCompatibility();
    }
  }, [connectedDevice, compatibility, checkCompatibility]);

  const handleScan = async () => {
    const images = await startScan();
    if (images.length > 0 && onImagesScanned) {
      onImagesScanned(images);
    }
  };

  const handleUseImages = () => {
    if (scannedImages.length > 0 && onImagesScanned) {
      onImagesScanned(scannedImages);
      clearImages();
    }
  };

  if (!isSupported) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            WebUSB Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not Supported</AlertTitle>
            <AlertDescription>
              WebUSB is not supported in this browser. Please use Chrome or Microsoft Edge 
              to access direct scanner control.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Usb className="h-5 w-5" />
              WebUSB Scanner
            </CardTitle>
            <CardDescription>
              Connect directly to your scanner via USB
            </CardDescription>
          </div>
          {connectedDevice && (
            <Badge variant={connectedDevice.isConnected ? "default" : "secondary"}>
              {connectedDevice.isConnected ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
              ) : (
                <><AlertCircle className="h-3 w-3 mr-1" /> Disconnected</>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <div className="flex gap-2 ml-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={requestDevice}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearError}
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!connectedDevice ? (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            {/* Auto-reconnecting indicator */}
            {isAutoReconnecting && (
              <Alert className="mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription className="ml-2">
                  Auto-reconnecting to previously paired scanner...
                </AlertDescription>
              </Alert>
            )}

            <div className="p-4 rounded-full bg-muted">
              <Usb className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Connect your USB scanner to scan documents directly from your browser.
                <br />
                <span className="text-xs">Works best with scanners that support USB Image Class</span>
              </p>

              {/* Previously remembered devices (browser remembers USB permissions, not actual connection) */}
              {pairedDevices.length > 0 && !isAutoReconnecting && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs font-medium mb-1 flex items-center justify-center gap-1 text-amber-700 dark:text-amber-400">
                    <Usb className="h-3 w-3" />
                    Remembered Scanners
                  </p>
                  <p className="text-xs text-muted-foreground mb-2 text-center">
                    Click to connect (browser remembers permission, not connection)
                  </p>
                  <div className="space-y-2">
                    {pairedDevices.map((device, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-background">
                        <span className="text-xs truncate">
                          {device.productName || `Scanner ${device.vendorId.toString(16).toUpperCase()}`}
                        </span>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => reconnectToDevice(device)}
                          disabled={isConnecting}
                          className="text-xs h-7"
                        >
                          {isConnecting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Usb className="h-3 w-3 mr-1" />
                              Connect
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 items-center">
                <Button onClick={requestDevice} disabled={isConnecting || isAutoReconnecting}>
                  {isConnecting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                  ) : (
                    <><Usb className="h-4 w-4 mr-2" /> Connect Scanner</>
                  )}
                </Button>
                
                {/* Troubleshooting Tips */}
                <Collapsible className="w-full max-w-md mt-4">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      <HelpCircle className="h-3 w-3 mr-1" />
                      Having trouble connecting?
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="p-3 rounded-lg bg-muted/50 border text-left space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-1">
                        <HelpCircle className="h-4 w-4" /> Troubleshooting Tips
                      </h4>
                      <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                        <li><strong>Close other apps</strong> using the scanner (scanning software, printer utilities)</li>
                        <li><strong>Unplug and replug</strong> the USB cable, then try again</li>
                        <li><strong>Try a different USB port</strong> - use a direct port, not a hub</li>
                        <li><strong>Power cycle</strong> the scanner (turn off/on or unplug power)</li>
                        <li><strong>Check cable</strong> - use the original cable if possible</li>
                        <li><strong>Allow permission</strong> when the browser prompts for USB access</li>
                        <li><strong>Use Chrome or Edge</strong> - other browsers don't support WebUSB</li>
                      </ul>
                      <div className="pt-2 border-t mt-2">
                        <p className="text-xs text-muted-foreground">
                          <strong>Note:</strong> Not all scanners support WebUSB. If your scanner doesn't appear, 
                          try using the file import or camera options instead.
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Connected Device Info */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-background">
                  <ScanLine className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{connectedDevice.name}</p>
                  <p className="text-xs text-muted-foreground">
                    VID: {connectedDevice.vendorId.toString(16).toUpperCase()} | 
                    PID: {connectedDevice.productId.toString(16).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={disconnect}
                >
                  <Unplug className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Compatibility Check Results */}
            {(isCheckingCompatibility || compatibility) && (
              <div className={cn(
                "p-3 rounded-lg border",
                compatibility?.isCompatible 
                  ? "bg-green-500/10 border-green-500/30" 
                  : compatibility?.warnings?.length 
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-muted"
              )}>
                <div className="flex items-start gap-3">
                  {isCheckingCompatibility ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Checking scanner compatibility...</p>
                        <p className="text-xs text-muted-foreground">Analyzing device features</p>
                      </div>
                    </>
                  ) : compatibility?.isCompatible ? (
                    <>
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-green-700 dark:text-green-400">
                          Scanner Compatible
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {compatibility.details}
                        </p>
                        {compatibility.warnings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {compatibility.warnings.map((warning, i) => (
                              <p key={i} className="text-xs text-yellow-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> {warning}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-5 w-5 text-yellow-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-yellow-700 dark:text-yellow-400">
                          Limited Compatibility
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {compatibility?.details}
                        </p>
                        {compatibility?.warnings && compatibility.warnings.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {compatibility.warnings.map((warning, i) => (
                              <li key={i} className="text-xs text-yellow-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 flex-shrink-0" /> {warning}
                              </li>
                            ))}
                          </ul>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={checkCompatibility}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Recheck
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Scan Settings */}
            {showSettings && capabilities && (
              <div className="p-4 rounded-lg border space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4" /> Scan Settings
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="colorMode">Color Mode</Label>
                    <Select 
                      value={scanSettings.colorMode}
                      onValueChange={(value) => updateSettings({ colorMode: value as any })}
                    >
                      <SelectTrigger id="colorMode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="color">Color</SelectItem>
                        <SelectItem value="grayscale">Grayscale</SelectItem>
                        <SelectItem value="blackwhite">Black & White</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resolution">Resolution (DPI)</Label>
                    <Select 
                      value={scanSettings.resolution.toString()}
                      onValueChange={(value) => updateSettings({ resolution: parseInt(value) })}
                    >
                      <SelectTrigger id="resolution">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {capabilities.resolutions.map(res => (
                          <SelectItem key={res} value={res.toString()}>{res} DPI</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paperSize">Paper Size</Label>
                    <Select 
                      value={scanSettings.paperSize}
                      onValueChange={(value) => updateSettings({ paperSize: value as any })}
                    >
                      <SelectTrigger id="paperSize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="letter">Letter (8.5" x 11")</SelectItem>
                        <SelectItem value="legal">Legal (8.5" x 14")</SelectItem>
                        <SelectItem value="a4">A4 (210 x 297mm)</SelectItem>
                        <SelectItem value="auto">Auto Detect</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="duplex">Duplex (Both Sides)</Label>
                      <Switch
                        id="duplex"
                        checked={scanSettings.duplex}
                        onCheckedChange={(checked) => updateSettings({ duplex: checked })}
                        disabled={!capabilities.hasDuplex}
                      />
                    </div>
                    {!capabilities.hasDuplex && (
                      <p className="text-xs text-muted-foreground">Not supported by this scanner</p>
                    )}
                  </div>
                </div>

                {capabilities.hasFeeder && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <Label htmlFor="feeder">Use Document Feeder</Label>
                      <p className="text-xs text-muted-foreground">Automatically feed multiple pages</p>
                    </div>
                    <Switch
                      id="feeder"
                      checked={scanSettings.useFeeder}
                      onCheckedChange={(checked) => updateSettings({ useFeeder: checked })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Scan Button */}
            <div className="flex gap-2">
              {isScanning ? (
                <>
                  <Button variant="destructive" onClick={cancelScan} className="flex-1">
                    Cancel Scan
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning...
                  </div>
                </>
              ) : (
                <Button 
                  onClick={handleScan} 
                  className="flex-1"
                  disabled={!connectedDevice.isConnected}
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Start Scan
                </Button>
              )}
            </div>

            {/* Scanned Images Preview */}
            {scannedImages.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    Scanned Pages ({scannedImages.length})
                  </h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearImages}>
                      <Trash2 className="h-3 w-3 mr-1" /> Clear
                    </Button>
                    <Button size="sm" onClick={handleUseImages}>
                      <Download className="h-3 w-3 mr-1" /> Use Pages
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="h-32">
                  <div className="flex gap-2 p-1">
                    {scannedImages.map((img, idx) => (
                      <div 
                        key={idx}
                        className="relative flex-shrink-0 w-24 h-28 rounded border overflow-hidden bg-muted"
                      >
                        <img 
                          src={img} 
                          alt={`Page ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                          Page {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Help Info */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Note:</strong> Direct USB scanner control works best with scanners that support 
                the USB Image Class standard. Some scanners may require their manufacturer's software 
                for full functionality. If scanning fails, try using the file import option instead.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
