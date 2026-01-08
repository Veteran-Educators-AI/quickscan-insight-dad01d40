import { useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { parseStudentQRCode } from '@/components/print/StudentQRCode';

interface QRScanResult {
  studentId: string;
  questionId: string;
}

export function useQRCodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);

  const scanImageForQR = useCallback(async (imageDataUrl: string): Promise<QRScanResult | null> => {
    setIsScanning(true);
    setScanResult(null);

    try {
      // Create an image element to load the data URL
      const img = new Image();
      
      const result = await new Promise<QRScanResult | null>((resolve) => {
        img.onload = () => {
          // Create a canvas to get image data
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0);
          
          // Try scanning different regions of the image
          // QR codes are typically in corners or along edges
          const regions = [
            // Top-left corner
            { x: 0, y: 0, w: Math.min(300, img.width / 3), h: Math.min(300, img.height / 3) },
            // Top-right corner
            { x: Math.max(0, img.width - 300), y: 0, w: Math.min(300, img.width / 3), h: Math.min(300, img.height / 3) },
            // Bottom-left corner
            { x: 0, y: Math.max(0, img.height - 300), w: Math.min(300, img.width / 3), h: Math.min(300, img.height / 3) },
            // Full image (fallback)
            { x: 0, y: 0, w: img.width, h: img.height },
          ];

          for (const region of regions) {
            const imageData = ctx.getImageData(region.x, region.y, region.w, region.h);
            const code = jsQR(imageData.data, region.w, region.h);
            
            if (code) {
              const parsed = parseStudentQRCode(code.data);
              if (parsed) {
                resolve(parsed);
                return;
              }
            }
          }

          resolve(null);
        };

        img.onerror = () => {
          resolve(null);
        };

        img.src = imageDataUrl;
      });

      setScanResult(result);
      return result;
    } catch (error) {
      console.error('QR scan error:', error);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setScanResult(null);
  }, []);

  return {
    scanImageForQR,
    isScanning,
    scanResult,
    clearResult,
  };
}
