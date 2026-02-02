/**
 * Utility functions for generating QR codes as images for document embedding.
 * Uses the qrcode.react library (via QRCodeSVG) for reliable, scannable QR codes.
 * 
 * IMPORTANT: This replaces the custom matrix generation with proper QR encoding
 * to ensure codes are reliably scannable by the jsQR library in useQRCodeScanner.
 */

import { QRCodeCanvas } from 'qrcode.react';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Generate a QR code as PNG data URL for embedding in Word documents.
 * Creates a proper QR code by rendering to DOM, then converting to canvas.
 * 
 * Size recommendation: 100-120px minimum for reliable scanning from scanned documents.
 */
export async function generateQRCodePngDataUrl(
  data: string, 
  size: number = 100
): Promise<string> {
  return new Promise((resolve) => {
    try {
      // Create a hidden container for rendering the QR code
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = `${size + 20}px`;
      container.style.height = `${size + 20}px`;
      container.style.backgroundColor = '#ffffff';
      document.body.appendChild(container);
      
      // Create the React root and render the QR code
      const root = createRoot(container);
      
      // Use QRCodeCanvas for direct canvas rendering
      root.render(
        createElement(QRCodeCanvas, {
          value: data,
          size: size,
          level: 'H', // High error correction - critical for scanning printed/scanned documents
          includeMargin: true,
          bgColor: '#ffffff',
          fgColor: '#000000',
        })
      );
      
      // Wait for render to complete, then extract the canvas
      setTimeout(() => {
        try {
          // Look for either a canvas or SVG element
          const canvas = container.querySelector('canvas');
          const svg = container.querySelector('svg');
          
          if (canvas) {
            // Canvas found - get data URL directly
            const padding = 8;
            const borderWidth = 3;
            const totalSize = size + (padding * 2) + (borderWidth * 2);
            
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = totalSize;
            finalCanvas.height = totalSize;
            
            const ctx = finalCanvas.getContext('2d');
            if (ctx) {
              // White background
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, totalSize, totalSize);
              
              // Black border for visual alignment
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = borderWidth;
              ctx.strokeRect(borderWidth / 2, borderWidth / 2, totalSize - borderWidth, totalSize - borderWidth);
              
              // Draw QR code centered
              ctx.drawImage(canvas, padding + borderWidth, padding + borderWidth, size, size);
              
              const dataUrl = finalCanvas.toDataURL('image/png', 1.0);
              root.unmount();
              document.body.removeChild(container);
              resolve(dataUrl);
            } else {
              root.unmount();
              document.body.removeChild(container);
              resolve('');
            }
          } else if (svg) {
            // SVG found - convert to canvas
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            const img = new Image();
            img.onload = () => {
              const padding = 8;
              const borderWidth = 3;
              const totalSize = size + (padding * 2) + (borderWidth * 2);
              
              const finalCanvas = document.createElement('canvas');
              finalCanvas.width = totalSize;
              finalCanvas.height = totalSize;
              
              const ctx = finalCanvas.getContext('2d');
              if (ctx) {
                // White background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, totalSize, totalSize);
                
                // Black border for visual alignment
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = borderWidth;
                ctx.strokeRect(borderWidth / 2, borderWidth / 2, totalSize - borderWidth, totalSize - borderWidth);
                
                // Draw QR code centered
                ctx.drawImage(img, padding + borderWidth, padding + borderWidth, size, size);
                
                const dataUrl = finalCanvas.toDataURL('image/png', 1.0);
                URL.revokeObjectURL(url);
                root.unmount();
                document.body.removeChild(container);
                resolve(dataUrl);
              } else {
                URL.revokeObjectURL(url);
                root.unmount();
                document.body.removeChild(container);
                resolve('');
              }
            };
            
            img.onerror = () => {
              console.error('Failed to load QR SVG for PNG conversion');
              URL.revokeObjectURL(url);
              root.unmount();
              document.body.removeChild(container);
              resolve('');
            };
            
            img.src = url;
          } else {
            console.error('No canvas or SVG found in QR code container');
            root.unmount();
            document.body.removeChild(container);
            resolve('');
          }
        } catch (err) {
          console.error('Error processing QR code:', err);
          root.unmount();
          document.body.removeChild(container);
          resolve('');
        }
      }, 150); // Give React time to render
      
    } catch (error) {
      console.error('Error generating QR code PNG:', error);
      resolve('');
    }
  });
}

/**
 * Generate student page QR code data for Word documents.
 * Format matches what parseUnifiedStudentQRCode expects.
 */
export function generateStudentPageQRData(
  studentId: string,
  pageNumber: number,
  totalPages?: number
): string {
  return JSON.stringify({
    v: 3, // version 3 for student+page codes
    type: 'student-page',
    s: studentId,
    p: pageNumber,
    t: totalPages || undefined,
  });
}

/**
 * Generate student-only QR code data for Word documents.
 * Format matches what parseAnyStudentQRCode expects.
 */
export function generateStudentOnlyQRData(studentId: string): string {
  return JSON.stringify({
    v: 2, // version 2 for student-only codes
    type: 'student',
    s: studentId,
  });
}

/**
 * Generate worksheet identification QR code data.
 * Encodes worksheet ID for linking scanned work to worksheets.
 */
export function generateWorksheetQRData(worksheetId: string): string {
  return JSON.stringify({
    v: 1,
    type: 'worksheet',
    w: worksheetId,
  });
}

/**
 * Helper to fetch QR code image as ArrayBuffer for Word document embedding.
 * Uses a larger size (100px) for reliable scanning from printed documents.
 */
export async function fetchQRCodeAsArrayBuffer(
  studentId: string,
  pageNumber?: number,
  totalPages?: number
): Promise<ArrayBuffer | null> {
  try {
    const qrData = pageNumber !== undefined 
      ? generateStudentPageQRData(studentId, pageNumber, totalPages)
      : generateStudentOnlyQRData(studentId);
    
    // Use 100px size for reliable scanning
    const dataUrl = await generateQRCodePngDataUrl(qrData, 100);
    
    if (!dataUrl) return null;
    
    // Convert data URL to ArrayBuffer
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error('Error generating QR code for Word:', error);
    return null;
  }
}

/**
 * Generate a worksheet QR code as ArrayBuffer for document embedding.
 * Places worksheet ID in QR for automatic worksheet identification during scanning.
 */
export async function fetchWorksheetQRCodeAsArrayBuffer(
  worksheetId: string
): Promise<ArrayBuffer | null> {
  try {
    const qrData = generateWorksheetQRData(worksheetId);
    
    // Use 100px size for reliable scanning
    const dataUrl = await generateQRCodePngDataUrl(qrData, 100);
    
    if (!dataUrl) return null;
    
    // Convert data URL to ArrayBuffer
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error('Error generating worksheet QR code:', error);
    return null;
  }
}
