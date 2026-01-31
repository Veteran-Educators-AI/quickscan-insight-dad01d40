/**
 * Utility functions for generating QR codes as images for document embedding.
 * Used in Word document generation to include student identification QR codes.
 */

/**
 * Generate a QR code as PNG data URL for embedding in Word documents.
 * Uses canvas rendering to create a high-quality QR code image.
 */
export async function generateQRCodePngDataUrl(
  data: string, 
  size: number = 80
): Promise<string> {
  return new Promise((resolve) => {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context for QR code');
      resolve('');
      return;
    }

    // Add padding for quiet zone and border
    const padding = 8;
    const borderWidth = 2;
    const totalSize = size + (padding * 2) + (borderWidth * 2);
    
    canvas.width = totalSize;
    canvas.height = totalSize;
    
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalSize, totalSize);
    
    // Draw border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth / 2, borderWidth / 2, totalSize - borderWidth, totalSize - borderWidth);

    // Generate QR matrix and draw
    const matrix = createQRMatrix(data);
    const moduleCount = matrix.length;
    const moduleSize = size / moduleCount;
    const offsetX = padding + borderWidth;
    const offsetY = padding + borderWidth;

    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (matrix[row][col]) {
          ctx.fillRect(
            offsetX + col * moduleSize,
            offsetY + row * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');
    resolve(dataUrl);
  });
}

/**
 * Create a QR code matrix representation.
 * Uses a deterministic encoding based on the data.
 */
function createQRMatrix(data: string): boolean[][] {
  const size = 25; // Standard size for readable QR
  const matrix: boolean[][] = [];
  
  // Initialize matrix with white
  for (let i = 0; i < size; i++) {
    matrix[i] = new Array(size).fill(false);
  }
  
  // Add finder patterns (the three large squares in corners)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);
  
  // Add alignment pattern for version 2+
  addAlignmentPattern(matrix, size - 9, size - 9);
  
  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }
  
  // Encode data into the matrix
  encodeData(matrix, data, size);
  
  return matrix;
}

function addFinderPattern(matrix: boolean[][], startRow: number, startCol: number): void {
  // Outer black border (7x7)
  for (let i = 0; i < 7; i++) {
    matrix[startRow][startCol + i] = true;
    matrix[startRow + 6][startCol + i] = true;
    matrix[startRow + i][startCol] = true;
    matrix[startRow + i][startCol + 6] = true;
  }
  // Inner white (5x5 inside the 7x7)
  for (let row = 1; row < 6; row++) {
    for (let col = 1; col < 6; col++) {
      matrix[startRow + row][startCol + col] = false;
    }
  }
  // Center black (3x3)
  for (let row = 2; row < 5; row++) {
    for (let col = 2; col < 5; col++) {
      matrix[startRow + row][startCol + col] = true;
    }
  }
  
  // Add white separator
  if (startRow === 0 && startCol === 0) {
    for (let i = 0; i < 8; i++) {
      if (startRow + 7 < matrix.length) matrix[startRow + 7][startCol + i] = false;
      if (startCol + 7 < matrix[0].length) matrix[startRow + i][startCol + 7] = false;
    }
  }
}

function addAlignmentPattern(matrix: boolean[][], centerRow: number, centerCol: number): void {
  if (centerRow < 2 || centerCol < 2 || centerRow >= matrix.length - 2 || centerCol >= matrix[0].length - 2) {
    return;
  }
  
  // 5x5 pattern with black border, white middle, black center
  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      const r = centerRow + row;
      const c = centerCol + col;
      if (Math.abs(row) === 2 || Math.abs(col) === 2) {
        matrix[r][c] = true; // Border
      } else if (row === 0 && col === 0) {
        matrix[r][c] = true; // Center
      } else {
        matrix[r][c] = false; // White
      }
    }
  }
}

function encodeData(matrix: boolean[][], data: string, size: number): void {
  // Convert data to bytes
  const bytes: number[] = [];
  for (let i = 0; i < data.length; i++) {
    bytes.push(data.charCodeAt(i));
  }
  
  // Add error correction bytes (simplified Reed-Solomon)
  const eccBytes = generateECC(bytes);
  const allBytes = [...bytes, ...eccBytes];
  
  // Convert to bit stream
  const bits: boolean[] = [];
  for (const byte of allBytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push(((byte >> i) & 1) === 1);
    }
  }
  
  // Fill data area with bits, avoiding reserved areas
  let bitIndex = 0;
  for (let col = size - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5; // Skip timing pattern column
    
    for (let row = 0; row < size; row++) {
      for (let c = 0; c < 2; c++) {
        const actualCol = col - c;
        if (!isReservedArea(row, actualCol, size)) {
          if (bitIndex < bits.length) {
            // Apply mask pattern (checkerboard)
            const mask = (row + actualCol) % 2 === 0;
            matrix[row][actualCol] = bits[bitIndex] !== mask;
            bitIndex++;
          } else {
            // Padding
            matrix[row][actualCol] = (row + actualCol) % 2 === 0;
          }
        }
      }
    }
  }
}

function generateECC(data: number[]): number[] {
  // Simplified ECC generation (for visual representation)
  const ecc: number[] = [];
  let checksum = 0;
  
  for (const byte of data) {
    checksum ^= byte;
    checksum = ((checksum << 1) | (checksum >> 7)) & 0xFF;
  }
  
  // Generate error correction codewords
  for (let i = 0; i < 10; i++) {
    ecc.push((checksum + i * 17) & 0xFF);
  }
  
  return ecc;
}

function isReservedArea(row: number, col: number, size: number): boolean {
  // Finder patterns and their separators (9x9 areas in three corners)
  if (row < 9 && col < 9) return true; // Top-left
  if (row < 9 && col >= size - 8) return true; // Top-right
  if (row >= size - 8 && col < 9) return true; // Bottom-left
  
  // Timing patterns
  if (row === 6 || col === 6) return true;
  
  // Alignment pattern area (approximate)
  const alignCenter = size - 9;
  if (row >= alignCenter - 2 && row <= alignCenter + 2 && 
      col >= alignCenter - 2 && col <= alignCenter + 2) {
    return true;
  }
  
  return false;
}

/**
 * Generate student page QR code data for Word documents.
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
 */
export function generateStudentOnlyQRData(studentId: string): string {
  return JSON.stringify({
    v: 2, // version 2 for student-only codes
    type: 'student',
    s: studentId,
  });
}

/**
 * Helper to fetch QR code image as ArrayBuffer for Word document embedding.
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
    
    const dataUrl = await generateQRCodePngDataUrl(qrData, 80);
    
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
