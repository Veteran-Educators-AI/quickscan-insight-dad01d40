import { useState, useRef } from 'react';
import { Download, Printer, FileText, X, Plus, Minus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

export interface WorksheetQuestion {
  id: string;
  topicName: string;
  standard: string;
  jmapUrl: string;
  subject: string;
  category: string;
}

interface WorksheetBuilderProps {
  selectedQuestions: WorksheetQuestion[];
  onRemoveQuestion: (id: string) => void;
  onClearAll: () => void;
}

export function WorksheetBuilder({ selectedQuestions, onRemoveQuestion, onClearAll }: WorksheetBuilderProps) {
  const { toast } = useToast();
  const [worksheetTitle, setWorksheetTitle] = useState('Math Practice Worksheet');
  const [teacherName, setTeacherName] = useState('');
  const [showAnswerLines, setShowAnswerLines] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: 'No questions selected',
        description: 'Please select at least one topic to include in your worksheet.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(worksheetTitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      if (teacherName) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Teacher: ${teacherName}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }

      // Student info line
      pdf.setFontSize(11);
      pdf.text('Name: _______________________   Date: ___________   Period: _____', margin, yPosition);
      yPosition += 15;

      // Separator
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);

      // Questions
      pdf.setFontSize(11);
      selectedQuestions.forEach((question, index) => {
        // Check if we need a new page
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = margin;
        }

        // Question number and topic
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${question.topicName}`, margin, yPosition);
        yPosition += 6;

        // Standard reference
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(`Standard: ${question.standard} | JMAP: ${question.jmapUrl}`, margin + 5, yPosition);
        pdf.setTextColor(0);
        pdf.setFontSize(11);
        yPosition += 8;

        // Work area
        if (showAnswerLines) {
          pdf.setDrawColor(200);
          pdf.setLineWidth(0.2);
          for (let i = 0; i < 4; i++) {
            pdf.line(margin + 5, yPosition + (i * 8), pageWidth - margin, yPosition + (i * 8));
          }
          yPosition += 35;
        } else {
          yPosition += 15;
        }
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text('Generated with Scan Genius - NYS Regents Aligned', pageWidth / 2, 270, { align: 'center' });

      // Download
      pdf.save(`${worksheetTitle.replace(/\s+/g, '_')}.pdf`);

      toast({
        title: 'Worksheet downloaded!',
        description: `Your worksheet with ${selectedQuestions.length} question(s) has been saved.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate worksheet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: 'No questions selected',
        description: 'Please select at least one topic to print.',
        variant: 'destructive',
      });
      return;
    }
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (selectedQuestions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-lg mb-2">Worksheet Builder</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Select topics from the list to add them to your worksheet. Click the + button next to any topic.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Worksheet Builder</CardTitle>
            <Badge variant="secondary">{selectedQuestions.length} topic(s)</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm">Worksheet Title</Label>
              <Input
                id="title"
                value={worksheetTitle}
                onChange={(e) => setWorksheetTitle(e.target.value)}
                placeholder="Enter worksheet title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacher" className="text-sm">Teacher Name (optional)</Label>
              <Input
                id="teacher"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="answerLines"
                checked={showAnswerLines}
                onChange={(e) => setShowAnswerLines(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="answerLines" className="text-sm cursor-pointer">
                Include answer lines
              </Label>
            </div>
          </div>

          <Separator />

          {/* Selected Questions */}
          <div className="space-y-2">
            <Label className="text-sm">Selected Topics</Label>
            <ScrollArea className="h-40 rounded-md border p-2">
              {selectedQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded-md group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground w-5">{index + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{question.topicName}</p>
                      <p className="text-xs text-muted-foreground">{question.standard}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => onRemoveQuestion(question.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={generatePDF}
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={onClearAll}
          >
            Clear All
          </Button>
        </CardContent>
      </Card>

      {/* Print Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto print:static print:overflow-visible">
          <div className="print:hidden p-4 bg-muted border-b flex items-center justify-between">
            <p>Print preview - press Ctrl+P or Cmd+P to print</p>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </div>
          <div ref={printRef} className="p-8 max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">{worksheetTitle}</h1>
              {teacherName && <p className="text-muted-foreground mt-1">Teacher: {teacherName}</p>}
            </div>
            <div className="flex justify-between text-sm mb-6 border-b pb-4">
              <span>Name: _______________________</span>
              <span>Date: ___________</span>
              <span>Period: _____</span>
            </div>
            <div className="space-y-8">
              {selectedQuestions.map((question, index) => (
                <div key={question.id} className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold">{index + 1}.</span>
                    <span className="font-medium">{question.topicName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-5">
                    Standard: {question.standard} | 
                    <a href={question.jmapUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
                      JMAP Resource
                    </a>
                  </p>
                  {showAnswerLines && (
                    <div className="ml-5 mt-4 space-y-3">
                      {[1, 2, 3, 4].map((line) => (
                        <div key={line} className="border-b border-gray-300" style={{ height: '24px' }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-12 text-center text-xs text-muted-foreground">
              Generated with Scan Genius - NYS Regents Aligned
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-worksheet, .print-worksheet * {
            visibility: visible;
          }
          @page {
            margin: 0.75in;
          }
        }
      `}</style>
    </>
  );
}
