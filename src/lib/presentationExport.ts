import jsPDF from 'jspdf';
import { fixEncodingCorruption, sanitizeForPDF } from '@/lib/mathRenderer';
import pptxgen from 'pptxgenjs';
import type { NycologicPresentation, VisualTheme } from '@/components/presentation/presentationTypes';

// Theme color mappings for exports
const themeColors: Record<string, { primary: string; secondary: string; bg: string }> = {
  'neon-city': { primary: '#ec4899', secondary: '#f97316', bg: '#581c87' },
  'ocean-wave': { primary: '#22d3ee', secondary: '#3b82f6', bg: '#164e63' },
  'sunset-glow': { primary: '#fbbf24', secondary: '#f43f5e', bg: '#7c2d12' },
  'forest-zen': { primary: '#10b981', secondary: '#14b8a6', bg: '#064e3b' },
  'galaxy-dreams': { primary: '#8b5cf6', secondary: '#c026d3', bg: '#4c1d95' },
  'candy-pop': { primary: '#f472b6', secondary: '#fb7185', bg: '#831843' },
};

const defaultColors = { primary: '#fbbf24', secondary: '#3b82f6', bg: '#1e293b' };

const formatPdfText = (text: string) => sanitizeForPDF(fixEncodingCorruption(text));

// Convert Unicode escape sequences to actual characters for PowerPoint
const formatPptxText = (text: string): string => {
  if (!text) return '';
  // Replace \uXXXX escape sequences with actual Unicode characters
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
};

function getThemeColors(theme?: VisualTheme) {
  if (!theme?.id) return defaultColors;
  return themeColors[theme.id] || defaultColors;
}

// Export to PDF
export async function exportToPDF(presentation: NycologicPresentation): Promise<void> {
  const colors = getThemeColors(presentation.visualTheme);
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [1920, 1080],
  });

  const pageWidth = 1920;
  const pageHeight = 1080;
  const margin = 100;

  for (let i = 0; i < presentation.slides.length; i++) {
    const slide = presentation.slides[i];
    
    if (i > 0) {
      pdf.addPage([1920, 1080], 'landscape');
    }

    // Background gradient (approximated with solid color)
    pdf.setFillColor(colors.bg);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Add decorative elements
    pdf.setFillColor(colors.primary);
    pdf.setGState(pdf.GState({ opacity: 0.1 }));
    pdf.circle(-200, -200, 600, 'F');
    pdf.circle(pageWidth + 100, pageHeight + 100, 500, 'F');
    pdf.setGState(pdf.GState({ opacity: 1 }));

    // Header - "NYClogic PRESENTS"
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(colors.primary);
    pdf.text('NYClogic PRESENTS', margin, 80);

    // Presentation title in header
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatPdfText(presentation.title), margin, 110);

    // Slide subtitle/tag
    let yPosition = 350;
    if (slide.subtitle) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.setTextColor(colors.primary);
      pdf.text(formatPdfText(slide.subtitle).toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 60;
    }

    // Slide title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(72);
    pdf.setTextColor(255, 255, 255);
    
    // Word wrap for long titles
    const titleLines = pdf.splitTextToSize(formatPdfText(slide.title.replace(/\*\*/g, '')), pageWidth - margin * 2);
    titleLines.forEach((line: string, idx: number) => {
      pdf.text(line, pageWidth / 2, yPosition + idx * 80, { align: 'center' });
    });
    yPosition += titleLines.length * 80 + 40;

    // Content
    if (slide.content.length > 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(36);
      pdf.setTextColor(200, 200, 200);
      
      slide.content.forEach((item, idx) => {
        const contentLines = pdf.splitTextToSize(formatPdfText(item), pageWidth - margin * 2);
        contentLines.forEach((line: string, lineIdx: number) => {
          if (yPosition + lineIdx * 45 < pageHeight - 200) {
            pdf.text(line, pageWidth / 2, yPosition + lineIdx * 45, { align: 'center' });
          }
        });
        yPosition += contentLines.length * 45 + 20;
      });
    }

    // Question section
    if (slide.type === 'question' && slide.question) {
      yPosition += 30;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(32);
      pdf.setTextColor(255, 255, 255);
      
      const questionLines = pdf.splitTextToSize(formatPdfText(slide.question.prompt), pageWidth - margin * 2);
      questionLines.forEach((line: string, idx: number) => {
        pdf.text(line, pageWidth / 2, yPosition + idx * 40, { align: 'center' });
      });
      yPosition += questionLines.length * 40 + 40;

      // Options
      if (slide.question.options) {
        pdf.setFontSize(28);
        const optionWidth = (pageWidth - margin * 3) / 2;
        
        slide.question.options.forEach((option, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const x = margin + col * (optionWidth + margin / 2) + 20;
          const y = yPosition + row * 80;
          
          // Option background
          pdf.setFillColor(255, 255, 255);
          pdf.setGState(pdf.GState({ opacity: 0.1 }));
          pdf.roundedRect(x - 15, y - 35, optionWidth, 60, 10, 10, 'F');
          pdf.setGState(pdf.GState({ opacity: 1 }));
          
          // Option letter
          pdf.setTextColor(colors.primary);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${String.fromCharCode(65 + idx)}.`, x, y);
          
          // Option text
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'normal');
          pdf.text(formatPdfText(option), x + 40, y);
        });
      }
    }

    // Slide number
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(20);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`${i + 1} / ${presentation.slides.length}`, pageWidth / 2, pageHeight - 50, { align: 'center' });
  }

  // Save the PDF
  const fileName = `${presentation.title.replace(/[^a-z0-9]/gi, '_')}_presentation.pdf`;
  pdf.save(fileName);
}

// Helper to convert image URL to base64 for embedding
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) {
      return url; // Already base64
    }
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Helper type for animation options (pptxgenjs types don't expose animate but it works at runtime)
type AnimatedTextOpts = pptxgen.TextPropsOptions & { animate?: { type: string; delay: number } };
type AnimatedShapeOpts = pptxgen.ShapeProps & { animate?: { type: string; delay: number } };

// Export to PowerPoint
export async function exportToPPTX(presentation: NycologicPresentation): Promise<void> {
  const colors = getThemeColors(presentation.visualTheme);
  const pptx = new pptxgen();

  // Presentation metadata
  pptx.author = 'NYClogic Ai';
  pptx.title = presentation.title;
  pptx.subject = presentation.topic;
  pptx.company = 'NYClogic';

  // Define master slide with cleaner layout
  pptx.defineSlideMaster({
    title: 'NYCLOGIC_MASTER',
    background: { color: colors.bg.replace('#', '') },
    objects: [
      {
        text: {
          text: 'NYClogic PRESENTS',
          options: {
            x: 0.5,
            y: 0.25,
            w: 3,
            h: 0.3,
            fontSize: 11,
            bold: true,
            color: colors.primary.replace('#', ''),
            fontFace: 'Arial',
          },
        },
      },
    ],
    slideNumber: { x: 4.5, y: 7.0, fontSize: 10, color: '666666' },
  });

  for (const slide of presentation.slides) {
    const pptSlide = pptx.addSlide({ masterName: 'NYCLOGIC_MASTER' });

    let yPos = 1.0;
    let animDelay = 0;

    // Subtitle
    if (slide.subtitle) {
      pptSlide.addText(formatPptxText(slide.subtitle.toUpperCase()), {
        x: 0.5, y: yPos, w: 9, h: 0.35,
        fontSize: 14, bold: true,
        color: colors.primary.replace('#', ''),
        align: 'left', fontFace: 'Arial',
      });
      yPos += 0.5;
    }

    // Title
    pptSlide.addText(formatPptxText(slide.title.replace(/\*\*/g, '')), {
      x: 0.5, y: yPos, w: 9, h: 1.0,
      fontSize: 40, bold: true, color: 'FFFFFF',
      align: 'left', fontFace: 'Arial', valign: 'top',
    });
    yPos += 1.2;

    // Image on right
    if (slide.image?.url) {
      try {
        const imgData = await fetchImageAsBase64(slide.image.url);
        if (imgData) {
          const imgW = Math.min(3.0, (slide.image.size?.width || 200) / 100);
          const imgH = Math.min(3.0, (slide.image.size?.height || 200) / 100);
          pptSlide.addImage({ data: imgData, x: 6.8, y: 2.0, w: imgW, h: imgH });
        }
      } catch (e) {
        console.warn('Image embed failed:', e);
      }
    }

    // Content bullets - each appears on click
    if (slide.content.length > 0) {
      const cw = slide.image?.url ? 5.5 : 9;
      slide.content.forEach((item) => {
        const opts: AnimatedTextOpts = {
          x: 0.5, y: yPos, w: cw, h: 0.5,
          fontSize: 20, color: 'DDDDDD', align: 'left', fontFace: 'Arial',
          animate: { type: 'appear', delay: animDelay },
        };
        pptSlide.addText(`• ${formatPptxText(item)}`, opts as pptxgen.TextPropsOptions);
        yPos += 0.6;
        animDelay += 0.5;
      });
    }

    // Word Problem - progressive reveal
    if (slide.wordProblem) {
      yPos += 0.4;

      pptSlide.addText('📝 WORD PROBLEM', {
        x: 0.5, y: yPos, w: 9, h: 0.35,
        fontSize: 14, bold: true, color: colors.primary.replace('#', ''), fontFace: 'Arial',
      });
      yPos += 0.45;

      pptSlide.addText(formatPptxText(slide.wordProblem.problem), {
        x: 0.5, y: yPos, w: 9, h: 0.7,
        fontSize: 18, color: 'FFFFFF', fontFace: 'Arial',
      });
      yPos += 0.9;

      const solnHdr: AnimatedTextOpts = {
        x: 0.5, y: yPos, w: 9, h: 0.35,
        fontSize: 14, bold: true, color: '10B981', fontFace: 'Arial',
        animate: { type: 'appear', delay: 0 },
      };
      pptSlide.addText('📋 STEP-BY-STEP SOLUTION', solnHdr as pptxgen.TextPropsOptions);
      yPos += 0.45;

      slide.wordProblem.steps.forEach((step, i) => {
        const txt = formatPptxText(step.replace(/^Step \d+:\s*/i, ''));
        const so: AnimatedTextOpts = {
          x: 0.7, y: yPos, w: 8.3, h: 0.45,
          fontSize: 16, color: 'EEEEEE', fontFace: 'Arial',
          animate: { type: 'appear', delay: 0 },
        };
        pptSlide.addText(`${i + 1}. ${txt}`, so as pptxgen.TextPropsOptions);
        yPos += 0.5;
      });

      yPos += 0.3;

      const ansBox: AnimatedShapeOpts = {
        x: 0.5, y: yPos, w: 9, h: 0.6,
        fill: { color: 'FBBF24', transparency: 85 },
        line: { color: 'FBBF24', width: 2 },
        animate: { type: 'appear', delay: 0 },
      };
      pptSlide.addShape('rect' as pptxgen.ShapeType, ansBox as pptxgen.ShapeProps);

      const ansTxt: AnimatedTextOpts = {
        x: 0.6, y: yPos + 0.1, w: 8.8, h: 0.4,
        fontSize: 18, bold: true, color: 'FBBF24', fontFace: 'Arial',
        animate: { type: 'appear', delay: 0 },
      };
      pptSlide.addText(`✓ ANSWER: ${formatPptxText(slide.wordProblem.finalAnswer)}`, ansTxt as pptxgen.TextPropsOptions);

      pptSlide.addNotes(`Problem: ${slide.wordProblem.problem}\n\nSteps:\n${slide.wordProblem.steps.join('\n')}\n\nAnswer: ${slide.wordProblem.finalAnswer}`);
    }

    // Question section - options appear, THEN answer on next click
    if (slide.type === 'question' && slide.question) {
      yPos += 0.3;
      animDelay = 0;

      pptSlide.addText('❓ QUESTION', {
        x: 0.5, y: yPos, w: 9, h: 0.35,
        fontSize: 14, bold: true, color: colors.secondary.replace('#', ''), fontFace: 'Arial',
      });
      yPos += 0.45;

      pptSlide.addText(formatPptxText(slide.question.prompt), {
        x: 0.5, y: yPos, w: 9, h: 0.7,
        fontSize: 22, bold: true, color: 'FFFFFF', align: 'left', fontFace: 'Arial',
      });
      yPos += 0.9;

      if (slide.question.options) {
        const ow = 4.3, oh = 0.55;
        slide.question.options.forEach((opt, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          const x = 0.5 + col * 4.5, y = yPos + row * 0.75;

          const bx: AnimatedShapeOpts = {
            x, y, w: ow, h: oh,
            fill: { color: 'FFFFFF', transparency: 92 },
            line: { color: 'FFFFFF', transparency: 80, width: 1 },
            animate: { type: 'appear', delay: animDelay },
          };
          pptSlide.addShape('rect' as pptxgen.ShapeType, bx as pptxgen.ShapeProps);

          const tx: AnimatedTextOpts = {
            x: x + 0.15, y: y + 0.12, w: ow - 0.3, h: oh - 0.2,
            fontSize: 16, color: 'FFFFFF', fontFace: 'Arial', valign: 'middle',
            animate: { type: 'appear', delay: animDelay },
          };
          pptSlide.addText(`${String.fromCharCode(65 + i)}. ${formatPptxText(opt)}`, tx as pptxgen.TextPropsOptions);
          animDelay += 0.3;
        });
        yPos += Math.ceil(slide.question.options.length / 2) * 0.75 + 0.5;
      }

      // Answer reveal - SEPARATE click required
      if (slide.question.answer) {
        yPos += 0.3;

        const ab: AnimatedShapeOpts = {
          x: 0.5, y: yPos, w: 9, h: 0.7,
          fill: { color: '10B981', transparency: 80 },
          line: { color: '10B981', width: 2 },
          animate: { type: 'appear', delay: 0 },
        };
        pptSlide.addShape('rect' as pptxgen.ShapeType, ab as pptxgen.ShapeProps);

        const at: AnimatedTextOpts = {
          x: 0.6, y: yPos + 0.15, w: 8.8, h: 0.4,
          fontSize: 18, bold: true, color: '10B981', fontFace: 'Arial',
          animate: { type: 'appear', delay: 0 },
        };
        pptSlide.addText(`✓ CORRECT ANSWER: ${formatPptxText(slide.question.answer)}`, at as pptxgen.TextPropsOptions);

        if (slide.question.explanation) {
          yPos += 0.85;
          const ex: AnimatedTextOpts = {
            x: 0.5, y: yPos, w: 9, h: 0.5,
            fontSize: 14, italic: true, color: 'AAAAAA', fontFace: 'Arial',
            animate: { type: 'appear', delay: 0 },
          };
          pptSlide.addText(`💡 ${formatPptxText(slide.question.explanation)}`, ex as pptxgen.TextPropsOptions);
        }

        pptSlide.addNotes(`Answer: ${slide.question.answer}\n\n${slide.question.explanation || ''}`);
      }
    }

    if (slide.speakerNotes) {
      pptSlide.addNotes(slide.speakerNotes);
    }
  }

  const fileName = `${presentation.title.replace(/[^a-z0-9]/gi, '_')}_presentation.pptx`;
  await pptx.writeFile({ fileName });
}
