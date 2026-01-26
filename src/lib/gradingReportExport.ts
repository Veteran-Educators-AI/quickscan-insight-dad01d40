import jsPDF from 'jspdf';
import { Document, Paragraph, TextRun, ImageRun, AlignmentType, BorderStyle, HeadingLevel, Table, TableRow, TableCell, WidthType, Packer } from 'docx';
import { BatchItem, AnalysisResult } from '@/hooks/useBatchAnalysis';
import { saveAs } from 'file-saver';
import { sanitizeForPDF } from '@/lib/mathRenderer';

// Helper to sanitize text for PDF output (converts Unicode math symbols to ASCII)
const pdfText = (text: string | undefined | null): string => {
  if (!text) return '';
  return sanitizeForPDF(text);
};

interface GradingReportOptions {
  items: BatchItem[];
  className?: string;
  assignmentName?: string;
  teacherName?: string;
  includeImages?: boolean;
  includeAnnotations?: boolean;
  includeDetailedFeedback?: boolean;
}

interface ReportSummary {
  totalStudents: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
}

// Helper to convert data URL to blob
function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Helper to get image dimensions from data URL
async function getImageDimensions(dataURL: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = dataURL;
  });
}

// Helper to calculate summary stats
function calculateSummary(items: BatchItem[]): ReportSummary {
  const completedItems = items.filter(i => i.status === 'completed' && i.result);
  const scores = completedItems
    .map(i => i.result?.grade ?? i.result?.totalScore?.percentage ?? 0)
    .filter(s => s > 0);

  return {
    totalStudents: completedItems.length,
    averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    passRate: scores.length > 0 ? Math.round((scores.filter(s => s >= 65).length / scores.length) * 100) : 0,
    highestScore: scores.length > 0 ? Math.max(...scores) : 0,
    lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
  };
}

// Get letter grade from numeric grade
function getLetterGrade(grade: number): string {
  if (grade >= 90) return 'A';
  if (grade >= 80) return 'B';
  if (grade >= 70) return 'C';
  if (grade >= 65) return 'D';
  return 'F';
}

// Format date for report
function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate a detailed PDF grading report with student work images and annotations
 */
export async function generateDetailedGradingPDF(options: GradingReportOptions): Promise<Blob> {
  const {
    items,
    className = 'Class Report',
    assignmentName = 'Assignment',
    teacherName,
    includeImages = true,
    includeAnnotations = true,
    includeDetailedFeedback = true,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  const completedItems = items.filter(i => i.status === 'completed' && i.result);
  const summary = calculateSummary(items);

  // ===== COVER PAGE =====
  let y = 40;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Grading Report', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Class and assignment info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(className, pageWidth / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(14);
  doc.text(assignmentName, pageWidth / 2, y, { align: 'center' });
  y += 10;

  if (teacherName) {
    doc.setFontSize(12);
    doc.text(`Teacher: ${teacherName}`, pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${formatDate()}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 20;

  // Summary box
  doc.setDrawColor(200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 50, 3, 3, 'FD');

  y += 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin + 10, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const col1X = margin + 10;
  const col2X = pageWidth / 2 + 10;

  doc.text(`Total Students: ${summary.totalStudents}`, col1X, y);
  doc.text(`Class Average: ${summary.averageScore}%`, col2X, y);
  y += 8;
  doc.text(`Pass Rate (≥65%): ${summary.passRate}%`, col1X, y);
  doc.text(`Score Range: ${summary.lowestScore}% - ${summary.highestScore}%`, col2X, y);

  y += 25;

  // Quick roster list
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Scores Overview', margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  completedItems.forEach((item, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }

    const grade = item.result?.grade ?? item.result?.totalScore?.percentage ?? 0;
    const letterGrade = getLetterGrade(grade);
    const studentLine = `${idx + 1}. ${item.studentName || 'Unknown Student'}: ${Math.round(grade)}% (${letterGrade})`;
    doc.text(studentLine, margin + 5, y);
    y += 6;
  });

  // ===== INDIVIDUAL STUDENT PAGES =====
  for (let i = 0; i < completedItems.length; i++) {
    const item = completedItems[i];
    const result = item.result!;

    doc.addPage();
    y = margin;

    // Student header
    doc.setFillColor(30, 58, 95); // Dark blue header
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(item.studentName || 'Unknown Student', margin, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i + 1} of ${completedItems.length}`, pageWidth - margin, 15, { align: 'right' });

    doc.setTextColor(0);
    y = 35;

    // Grade summary box
    const gradeValue = result.grade ?? result.totalScore?.percentage ?? 0;
    const letterGrade = getLetterGrade(gradeValue);
    const gradeColor = gradeValue >= 80 ? [34, 197, 94] : gradeValue >= 65 ? [234, 179, 8] : [239, 68, 68];

    doc.setFillColor(gradeColor[0], gradeColor[1], gradeColor[2]);
    doc.roundedRect(margin, y, 35, 25, 3, 3, 'F');

    doc.setTextColor(255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`${Math.round(gradeValue)}%`, margin + 17.5, y + 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(letterGrade, margin + 17.5, y + 20, { align: 'center' });

    doc.setTextColor(0);

    // Score details next to grade box
    const detailsX = margin + 45;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Raw Score: ${result.totalScore?.earned ?? 0}/${result.totalScore?.possible ?? 0}`, detailsX, y + 8);
    
    if (result.nysStandard) {
      doc.text(`NYS Standard: ${result.nysStandard}`, detailsX, y + 15);
    }
    
    if (result.regentsScore !== undefined) {
      doc.text(`Regents Score: ${result.regentsScore}/4`, detailsX, y + 22);
    }

    y += 35;

    // Topic/Problem identified
    if (result.problemIdentified) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Topic:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(pdfText(result.problemIdentified), margin + 15, y);
      y += 8;
    }

    // Grade justification
    if (includeDetailedFeedback && result.gradeJustification) {
      y += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Grade Justification:', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      const justificationLines = doc.splitTextToSize(pdfText(result.gradeJustification), contentWidth - 5);
      justificationLines.slice(0, 6).forEach((line: string) => {
        if (y < pageHeight - 30) {
          doc.text(line, margin + 3, y);
          y += 5;
        }
      });
    }

    // Rubric scores
    if (includeDetailedFeedback && result.rubricScores && result.rubricScores.length > 0) {
      y += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Rubric Breakdown:', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      result.rubricScores.slice(0, 5).forEach((score, idx) => {
        if (y < pageHeight - 40) {
          const criterionText = pdfText(score.criterion);
          const scoreText = `${idx + 1}. ${criterionText.slice(0, 60)}${criterionText.length > 60 ? '...' : ''}: ${score.score}/${score.maxScore}`;
          doc.text(scoreText, margin + 3, y);
          y += 5;

          if (score.feedback) {
            doc.setTextColor(80);
            const feedbackLines = doc.splitTextToSize(`   -> ${pdfText(score.feedback)}`, contentWidth - 15);
            feedbackLines.slice(0, 2).forEach((line: string) => {
              if (y < pageHeight - 40) {
                doc.text(line, margin + 5, y);
                y += 4;
              }
            });
            doc.setTextColor(0);
          }
        }
      });
    }

    // Misconceptions
    if (result.misconceptions && result.misconceptions.length > 0) {
      y += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38); // Red
      doc.text('Identified Misconceptions:', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0);

      result.misconceptions.slice(0, 4).forEach((misconception, idx) => {
        if (y < pageHeight - 35) {
          const miscContent = pdfText(misconception);
          const miscText = `- ${miscContent.slice(0, 80)}${miscContent.length > 80 ? '...' : ''}`;
          doc.text(miscText, margin + 3, y);
          y += 5;
        }
      });
    }

    // Feedback
    if (includeDetailedFeedback && result.feedback) {
      y += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Teacher Feedback:', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const feedbackLines = doc.splitTextToSize(pdfText(result.feedback), contentWidth - 5);
      feedbackLines.slice(0, 4).forEach((line: string) => {
        if (y < pageHeight - 35) {
          doc.text(line, margin + 3, y);
          y += 5;
        }
      });
    }

    // Student work image with annotations
    if (includeImages && item.imageDataUrl) {
      // Check if we have room on this page, otherwise add a new page
      const remainingSpace = pageHeight - y - margin;
      if (remainingSpace < 80) {
        doc.addPage();
        y = margin;
      } else {
        y += 10;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Work:', margin, y);
      y += 5;

      try {
        // Add the student work image
        const imgWidth = contentWidth - 10;
        const maxImgHeight = Math.min(remainingSpace - 15, 120);

        // Get actual image dimensions to maintain aspect ratio
        const dims = await getImageDimensions(item.imageDataUrl);
        const aspectRatio = dims.width / dims.height;
        let finalWidth = imgWidth;
        let finalHeight = imgWidth / aspectRatio;

        if (finalHeight > maxImgHeight) {
          finalHeight = maxImgHeight;
          finalWidth = maxImgHeight * aspectRatio;
        }

        // Center the image
        const imgX = margin + (contentWidth - finalWidth) / 2;

        // Add border
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.rect(imgX - 1, y - 1, finalWidth + 2, finalHeight + 2);

        doc.addImage(item.imageDataUrl, 'JPEG', imgX, y, finalWidth, finalHeight);
        y += finalHeight + 5;

        // Add annotation note if enabled
        if (includeAnnotations && result.approachAnalysis) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(80);
          const analysisLines = doc.splitTextToSize(`Analysis: ${pdfText(result.approachAnalysis)}`, contentWidth);
          analysisLines.slice(0, 3).forEach((line: string) => {
            if (y < pageHeight - 10) {
              doc.text(line, margin, y);
              y += 4;
            }
          });
          doc.setTextColor(0);
        }
      } catch (err) {
        console.error('Error adding image to PDF:', err);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('[Image could not be embedded]', margin + 5, y);
        doc.setTextColor(0);
        y += 10;
      }
    }

    // OCR text (what the AI read)
    if (includeDetailedFeedback && result.ocrText) {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = margin;
      } else {
        y += 5;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('OCR Interpretation:', margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80);
      const ocrLines = doc.splitTextToSize(pdfText(result.ocrText.slice(0, 500)), contentWidth - 5);
      ocrLines.slice(0, 8).forEach((line: string) => {
        if (y < pageHeight - 10) {
          doc.text(line, margin + 3, y);
          y += 4;
        }
      });
      doc.setTextColor(0);
    }
  }

  // Return as blob
  return doc.output('blob');
}

/**
 * Generate a detailed Word document grading report
 */
export async function generateDetailedGradingWord(options: GradingReportOptions): Promise<Blob> {
  const {
    items,
    className = 'Class Report',
    assignmentName = 'Assignment',
    teacherName,
    includeImages = true,
    includeDetailedFeedback = true,
  } = options;

  const completedItems = items.filter(i => i.status === 'completed' && i.result);
  const summary = calculateSummary(items);

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Grading Report', bold: true, size: 48 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Class info
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: className, size: 32 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: assignmentName, size: 28, italics: true }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  if (teacherName) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Teacher: ${teacherName}`, size: 22 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Generated: ${formatDate()}`, size: 20, color: '666666' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Summary section
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Summary', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Total Students: ${summary.totalStudents}  |  `, size: 22 }),
        new TextRun({ text: `Class Average: ${summary.averageScore}%  |  `, size: 22 }),
        new TextRun({ text: `Pass Rate: ${summary.passRate}%`, size: 22 }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Score Range: ${summary.lowestScore}% - ${summary.highestScore}%`, size: 22 }),
      ],
      spacing: { after: 300 },
    })
  );

  // Student scores table
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true, size: 20 })] })],
          width: { size: 5, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Student', bold: true, size: 20 })] })],
          width: { size: 40, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Grade', bold: true, size: 20 })] })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Letter', bold: true, size: 20 })] })],
          width: { size: 10, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Topic', bold: true, size: 20 })] })],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
  ];

  completedItems.forEach((item, idx) => {
    const grade = item.result?.grade ?? item.result?.totalScore?.percentage ?? 0;
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${idx + 1}`, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.studentName || 'Unknown', size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${Math.round(grade)}%`, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: getLetterGrade(grade), size: 18, bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.result?.problemIdentified || '-', size: 18 })] })],
          }),
        ],
      })
    );
  });

  children.push(
    new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  );

  // Individual student sections
  for (let i = 0; i < completedItems.length; i++) {
    const item = completedItems[i];
    const result = item.result!;
    const grade = result.grade ?? result.totalScore?.percentage ?? 0;

    // Page break before each student
    children.push(
      new Paragraph({
        children: [],
        pageBreakBefore: true,
      })
    );

    // Student name header
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: item.studentName || 'Unknown Student', bold: true, size: 32 }),
          new TextRun({ text: `  (${Math.round(grade)}% - ${getLetterGrade(grade)})`, size: 28, color: grade >= 65 ? '22C55E' : 'EF4444' }),
        ],
        heading: HeadingLevel.HEADING_1,
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E3A5F' },
        },
        spacing: { after: 200 },
      })
    );

    // Score details
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Raw Score: ${result.totalScore?.earned ?? 0}/${result.totalScore?.possible ?? 0}`, size: 22 }),
          result.nysStandard ? new TextRun({ text: `  |  NYS Standard: ${result.nysStandard}`, size: 22 }) : new TextRun({ text: '' }),
          result.regentsScore !== undefined ? new TextRun({ text: `  |  Regents: ${result.regentsScore}/4`, size: 22 }) : new TextRun({ text: '' }),
        ],
        spacing: { after: 150 },
      })
    );

    // Topic
    if (result.problemIdentified) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Topic: ', bold: true, size: 22 }),
            new TextRun({ text: result.problemIdentified, size: 22 }),
          ],
          spacing: { after: 150 },
        })
      );
    }

    // Grade justification
    if (includeDetailedFeedback && result.gradeJustification) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Grade Justification:', bold: true, size: 22 })],
          spacing: { before: 150, after: 50 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: result.gradeJustification, size: 20 })],
          spacing: { after: 150 },
        })
      );
    }

    // Rubric scores
    if (includeDetailedFeedback && result.rubricScores && result.rubricScores.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Rubric Breakdown:', bold: true, size: 22 })],
          spacing: { before: 150, after: 50 },
        })
      );

      result.rubricScores.forEach((score, idx) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${idx + 1}. ${score.criterion}: `, size: 20 }),
              new TextRun({ text: `${score.score}/${score.maxScore}`, bold: true, size: 20 }),
            ],
            spacing: { after: 30 },
          })
        );
        if (score.feedback) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `   → ${score.feedback}`, size: 18, italics: true, color: '666666' })],
              spacing: { after: 50 },
            })
          );
        }
      });
    }

    // Misconceptions
    if (result.misconceptions && result.misconceptions.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Identified Misconceptions:', bold: true, size: 22, color: 'DC2626' })],
          spacing: { before: 150, after: 50 },
        })
      );

      result.misconceptions.forEach((misc) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${misc}`, size: 20 })],
            spacing: { after: 30 },
          })
        );
      });
    }

    // Feedback
    if (includeDetailedFeedback && result.feedback) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Teacher Feedback:', bold: true, size: 22 })],
          spacing: { before: 150, after: 50 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: result.feedback, size: 20 })],
          spacing: { after: 150 },
        })
      );
    }

    // Student work image
    if (includeImages && item.imageDataUrl) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Student Work:', bold: true, size: 22 })],
          spacing: { before: 200, after: 100 },
        })
      );

      try {
        const blob = dataURLToBlob(item.imageDataUrl);
        const arrayBuffer = await blob.arrayBuffer();
        const dims = await getImageDimensions(item.imageDataUrl);

        // Scale to fit page (max width ~6 inches = 432 points at 72dpi)
        const maxWidth = 450;
        const maxHeight = 400;
        let width = dims.width;
        let height = dims.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: arrayBuffer,
                transformation: { width, height },
                type: 'jpg',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          })
        );
      } catch (err) {
        console.error('Error adding image to Word doc:', err);
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '[Image could not be embedded]', italics: true, color: '999999' })],
            spacing: { after: 100 },
          })
        );
      }
    }

    // Approach analysis
    if (includeDetailedFeedback && result.approachAnalysis) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Work Analysis:', bold: true, size: 20 })],
          spacing: { before: 100, after: 50 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: result.approachAnalysis, size: 18, italics: true, color: '666666' })],
          spacing: { after: 150 },
        })
      );
    }

    // OCR text
    if (includeDetailedFeedback && result.ocrText) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'OCR Interpretation:', bold: true, size: 18 })],
          spacing: { before: 100, after: 50 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: result.ocrText.slice(0, 800), size: 16, color: '888888' })],
          spacing: { after: 100 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  return await Packer.toBlob(doc);
}

/**
 * Export grading report as downloadable PDF
 */
export async function exportGradingReportPDF(options: GradingReportOptions): Promise<void> {
  const blob = await generateDetailedGradingPDF(options);
  const fileName = `${options.className || 'Grading'}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
}

/**
 * Export grading report as downloadable Word document
 */
export async function exportGradingReportWord(options: GradingReportOptions): Promise<void> {
  const blob = await generateDetailedGradingWord(options);
  const fileName = `${options.className || 'Grading'}_Report_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
}

/**
 * Prepare files for Google Drive upload
 */
export async function prepareGradingReportForDrive(options: GradingReportOptions): Promise<{ blob: Blob; name: string }[]> {
  const files: { blob: Blob; name: string }[] = [];
  const dateStr = new Date().toISOString().split('T')[0];
  const baseName = `${options.className || 'Grading'}_Report_${dateStr}`;

  // Generate PDF
  const pdfBlob = await generateDetailedGradingPDF(options);
  files.push({ blob: pdfBlob, name: `${baseName}.pdf` });

  // Optionally also include individual student images
  if (options.includeImages) {
    const completedItems = options.items.filter(i => i.status === 'completed' && i.result);
    
    for (const item of completedItems) {
      if (item.imageDataUrl) {
        const blob = dataURLToBlob(item.imageDataUrl);
        const studentName = (item.studentName || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
        const topic = (item.result?.problemIdentified || 'Work').replace(/[^a-zA-Z0-9]/g, '_');
        files.push({
          blob,
          name: `${studentName}_${topic}_${dateStr}.jpg`,
        });
      }
    }
  }

  return files;
}
