import { useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { parseStudentQRCode } from '@/components/print/StudentQRCode';
import { parseAnyStudentQRCode } from '@/components/print/StudentOnlyQRCode';

interface QRScanResult {
  studentId: string;
  questionId?: string;
  type: 'student-only' | 'student-question';
}

// Legacy result type for backward compatibility
interface LegacyQRScanResult {
  studentId: string;
  questionId: string;
}

export function useQRCodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);

  /**
   * Scans an image for any type of student QR code (student-only or student+question)
   */
  const scanImageForQR = useCallback(async (imageDataUrl: string): Promise<QRScanResult | null> => {
    setIsScanning(true);
    setScanResult(null);

    try {
      const img = new Image();
      
      // Add a timeout to prevent blocking the UI - QR scan should be fast
      const timeoutMs = 3000; // 3 second max
      
      const result = await Promise.race([
        new Promise<QRScanResult | null>((resolve) => {
          img.onload = () => {
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
              // Top-left corner (where student QR typically is)
              { x: 0, y: 0, w: Math.min(300, img.width / 3), h: Math.min(300, img.height / 3) },
              // Top-right corner
              { x: Math.max(0, img.width - 300), y: 0, w: Math.min(300, img.width / 3), h: Math.min(300, img.height / 3) },
              // Bottom-left corner
              { x: 0, y: Math.max(0, img.height - 300), w: Math.min(300, img.width / 3), h: Math.min(300, img.height / 3) },
              // Left edge (for worksheet question QRs)
              { x: 0, y: 0, w: Math.min(150, img.width / 4), h: img.height },
              // Full image (fallback)
              { x: 0, y: 0, w: img.width, h: img.height },
            ];

            for (const region of regions) {
              const imageData = ctx.getImageData(region.x, region.y, region.w, region.h);
              const code = jsQR(imageData.data, region.w, region.h);
              
              if (code) {
                // Try the new unified parser first (handles both v1 and v2)
                const parsed = parseAnyStudentQRCode(code.data);
                if (parsed) {
                  resolve(parsed);
                  return;
                }
                
                // Fallback to legacy parser for old v1 codes
                const legacyParsed = parseStudentQRCode(code.data);
                if (legacyParsed) {
                  resolve({
                    ...legacyParsed,
                    type: 'student-question',
                  });
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
        }),
        // Timeout promise - return null after timeout (no QR found quickly)
        new Promise<null>((resolve) => {
          setTimeout(() => {
            console.log('QR scan timed out - proceeding without QR');
            resolve(null);
          }, timeoutMs);
        }),
      ]);

      setScanResult(result);
      return result;
    } catch (error) {
      console.error('QR scan error:', error);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  /**
   * Legacy method for backward compatibility - only returns results with questionId
   */
  const scanImageForStudentQuestionQR = useCallback(async (imageDataUrl: string): Promise<LegacyQRScanResult | null> => {
    const result = await scanImageForQR(imageDataUrl);
    if (result && result.type === 'student-question' && result.questionId) {
      return {
        studentId: result.studentId,
        questionId: result.questionId,
      };
    }
    return null;
  }, [scanImageForQR]);

  const clearResult = useCallback(() => {
    setScanResult(null);
  }, []);

  return {
    scanImageForQR,
    scanImageForStudentQuestionQR,
    isScanning,
    scanResult,
    clearResult,
  };
}
