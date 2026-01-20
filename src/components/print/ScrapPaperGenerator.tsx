import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { FileText, Download, Printer, Grid3X3, SquareStack } from 'lucide-react';
import jsPDF from 'jspdf';
import { sanitizeForPDF } from '@/lib/mathRenderer';

interface ScrapPaperGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problemNumbers?: number[];
  worksheetTitle?: string;
  studentName?: string;
}

type PaperLayout = 'single' | 'split-2' | 'split-4';
type GridStyle = 'lined' | 'grid' | 'blank';

export function ScrapPaperGenerator({
  open,
  onOpenChange,
  problemNumbers = [],
  worksheetTitle = '',
  studentName = '',
}: ScrapPaperGeneratorProps) {
  const [layout, setLayout] = useState<PaperLayout>('single');
  const [gridStyle, setGridStyle] = useState<GridStyle>('lined');
  const [includeProblemLabels, setIncludeProblemLabels] = useState(true);
  const [includeCornerMarkers, setIncludeCornerMarkers] = useState(true);
  const [numberOfPages, setNumberOfPages] = useState(1);
  const [customProblemCount, setCustomProblemCount] = useState(problemNumbers.length || 5);

  // Get problem numbers to use
  const effectiveProblemNumbers = problemNumbers.length > 0 
    ? problemNumbers 
    : Array.from({ length: customProblemCount }, (_, i) => i + 1);

  const generatePDF = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);

    // Determine zones per page based on layout
    const zonesPerPage = layout === 'single' ? 1 : layout === 'split-2' ? 2 : 4;
    
    // Calculate how many pages we need for all problems
    const totalProblems = effectiveProblemNumbers.length;
    const pagesNeeded = Math.max(numberOfPages, Math.ceil(totalProblems / zonesPerPage));

    let problemIndex = 0;

    for (let page = 0; page < pagesNeeded; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      let yPos = margin;

      // Header
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 95);
      pdf.text(sanitizeForPDF(worksheetTitle || 'Scrap Paper'), pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;

      // Subheader with page info
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Page ${page + 1} of ${pagesNeeded} | AI-Optimized Work Zones`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;

      // Name/Date line
      pdf.setFontSize(10);
      pdf.setTextColor(0);
      pdf.text(sanitizeForPDF(`Name: ${studentName || '_____________________'}`), margin, yPos);
      pdf.text(`Date: ___________`, pageWidth - margin - 40, yPos);
      yPos += 8;

      // Instructions banner
      pdf.setFillColor(236, 253, 245); // #ecfdf5
      pdf.setDrawColor(110, 231, 183); // #6ee7b7
      pdf.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'FD');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(4, 120, 87); // #047857
      pdf.text('[!] INSTRUCTIONS:', margin + 3, yPos + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Keep all work within the designated zones for AI scanning. Write clearly and stay inside the boxes.', margin + 30, yPos + 5);
      yPos += 12;

      const availableHeight = pageHeight - yPos - margin;

      // Draw work zones based on layout
      if (layout === 'single') {
        const zoneHeight = availableHeight;
        const problemNum = effectiveProblemNumbers[problemIndex] || (problemIndex + 1);
        drawWorkZone(pdf, margin, yPos, contentWidth, zoneHeight, problemNum, gridStyle, includeCornerMarkers, includeProblemLabels);
        problemIndex++;
      } else if (layout === 'split-2') {
        const zoneHeight = (availableHeight - 5) / 2;
        for (let i = 0; i < 2 && problemIndex < effectiveProblemNumbers.length; i++) {
          const problemNum = effectiveProblemNumbers[problemIndex] || (problemIndex + 1);
          drawWorkZone(pdf, margin, yPos + (i * (zoneHeight + 5)), contentWidth, zoneHeight, problemNum, gridStyle, includeCornerMarkers, includeProblemLabels);
          problemIndex++;
        }
      } else if (layout === 'split-4') {
        const zoneWidth = (contentWidth - 5) / 2;
        const zoneHeight = (availableHeight - 5) / 2;
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2 && problemIndex < effectiveProblemNumbers.length; col++) {
            const problemNum = effectiveProblemNumbers[problemIndex] || (problemIndex + 1);
            const x = margin + (col * (zoneWidth + 5));
            const y = yPos + (row * (zoneHeight + 5));
            drawWorkZone(pdf, x, y, zoneWidth, zoneHeight, problemNum, gridStyle, includeCornerMarkers, includeProblemLabels);
            problemIndex++;
          }
        }
      }
    }

    // Download PDF
    const filename = worksheetTitle 
      ? `${sanitizeForPDF(worksheetTitle).replace(/\s+/g, '_')}_scrap_paper.pdf`
      : 'scrap_paper.pdf';
    pdf.save(filename);
    onOpenChange(false);
  };

  const printPDF = () => {
    generatePDF();
    // The browser's print dialog will open automatically after download
    // Users can print from there
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate AI-Optimized Scrap Paper
          </DialogTitle>
          <DialogDescription>
            Create scrap paper with designated work zones that the AI can easily scan and associate with specific problems.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Layout Selection */}
          <div className="space-y-2">
            <Label>Page Layout</Label>
            <Select value={layout} onValueChange={(v) => setLayout(v as PaperLayout)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">
                  <div className="flex items-center gap-2">
                    <SquareStack className="h-4 w-4" />
                    Full Page (1 problem per page)
                  </div>
                </SelectItem>
                <SelectItem value="split-2">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Split (2 problems per page)
                  </div>
                </SelectItem>
                <SelectItem value="split-4">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Quad (4 problems per page)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grid Style */}
          <div className="space-y-2">
            <Label>Work Area Style</Label>
            <Select value={gridStyle} onValueChange={(v) => setGridStyle(v as GridStyle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lined">Lined Paper</SelectItem>
                <SelectItem value="grid">Graph Paper (Grid)</SelectItem>
                <SelectItem value="blank">Blank</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Problem Count (if no problems provided) */}
          {problemNumbers.length === 0 && (
            <div className="space-y-2">
              <Label>Number of Problems</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[customProblemCount]}
                  onValueChange={(v) => setCustomProblemCount(v[0])}
                  min={1}
                  max={20}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">{customProblemCount}</span>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="problem-labels" className="text-sm font-medium">Problem Labels</Label>
                <p className="text-xs text-muted-foreground">Show "Problem #X" headers on each zone</p>
              </div>
              <Switch
                id="problem-labels"
                checked={includeProblemLabels}
                onCheckedChange={setIncludeProblemLabels}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="corner-markers" className="text-sm font-medium">AI Corner Markers</Label>
                <p className="text-xs text-muted-foreground">Include corner markers for AI zone detection</p>
              </div>
              <Switch
                id="corner-markers"
                checked={includeCornerMarkers}
                onCheckedChange={setIncludeCornerMarkers}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Summary</p>
            <p className="text-xs text-muted-foreground mt-1">
              {effectiveProblemNumbers.length} problem zone{effectiveProblemNumbers.length !== 1 ? 's' : ''} • 
              {layout === 'single' ? ' 1 per page' : layout === 'split-2' ? ' 2 per page' : ' 4 per page'} • 
              {gridStyle === 'lined' ? ' Lined' : gridStyle === 'grid' ? ' Graph paper' : ' Blank'}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generatePDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to draw a work zone
function drawWorkZone(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  problemNumber: number,
  gridStyle: GridStyle,
  includeCornerMarkers: boolean,
  includeProblemLabels: boolean
) {
  // Main container border (navy blue)
  pdf.setDrawColor(30, 58, 95); // #1e3a5f
  pdf.setLineWidth(0.8);
  pdf.rect(x, y, width, height);

  // Work area background
  pdf.setFillColor(248, 250, 252); // #f8fafc light gray
  pdf.rect(x + 0.4, y + 0.4, width - 0.8, height - 0.8, 'F');

  // Problem label header
  if (includeProblemLabels) {
    const headerHeight = 8;
    pdf.setFillColor(224, 242, 254); // #e0f2fe light blue
    pdf.rect(x + 0.4, y + 0.4, width - 0.8, headerHeight, 'F');
    
    // Problem number badge
    pdf.setFillColor(30, 58, 95);
    pdf.roundedRect(x + 3, y + 2, 28, 5, 1, 1, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(`PROBLEM #${problemNumber}`, x + 5, y + 5.5);

    // Instructions
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 116, 139); // #64748b
    pdf.text('Show all work within this zone', x + width - 38, y + 5.5);
    pdf.setTextColor(0);

    // Separator line
    pdf.setDrawColor(148, 163, 184); // #94a3b8
    pdf.setLineWidth(0.3);
    pdf.line(x, y + headerHeight, x + width, y + headerHeight);
  }

  const contentStartY = includeProblemLabels ? y + 10 : y + 2;
  const contentEndY = y + height - 15; // Leave room for final answer section
  const contentHeight = contentEndY - contentStartY;

  // Grid/lines based on style
  if (gridStyle === 'lined') {
    pdf.setDrawColor(203, 213, 225); // #cbd5e1
    pdf.setLineWidth(0.15);
    const lineSpacing = 6;
    for (let lineY = contentStartY + lineSpacing; lineY < contentEndY; lineY += lineSpacing) {
      pdf.line(x + 3, lineY, x + width - 3, lineY);
    }
  } else if (gridStyle === 'grid') {
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.1);
    const gridSize = 5;
    // Horizontal lines
    for (let lineY = contentStartY + gridSize; lineY < contentEndY; lineY += gridSize) {
      pdf.line(x + 2, lineY, x + width - 2, lineY);
    }
    // Vertical lines
    for (let lineX = x + gridSize + 2; lineX < x + width - 2; lineX += gridSize) {
      pdf.line(lineX, contentStartY, lineX, contentEndY);
    }
  }

  // Corner markers for AI zone detection
  if (includeCornerMarkers) {
    pdf.setDrawColor(30, 58, 95);
    pdf.setLineWidth(0.5);
    const markerSize = 5;
    const markerOffset = includeProblemLabels ? 10 : 2;

    // Top-left
    pdf.line(x + 2, y + markerOffset, x + 2, y + markerOffset + markerSize);
    pdf.line(x + 2, y + markerOffset, x + 2 + markerSize, y + markerOffset);

    // Top-right
    pdf.line(x + width - 2, y + markerOffset, x + width - 2, y + markerOffset + markerSize);
    pdf.line(x + width - 2, y + markerOffset, x + width - 2 - markerSize, y + markerOffset);

    // Bottom-left (above answer section)
    pdf.line(x + 2, contentEndY - 2, x + 2, contentEndY - 2 - markerSize);
    pdf.line(x + 2, contentEndY - 2, x + 2 + markerSize, contentEndY - 2);

    // Bottom-right (above answer section)
    pdf.line(x + width - 2, contentEndY - 2, x + width - 2, contentEndY - 2 - markerSize);
    pdf.line(x + width - 2, contentEndY - 2, x + width - 2 - markerSize, contentEndY - 2);
  }

  // Final Answer Section
  const answerSectionHeight = 12;
  const answerY = y + height - answerSectionHeight - 2;

  // Answer section separator
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineDashPattern([2, 2], 0);
  pdf.setLineWidth(0.3);
  pdf.line(x + 2, answerY, x + width - 2, answerY);
  pdf.setLineDashPattern([], 0);

  // Answer section background (amber)
  pdf.setFillColor(254, 243, 199); // #fef3c7
  pdf.rect(x + 0.4, answerY + 0.5, width - 0.8, answerSectionHeight, 'F');

  // Answer section top border
  pdf.setDrawColor(245, 158, 11); // #f59e0b
  pdf.setLineWidth(0.5);
  pdf.line(x, answerY + 0.5, x + width, answerY + 0.5);

  // Final Answer badge
  pdf.setFillColor(253, 230, 138); // #fde68a
  pdf.roundedRect(x + 3, answerY + 2.5, 25, 5, 1, 1, 'F');
  pdf.setDrawColor(245, 158, 11);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x + 3, answerY + 2.5, 25, 5, 1, 1, 'S');
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(146, 64, 14); // #92400e
  pdf.text(`ANSWER #${problemNumber}`, x + 4.5, answerY + 6);

  // Answer line
  pdf.setDrawColor(217, 119, 6); // #d97706
  pdf.setLineWidth(0.4);
  pdf.line(x + 30, answerY + 8, x + width - 5, answerY + 8);

  pdf.setTextColor(0);
}

// Button component to trigger the dialog
interface ScrapPaperButtonProps {
  problemNumbers?: number[];
  worksheetTitle?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ScrapPaperButton({
  problemNumbers = [],
  worksheetTitle = '',
  variant = 'outline',
  size = 'default',
}: ScrapPaperButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <FileText className="h-4 w-4 mr-2" />
        Scrap Paper
      </Button>
      <ScrapPaperGenerator
        open={open}
        onOpenChange={setOpen}
        problemNumbers={problemNumbers}
        worksheetTitle={worksheetTitle}
      />
    </>
  );
}
