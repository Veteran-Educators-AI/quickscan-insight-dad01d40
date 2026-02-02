/**
 * Utility functions for generating QR codes as images for document embedding.
 * Uses the qrcode.react library (via QRCodeCanvas) for reliable, scannable QR codes.
 * 
 * IMPORTANT: This replaces the custom matrix generation with proper QR encoding
 * to ensure codes are reliably scannable by the jsQR library in useQRCodeScanner.
 */

import { renderToString } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { createElement } from 'react';

/**
 * Generate a QR code as PNG data URL for embedding in Word documents.
 * Uses qrcode.react to create a proper QR code, then renders to canvas.
 * 
 * Size recommendation: 100-120px minimum for reliable scanning from scanned documents.
 */
export async function generateQRCodePngDataUrl(
  data: string, 
  size: number = 100
): Promise<string> {
  return new Promise((resolve) => {
    try {
      // Generate SVG using qrcode.react
      const svgElement = createElement(QRCodeSVG, {
        value: data,
        size: size,
        level: 'H', // High error correction - critical for scanning printed/scanned documents
        includeMargin: true,
        bgColor: '#ffffff',
        fgColor: '#000000',
      });
      
      const svgString = renderToString(svgElement);
      
      // Convert SVG to PNG via canvas
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const padding = 8; // White padding around QR for quiet zone
        const borderWidth = 3; // Visible border for alignment
        const totalSize = size + (padding * 2) + (borderWidth * 2);
        
        canvas.width = totalSize;
        canvas.height = totalSize;
        
        const ctx = canvas.getContext('2d');
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
          
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          URL.revokeObjectURL(svgUrl);
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(svgUrl);
          resolve('');
        }
      };
      
      img.onerror = () => {
        console.error('Failed to load QR SVG for PNG conversion');
        URL.revokeObjectURL(svgUrl);
        resolve('');
      };
      
      img.src = svgUrl;
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
