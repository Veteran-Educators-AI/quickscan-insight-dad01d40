import { QRCodeSVG } from 'qrcode.react';

interface StudentPageQRCodeProps {
  studentId: string;
  pageNumber: number;
  totalPages?: number;
  size?: number;
}

/**
 * Generates a QR code encoding student ID and page number for multi-page document identification.
 * This enables automatic front/back page matching and page ordering.
 * 
 * Format: JSON object with studentId, page number, total pages (optional), and version
 * 
 * IMPORTANT: QR codes are optimized for scanning with:
 * - High error correction (H = 30% recovery)
 * - Sufficient quiet zone margin
 * - Minimum size of 80px for reliable scanning
 * - High contrast black on white
 */
export function StudentPageQRCode({ 
  studentId, 
  pageNumber, 
  totalPages,
  size = 84 
}: StudentPageQRCodeProps) {
  const qrData = JSON.stringify({
    v: 3, // version 3 for student+page codes
    type: 'student-page',
    s: studentId,
    p: pageNumber,
    t: totalPages || undefined,
  });

  return (
    <div 
      style={{ 
        padding: '3px', 
        backgroundColor: '#ffffff', 
        border: '2px solid #000000',
        borderRadius: '4px',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
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
      <div style={{
        fontSize: '9px',
        fontWeight: 700,
        color: '#000000',
        fontFamily: 'Helvetica, Arial, sans-serif',
        marginTop: '-2px',
        textAlign: 'center',
      }}>
        Page {pageNumber}{totalPages ? ` of ${totalPages}` : ''}
      </div>
    </div>
  );
}

/**
 * Parses a QR code value to extract student ID and page information
 */
export function parseStudentPageQRCode(qrValue: string): { 
  studentId: string; 
  pageNumber: number;
  totalPages?: number;
} | null {
  try {
    const data = JSON.parse(qrValue);
    // Version 3 student+page codes
    if (data.v === 3 && data.type === 'student-page' && data.s && typeof data.p === 'number') {
      return {
        studentId: data.s,
        pageNumber: data.p,
        totalPages: data.t,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Unified parser that handles all QR code versions:
 * - v1: student + question codes
 * - v2: student-only codes
 * - v3: student + page codes (for multi-page documents)
 */
export function parseUnifiedStudentQRCode(qrValue: string): {
  studentId: string;
  questionId?: string;
  pageNumber?: number;
  totalPages?: number;
  type: 'student-only' | 'student-question' | 'student-page';
} | null {
  try {
    const data = JSON.parse(qrValue);
    
    // Version 3: student + page codes
    if (data.v === 3 && data.type === 'student-page' && data.s && typeof data.p === 'number') {
      return {
        studentId: data.s,
        pageNumber: data.p,
        totalPages: data.t,
        type: 'student-page',
      };
    }
    
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

/**
 * Helper to determine if pages belong to the same student and are sequential
 */
export function arePagesRelated(
  page1: { studentId: string; pageNumber?: number },
  page2: { studentId: string; pageNumber?: number }
): { sameStudent: boolean; isSequential: boolean } {
  const sameStudent = page1.studentId === page2.studentId;
  const isSequential = sameStudent && 
    page1.pageNumber !== undefined && 
    page2.pageNumber !== undefined &&
    Math.abs(page1.pageNumber - page2.pageNumber) === 1;
  
  return { sameStudent, isSequential };
}
