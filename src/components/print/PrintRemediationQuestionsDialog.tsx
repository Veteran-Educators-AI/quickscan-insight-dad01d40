import { useState, useRef } from 'react';
import { Printer, Lightbulb, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QRCodeSVG } from 'qrcode.react';

interface RemediationQuestion {
  questionNumber: number;
  question: string;
  targetMisconception?: string;
  difficulty: 'scaffolded' | 'practice' | 'challenge' | 'medium' | 'hard' | 'challenging' | 'easy' | 'super-easy';
  hint?: string;
  answer?: string;
  topic?: string;
  standard?: string;
  bloomLevel?: string;
  advancementLevel?: string;
}

interface PrintRemediationQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: RemediationQuestion[];
  studentName?: string;
  studentId?: string;
  topicName?: string;
}

export function PrintRemediationQuestionsDialog({
  open,
  onOpenChange,
  questions,
  studentName,
  studentId,
  topicName,
}: PrintRemediationQuestionsDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [worksheetTitle, setWorksheetTitle] = useState(topicName ? `${topicName} - Practice` : 'Practice Worksheet');
  const [includeHints, setIncludeHints] = useState(true);
  const [includeDifficulty, setIncludeDifficulty] = useState(true);
  const [includeQRCode, setIncludeQRCode] = useState(true);
  const [includeStudentHeader, setIncludeStudentHeader] = useState(true);

  // Generate unique worksheet ID for QR code
  const worksheetId = `WS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const qrCodeData = JSON.stringify({
    worksheetId,
    studentName,
    studentId,
    topic: topicName,
    timestamp: new Date().toISOString(),
    questionCount: questions.length,
  });

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'scaffolded': return 'Step-by-Step';
      case 'practice': return 'Practice';
      case 'challenge': return 'Challenge';
      case 'super-easy': return 'Warm-Up';
      case 'easy': return 'Basic';
      case 'medium': return 'Standard';
      case 'hard': return 'Advanced';
      case 'challenging': return 'Challenge';
      default: return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'scaffolded':
      case 'super-easy':
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'practice':
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'challenge':
      case 'hard':
      case 'challenging':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  // Group questions by difficulty for summary
  const questionCounts = {
    scaffolded: questions.filter(q => ['scaffolded', 'super-easy', 'easy'].includes(q.difficulty)).length,
    practice: questions.filter(q => ['practice', 'medium'].includes(q.difficulty)).length,
    challenge: questions.filter(q => ['challenge', 'hard', 'challenging'].includes(q.difficulty)).length,
  };

  return (
    <>
      <Dialog open={open && !showPreview} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Print Personalized Worksheet
            </DialogTitle>
            <DialogDescription>
              Create a printable worksheet with {questions.length} questions
              {studentName && ` for ${studentName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Worksheet Title */}
            <div className="space-y-2">
              <Label htmlFor="worksheetTitle">Worksheet Title</Label>
              <Input
                id="worksheetTitle"
                value={worksheetTitle}
                onChange={(e) => setWorksheetTitle(e.target.value)}
                placeholder="Enter worksheet title"
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="student-header-toggle" className="cursor-pointer">
                    Personalized Student Header
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show student name prominently at the top
                  </p>
                </div>
                <Switch
                  id="student-header-toggle"
                  checked={includeStudentHeader}
                  onCheckedChange={setIncludeStudentHeader}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="qr-toggle" className="flex items-center gap-2 cursor-pointer">
                    <QrCode className="h-4 w-4 text-primary" />
                    Include QR Code
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add scannable QR code for easy tracking
                  </p>
                </div>
                <Switch
                  id="qr-toggle"
                  checked={includeQRCode}
                  onCheckedChange={setIncludeQRCode}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="hints-toggle" className="flex items-center gap-2 cursor-pointer">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Include Hints
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show helpful hints for each question
                  </p>
                </div>
                <Switch
                  id="hints-toggle"
                  checked={includeHints}
                  onCheckedChange={setIncludeHints}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="difficulty-toggle" className="cursor-pointer">
                    Show Difficulty Levels
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Display difficulty badges on each question
                  </p>
                </div>
                <Switch
                  id="difficulty-toggle"
                  checked={includeDifficulty}
                  onCheckedChange={setIncludeDifficulty}
                />
              </div>
            </div>

            {/* Preview Summary */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium">Worksheet includes:</p>
              <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1">
                {questionCounts.scaffolded > 0 && (
                  <li>{questionCounts.scaffolded} basic/scaffolded question(s)</li>
                )}
                {questionCounts.practice > 0 && (
                  <li>{questionCounts.practice} practice question(s)</li>
                )}
                {questionCounts.challenge > 0 && (
                  <li>{questionCounts.challenge} challenge question(s)</li>
                )}
                {includeQRCode && <li>Tracking QR code</li>}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Worksheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto print:static print:overflow-visible">
          <div className="print:hidden p-4 bg-muted border-b flex items-center justify-between">
            <p>Print preview - press Ctrl+P or Cmd+P to print</p>
            <Button variant="outline" onClick={handleClosePreview}>
              Close Preview
            </Button>
          </div>
          
          <div ref={printRef} className="remediation-questions-worksheet bg-white text-black" style={{
            padding: '0.5in 0.75in',
            maxWidth: '8.5in',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}>
            {/* Personalized Header with QR Code */}
            <div style={{ 
              borderBottom: '3px solid #1f2937', 
              paddingBottom: '1rem', 
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div style={{ flex: 1 }}>
                {/* Student Name Banner */}
                {includeStudentHeader && studentName && (
                  <div style={{
                    backgroundColor: '#1f2937',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '0.75rem',
                    display: 'inline-block',
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold',
                      letterSpacing: '0.5px'
                    }}>
                      📝 {studentName}'s Worksheet
                    </p>
                  </div>
                )}
                
                <h1 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 'bold', 
                  margin: includeStudentHeader && studentName ? '0.5rem 0 0 0' : 0,
                  color: '#374151'
                }}>
                  {worksheetTitle}
                </h1>
                
                {!includeStudentHeader && studentName && (
                  <p style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
                    <strong>Name:</strong> {studentName}
                  </p>
                )}
                
                <div style={{ 
                  marginTop: '0.75rem', 
                  display: 'flex', 
                  gap: '1.5rem',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  <span>Date: _______________</span>
                  <span>Period: ____________</span>
                  <span>Score: ______ / {questions.length}</span>
                </div>
              </div>
              
              {/* QR Code Section */}
              {includeQRCode && (
                <div style={{ 
                  textAlign: 'center',
                  marginLeft: '1rem',
                  padding: '0.5rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f9fafb',
                }}>
                  <QRCodeSVG 
                    value={qrCodeData} 
                    size={80}
                    level="M"
                    includeMargin={false}
                  />
                  <p style={{ 
                    fontSize: '0.65rem', 
                    color: '#9ca3af', 
                    margin: '0.25rem 0 0 0',
                    fontFamily: 'monospace'
                  }}>
                    {worksheetId}
                  </p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div style={{ 
              backgroundColor: '#f3f4f6', 
              padding: '0.75rem 1rem', 
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              borderLeft: '4px solid #3b82f6'
            }}>
              <p style={{ margin: 0 }}>
                <strong>Instructions:</strong> Show all your work for each problem. 
                {includeHints && ' Use the hints provided if you need help.'}
                {' Circle your final answer.'}
              </p>
            </div>

            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {questions.map((q, index) => (
                <div 
                  key={index} 
                  className="question-block"
                  style={{ 
                    pageBreakInside: 'avoid',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                  }}
                >
                  {/* Question Header */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    marginBottom: '0.75rem' 
                  }}>
                    <span style={{ 
                      fontWeight: 'bold', 
                      backgroundColor: '#1f2937',
                      color: 'white',
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem'
                    }}>
                      {q.questionNumber || index + 1}
                    </span>
                    {includeDifficulty && (
                      <span className={getDifficultyColor(q.difficulty)} style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        border: '1px solid'
                      }}>
                        {getDifficultyLabel(q.difficulty)}
                      </span>
                    )}
                    {q.advancementLevel && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        border: '1px solid #93c5fd'
                      }}>
                        Level {q.advancementLevel}
                      </span>
                    )}
                  </div>

                  {/* Question Text */}
                  <p style={{ 
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    fontFamily: 'Georgia, serif',
                    marginBottom: '0.75rem',
                  }}>
                    {q.question}
                  </p>

                  {/* Hint */}
                  {includeHints && q.hint && (
                    <div style={{ 
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fcd34d',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      marginBottom: '0.75rem',
                      fontSize: '0.875rem',
                    }}>
                      <span style={{ fontWeight: '600', color: '#92400e' }}>💡 Hint: </span>
                      <span style={{ color: '#78350f', fontStyle: 'italic' }}>{q.hint}</span>
                    </div>
                  )}

                  {/* Answer Box */}
                  <div style={{ 
                    border: '2px solid #d1d5db',
                    borderRadius: '0.25rem',
                    padding: '1rem',
                    minHeight: '120px',
                  }}>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                      Show your work:
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ 
              marginTop: '2rem',
              paddingTop: '1rem',
              borderTop: '2px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#6b7280',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {includeQRCode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <QRCodeSVG value={qrCodeData} size={40} level="L" />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>{worksheetId}</span>
                  </div>
                )}
                <span style={{ fontWeight: '500' }}>{studentName || 'Student'}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span>{worksheetTitle}</span>
                <span style={{ marginLeft: '1rem' }}>
                  Generated: {new Date().toLocaleDateString()}
                </span>
              </div>
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
          .remediation-questions-worksheet, .remediation-questions-worksheet * {
            visibility: visible;
          }
          .remediation-questions-worksheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 8.5in;
          }
          @page {
            size: letter;
            margin: 0.5in 0.75in;
          }
          .question-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}
