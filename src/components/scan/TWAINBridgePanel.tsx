import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Monitor,
  ScanLine, 
  Settings2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  FileImage,
  Trash2,
  RefreshCw,
  Download,
  Wifi,
  WifiOff,
  ExternalLink,
  Copy,
  Info
} from 'lucide-react';
import { useTWAINBridge, TWAINScanner } from '@/hooks/useTWAINBridge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TWAINBridgePanelProps {
  onImagesScanned?: (images: string[]) => void;
  className?: string;
}

export function TWAINBridgePanel({ onImagesScanned, className }: TWAINBridgePanelProps) {
  const {
    isConnected,
    isConnecting,
    bridgeVersion,
    error,
    availableScanners,
    selectedScanner,
    selectScanner,
    refreshScanners,
    scanSettings,
    updateSettings,
    isScanning,
    scanProgress,
    scannedImages,
    startScan,
    cancelScan,
    clearImages,
    connect,
    disconnect,
  } = useTWAINBridge();

  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'connect' | 'scan'>('connect');

  useEffect(() => {
    if (isConnected) {
      setActiveTab('scan');
    }
  }, [isConnected]);

  const handleScan = async () => {
    const images = await startScan();
    if (images.length > 0 && onImagesScanned) {
      onImagesScanned(images);
      toast.success(`Scanned ${images.length} page(s)`);
    }
  };

  const handleUseImages = () => {
    if (scannedImages.length > 0 && onImagesScanned) {
      onImagesScanned(scannedImages);
      clearImages();
      toast.success('Images added to queue');
    }
  };

  const downloadCompanionApp = () => {
    // Link to companion app download (placeholder)
    toast.info('Companion app download coming soon! For now, you can use the file import option.');
  };

  const copyConnectionCommand = () => {
    navigator.clipboard.writeText('npx scangenius-bridge');
    toast.success('Command copied to clipboard');
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Scanner Bridge
            </CardTitle>
            <CardDescription>
              Connect to any TWAIN/WIA/SANE scanner via companion app
            </CardDescription>
          </div>
          {isConnected && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
              {bridgeVersion && <span className="ml-1 opacity-70">v{bridgeVersion}</span>}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'connect' | 'scan')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connect" className="flex items-center gap-2">
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              Connection
            </TabsTrigger>
            <TabsTrigger value="scan" disabled={!isConnected} className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" />
              Scan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-4 mt-4">
            {!isConnected ? (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Companion App Required</AlertTitle>
                  <AlertDescription className="space-y-3 mt-2">
                    <p>
                      To scan directly from your computer's scanner, you need to run our 
                      lightweight companion app. It bridges your scanner to this web app.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={downloadCompanionApp} className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download App
                      </Button>
                      <Button variant="outline" onClick={copyConnectionCommand} className="flex-1">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy NPX Command
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col items-center justify-center py-6 gap-4">
                  <div className="p-4 rounded-full bg-muted">
                    <WifiOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Once the companion app is running, click connect to link your scanners.
                    </p>
                    <Button onClick={() => connect()} disabled={isConnecting}>
                      {isConnecting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                      ) : (
                        <><Wifi className="h-4 w-4 mr-2" /> Connect to Bridge</>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-2">Supported Scanner Types:</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">TWAIN</Badge>
                      Windows
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">WIA</Badge>
                      Windows
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">SANE</Badge>
                      Linux/Mac
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-green-500/20">
                      <Wifi className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Bridge Connected</p>
                      <p className="text-xs text-muted-foreground">
                        {availableScanners.length} scanner(s) available
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={disconnect}>
                    Disconnect
                  </Button>
                </div>

                <Button variant="outline" onClick={refreshScanners} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Scanner List
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scan" className="space-y-4 mt-4">
            {/* Scanner Selection */}
            <div className="space-y-2">
              <Label>Select Scanner</Label>
              <Select 
                value={selectedScanner?.id || ''} 
                onValueChange={(id) => {
                  const scanner = availableScanners.find(s => s.id === id);
                  if (scanner) selectScanner(scanner);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a scanner" />
                </SelectTrigger>
                <SelectContent>
                  {availableScanners.map((scanner) => (
                    <SelectItem key={scanner.id} value={scanner.id}>
                      <div className="flex items-center gap-2">
                        <ScanLine className="h-4 w-4" />
                        <span>{scanner.name}</span>
                        {scanner.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                        <Badge variant="outline" className="text-xs uppercase">
                          {scanner.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scanner Settings */}
            {selectedScanner && (
              <>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Scan Settings
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {scanSettings.resolution}DPI • {scanSettings.colorMode}
                  </span>
                </Button>

                {showSettings && (
                  <div className="p-4 rounded-lg border space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Color Mode</Label>
                        <Select 
                          value={scanSettings.colorMode}
                          onValueChange={(value) => updateSettings({ colorMode: value as any })}
                        >
                          <SelectTrigger>
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
                        <Label>Resolution (DPI)</Label>
                        <Select 
                          value={scanSettings.resolution.toString()}
                          onValueChange={(value) => updateSettings({ resolution: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="150">150 DPI (Fast)</SelectItem>
                            <SelectItem value="300">300 DPI (Standard)</SelectItem>
                            <SelectItem value="600">600 DPI (High Quality)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Paper Size</Label>
                        <Select 
                          value={scanSettings.paperSize}
                          onValueChange={(value) => updateSettings({ paperSize: value as any })}
                        >
                          <SelectTrigger>
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
                          <Label>Duplex (Both Sides)</Label>
                          <Switch
                            checked={scanSettings.duplex}
                            onCheckedChange={(checked) => updateSettings({ duplex: checked })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Use Document Feeder</Label>
                        <Switch
                          checked={scanSettings.useFeeder}
                          onCheckedChange={(checked) => updateSettings({ useFeeder: checked })}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Automatically feed multiple pages from the ADF
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label className="text-xs">Brightness: {scanSettings.brightness}</Label>
                        <Slider
                          value={[scanSettings.brightness]}
                          onValueChange={([value]) => updateSettings({ brightness: value })}
                          min={-100}
                          max={100}
                          step={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Contrast: {scanSettings.contrast}</Label>
                        <Slider
                          value={[scanSettings.contrast]}
                          onValueChange={([value]) => updateSettings({ contrast: value })}
                          min={-100}
                          max={100}
                          step={5}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Scan Button */}
                <div className="space-y-2">
                  {isScanning ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scanning... {scanProgress > 0 && `${scanProgress}%`}
                      </div>
                      <Progress value={scanProgress} className="h-2" />
                      <Button variant="destructive" onClick={cancelScan} className="w-full">
                        Cancel Scan
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleScan} className="w-full" size="lg">
                      <ScanLine className="h-5 w-5 mr-2" />
                      Start Scan
                    </Button>
                  )}
                </div>

                {/* Scanned Images Preview */}
                {scannedImages.length > 0 && (
                  <div className="space-y-3 pt-2 border-t">
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
              </>
            )}

            {!selectedScanner && availableScanners.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No scanners detected. Make sure your scanner is connected and turned on, 
                  then click "Refresh Scanner List" on the Connection tab.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
