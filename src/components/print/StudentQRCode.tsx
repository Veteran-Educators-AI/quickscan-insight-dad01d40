import { QRCodeSVG } from 'qrcode.react';

interface StudentQRCodeProps {
  studentId: string;
  questionId: string;
  size?: number;
  includeUrl?: boolean;
}

/**
 * Generates a QR code encoding student and question IDs for automatic detection
 * Format: JSON object with studentId, questionId, and version for future compatibility
 * When includeUrl is true, generates a direct URL to the student results page
 * 
 * IMPORTANT: QR codes are optimized for scanning with:
 * - High error correction (H = 30% recovery)
 * - Sufficient quiet zone margin
 * - Minimum size of 80px for reliable scanning
 */
export function StudentQRCode({ studentId, questionId, size = 80, includeUrl = false }: StudentQRCodeProps) {
  // Generate either a URL (for student-facing) or JSON data (for teacher scanning)
  const qrData = includeUrl 
    ? `${window.location.origin}/results/${studentId}/${questionId}`
    : JSON.stringify({
        v: 1, // version for future compatibility
        s: studentId, // student ID
        q: questionId, // question ID
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
 * Parses a QR code value to extract student and question IDs
 */
export function parseStudentQRCode(qrValue: string): { studentId: string; questionId: string } | null {
  try {
    const data = JSON.parse(qrValue);
    if (data.v === 1 && data.s && data.q) {
      return {
        studentId: data.s,
        questionId: data.q,
      };
    }
    return null;
  } catch {
    return null;
  }
}
