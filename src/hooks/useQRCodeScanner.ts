import { useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { parseStudentQRCode } from '@/components/print/StudentQRCode';
import { parseAnyStudentQRCode } from '@/components/print/StudentOnlyQRCode';
import { parseUnifiedStudentQRCode } from '@/components/print/StudentPageQRCode';

interface QRScanResult {
  studentId: string;
  questionId?: string;
  pageNumber?: number;
  totalPages?: number;
  worksheetId?: string;
  type: 'student-only' | 'student-question' | 'student-page' | 'worksheet';
}

// Legacy result type for backward compatibility
interface LegacyQRScanResult {
  studentId: string;
  questionId: string;
}

/**
 * Parse worksheet QR code format
 */
function parseWorksheetQRCode(qrValue: string): { worksheetId: string } | null {
  try {
    const data = JSON.parse(qrValue);
    if (data.v === 1 && data.type === 'worksheet' && data.w) {
      return { worksheetId: data.w };
    }
    return null;
  } catch {
    return null;
  }
}

export function useQRCodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);

  /**
   * Scans an image for any type of student QR code (student-only or student+question)
   * IMPORTANT: Scan regions are ordered with TOP-LEFT FIRST since that's where
   * worksheet QR codes are positioned for reliable detection.
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
            // QR codes are 80-100px in documents, so look for appropriately sized regions
            const cornerSize = Math.max(200, Math.min(500, Math.floor(img.width / 2.5)));
            const edgeWidth = Math.max(180, Math.min(450, Math.floor(img.width / 3)));
            
            // IMPORTANT: Scan regions ordered by priority - TOP-LEFT FIRST
            // This matches the new QR code placement in worksheet headers
            const regions = [
              // TOP-LEFT corner (PRIMARY - new worksheet QR location)
              { x: 0, y: 0, w: cornerSize, h: cornerSize },
              // Top edge full width (header area)
              { x: 0, y: 0, w: img.width, h: Math.min(350, img.height / 3) },
              // Left edge upper half (where header QR typically appears)
              { x: 0, y: 0, w: edgeWidth, h: Math.floor(img.height / 2) },
              // Top-right corner (legacy/alternate position)
              { x: Math.max(0, img.width - cornerSize), y: 0, w: cornerSize, h: cornerSize },
              // Bottom-left corner
              { x: 0, y: Math.max(0, img.height - cornerSize), w: cornerSize, h: cornerSize },
              // Bottom-right corner (legacy support)
              { x: Math.max(0, img.width - cornerSize), y: Math.max(0, img.height - cornerSize), w: cornerSize, h: cornerSize },
              // Left edge full height (for question QRs)
              { x: 0, y: 0, w: edgeWidth, h: img.height },
              // Right edge full height
              { x: Math.max(0, img.width - edgeWidth), y: 0, w: edgeWidth, h: img.height },
              // Upper half of image (most QRs are in top half)
              { x: 0, y: 0, w: img.width, h: Math.floor(img.height / 2) },
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
                  
                  // Try worksheet QR format first (new primary format for worksheets)
                  const worksheetParsed = parseWorksheetQRCode(code.data);
                  if (worksheetParsed) {
                    console.log('Successfully parsed worksheet QR code:', worksheetParsed);
                    resolve({
                      studentId: '', // No student ID in worksheet QR - will be matched later
                      worksheetId: worksheetParsed.worksheetId,
                      type: 'worksheet',
                    });
                    return;
                  }
                  
                  // Try the unified parser (handles v1, v2, and v3 student codes)
                  const unifiedParsed = parseUnifiedStudentQRCode(code.data);
                  if (unifiedParsed) {
                    console.log('Successfully parsed unified QR code:', unifiedParsed);
                    resolve(unifiedParsed);
                    return;
                  }
                  
                  // Try the v2 parser for backward compatibility
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
                  
                  console.log('QR code found but could not parse as known format:', code.data);
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
