import { QRCodeSVG } from 'qrcode.react';

interface StudentOnlyQRCodeProps {
  studentId: string;
  size?: number;
}

/**
 * Generates a QR code encoding only the student ID for automatic student identification.
 * This is different from StudentQRCode which encodes both student and question IDs.
 * Format: JSON object with studentId and version for future compatibility
 * 
 * IMPORTANT: QR codes are optimized for scanning with:
 * - High error correction (H = 30% recovery)
 * - Sufficient quiet zone margin
 * - Minimum size of 84px for reliable scanning
 * - High contrast black on white
 */
export function StudentOnlyQRCode({ studentId, size = 88 }: StudentOnlyQRCodeProps) {
  const qrData = JSON.stringify({
    v: 2, // version 2 for student-only codes
    type: 'student',
    s: studentId,
  });

  return (
    <div 
      style={{ 
        padding: '4px', 
        backgroundColor: '#ffffff', 
        border: '2px solid #000000',
        borderRadius: '4px',
        display: 'inline-block',
      }}
    >
      <QRCodeSVG
        value={qrData}
        size={size}
        level="H" // High error correction - 30% recovery
        includeMargin={true}
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>
  );
}

/**
 * Parses a QR code value to extract student ID (for student-only codes)
 */
export function parseStudentOnlyQRCode(qrValue: string): { studentId: string } | null {
  try {
    const data = JSON.parse(qrValue);
    // Version 2 student-only codes
    if (data.v === 2 && data.type === 'student' && data.s) {
      return {
        studentId: data.s,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Unified parser that handles both student-only (v2) and student+question (v1) QR codes
 */
export function parseAnyStudentQRCode(qrValue: string): { 
  studentId: string; 
  questionId?: string;
  type: 'student-only' | 'student-question';
} | null {
  try {
    const data = JSON.parse(qrValue);
    
    // Version 2: student-only codes
    if (data.v === 2 && data.type === 'student' && data.s) {
      return {
        studentId: data.s,
        type: 'student-only',
      };
    }
    
    // Version 1: student + question codes
    if (data.v === 1 && data.s && data.q) {
      return {
        studentId: data.s,
        questionId: data.q,
        type: 'student-question',
      };
    }
    
    return null;
  } catch {
    return null;
  }
}
