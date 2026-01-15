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
      const timeoutMs = 5000; // 5 second max for thorough scanning
      
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
            
            // Calculate region sizes based on image dimensions
            const cornerSize = Math.max(150, Math.min(400, Math.floor(img.width / 3)));
            const edgeWidth = Math.max(100, Math.min(300, Math.floor(img.width / 4)));
            
            // Try scanning different regions of the image - QR codes can be anywhere
            // Order matters: most common locations first
            const regions = [
              // Top-left corner (most common for student QR)
              { x: 0, y: 0, w: cornerSize, h: cornerSize },
              // Top-right corner
              { x: Math.max(0, img.width - cornerSize), y: 0, w: cornerSize, h: cornerSize },
              // Bottom-right corner (diagnostic worksheet QR location)
              { x: Math.max(0, img.width - cornerSize), y: Math.max(0, img.height - cornerSize), w: cornerSize, h: cornerSize },
              // Bottom-left corner
              { x: 0, y: Math.max(0, img.height - cornerSize), w: cornerSize, h: cornerSize },
              // Top edge full width (name/header area)
              { x: 0, y: 0, w: img.width, h: Math.min(200, img.height / 4) },
              // Right edge (for diagnostic worksheets)
              { x: Math.max(0, img.width - edgeWidth), y: 0, w: edgeWidth, h: img.height },
              // Left edge (for worksheet question QRs)
              { x: 0, y: 0, w: edgeWidth, h: img.height },
              // Bottom edge
              { x: 0, y: Math.max(0, img.height - 200), w: img.width, h: Math.min(200, img.height / 4) },
              // Center region (sometimes QR is in middle)
              { x: Math.floor(img.width / 4), y: Math.floor(img.height / 4), w: Math.floor(img.width / 2), h: Math.floor(img.height / 2) },
              // Full image (fallback - scan everything)
              { x: 0, y: 0, w: img.width, h: img.height },
            ];

            for (const region of regions) {
              try {
                const imageData = ctx.getImageData(region.x, region.y, region.w, region.h);
                const code = jsQR(imageData.data, region.w, region.h, {
                  inversionAttempts: 'attemptBoth', // Try both normal and inverted
                });
                
                if (code && code.data) {
                  console.log('QR code found in region:', region, 'Content:', code.data);
                  
                  // Try the new unified parser first (handles both v1 and v2)
                  const parsed = parseAnyStudentQRCode(code.data);
                  if (parsed) {
                    console.log('Successfully parsed QR code:', parsed);
                    resolve(parsed);
                    return;
                  }
                  
                  // Fallback to legacy parser for old v1 codes
                  const legacyParsed = parseStudentQRCode(code.data);
                  if (legacyParsed) {
                    console.log('Successfully parsed legacy QR code:', legacyParsed);
                    resolve({
                      ...legacyParsed,
                      type: 'student-question',
                    });
                    return;
                  }
                  
                  console.log('QR code found but could not parse as student QR:', code.data);
                }
              } catch (regionError) {
                console.error('Error scanning region:', region, regionError);
              }
            }

            console.log('No valid student QR code found in image');
            resolve(null);
          };

          img.onerror = () => {
            console.error('Failed to load image for QR scanning');
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
