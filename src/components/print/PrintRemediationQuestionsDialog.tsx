import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Lightbulb, QrCode, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QRCodeSVG } from 'qrcode.react';
import { fixEncodingCorruption, renderMathText } from '@/lib/mathRenderer';

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

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  // Handle ESC key to close preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPreview) {
        handleClosePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreview]);

  // Limit to 8 questions for 2-page max
  const displayQuestions = questions.slice(0, 8);
  const useCompactLayout = displayQuestions.length > 4;

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
              Print Practice Worksheet
            </DialogTitle>
            <DialogDescription>
              Create a printable worksheet with {Math.min(questions.length, 8)} questions
              {studentName && ` for ${studentName}`}
              {questions.length > 8 && ` (max 8 for 2-page limit)`}
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
                    Student Name Header
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show student name at the top
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
                    Add scannable QR for tracking
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
                    Show hints for each question
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
                    Show Difficulty
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Display difficulty badges
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
                  <li>{Math.min(questionCounts.scaffolded, 8)} basic question(s)</li>
                )}
                {questionCounts.practice > 0 && (
                  <li>{Math.min(questionCounts.practice, 8)} practice question(s)</li>
                )}
                {questionCounts.challenge > 0 && (
                  <li>{Math.min(questionCounts.challenge, 8)} challenge question(s)</li>
                )}
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

      {/* Print Preview - Using Portal to ensure it renders at document body level */}
      {showPreview && createPortal(
        <div 
          className="fixed inset-0 bg-white overflow-auto print:static print:overflow-visible"
          style={{ zIndex: 99999 }}
        >
          {/* Fixed close button in top-right corner - always visible */}
          <button 
            type="button"
            onClick={handleClosePreview}
            style={{
              position: 'fixed',
              top: '16px',
              right: '16px',
              zIndex: 100000,
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontSize: '24px',
              fontWeight: 'bold',
            }}
            className="print:hidden"
          >
            ✕
          </button>
          
          <div className="print:hidden p-4 bg-gray-100 border-b flex items-center justify-between sticky top-0" style={{ zIndex: 99998 }}>
            <p className="text-sm text-gray-700">Print preview - press Ctrl+P or Cmd+P to print, or press <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">ESC</kbd> to close</p>
            <button 
              type="button"
              onClick={handleClosePreview}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <X className="h-4 w-4" />
              Close Preview
            </button>
          </div>
          
          <div 
            ref={printRef} 
            className="print-worksheet bg-white text-black" 
            style={{ 
              padding: '0.5in 0.75in',
              maxWidth: '8.5in',
              margin: '0 auto',
              boxSizing: 'border-box',
            }}
          >
            {/* Header - Matching Diagnostic Format */}
            <div className="flex items-start justify-between border-b-2 border-black pb-3 mb-4">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                {/* QR Code for Tracking */}
                {includeQRCode && (
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    <QRCodeSVG value={qrCodeData} size={56} level="M" />
                    <p style={{ fontSize: '0.55rem', color: '#666', marginTop: '0.125rem', fontFamily: 'monospace' }}>
                      {worksheetId}
                    </p>
                  </div>
                )}
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{worksheetTitle}</h1>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    {includeStudentHeader && studentName ? (
                      <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {studentName}</p>
                    ) : (
                      <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> ____________________</p>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>
                <p style={{ margin: 0 }}>Date: _______________</p>
                <p style={{ margin: '0.25rem 0 0 0' }}>Period: ____________</p>
                <p style={{ margin: '0.25rem 0 0 0' }}>Score: _____ / {displayQuestions.length}</p>
              </div>
            </div>

            {/* Instructions - Compact */}
            <div style={{ 
              backgroundColor: '#f3f4f6', 
              padding: '0.4rem 0.6rem', 
              borderRadius: '0.25rem',
              marginBottom: '0.75rem',
              fontSize: '0.75rem',
              borderLeft: '3px solid #3b82f6'
            }}>
              <p style={{ margin: 0 }}>
                <strong>Instructions:</strong> Show all work. Circle final answers.
                {includeHints && ' Use hints if needed.'}
              </p>
            </div>

            {/* Questions - Compact Layout */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: useCompactLayout ? 'repeat(2, 1fr)' : '1fr',
              gap: '0.6rem',
            }}>
              {displayQuestions.map((q, index) => (
                <div 
                  key={index} 
                  className="question-block"
                  style={{ 
                    pageBreakInside: 'avoid',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    padding: '0.5rem',
                  }}
                >
                  {/* Question Header - Compact */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem',
                    marginBottom: '0.4rem',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{ 
                      fontWeight: 'bold', 
                      backgroundColor: '#1f2937',
                      color: 'white',
                      width: '1.25rem',
                      height: '1.25rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      flexShrink: 0,
                    }}>
                      {q.questionNumber || index + 1}
                    </span>
                    {includeDifficulty && (
                      <span style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '9999px',
                        fontSize: '0.6rem',
                        fontWeight: '500',
                        backgroundColor: q.difficulty === 'easy' || q.difficulty === 'scaffolded' || q.difficulty === 'super-easy' 
                          ? '#dcfce7' 
                          : q.difficulty === 'medium' || q.difficulty === 'practice'
                            ? '#dbeafe'
                            : '#f3e8ff',
                        color: q.difficulty === 'easy' || q.difficulty === 'scaffolded' || q.difficulty === 'super-easy'
                          ? '#166534'
                          : q.difficulty === 'medium' || q.difficulty === 'practice'
                            ? '#1e40af'
                            : '#6b21a8',
                        border: '1px solid',
                        borderColor: q.difficulty === 'easy' || q.difficulty === 'scaffolded' || q.difficulty === 'super-easy'
                          ? '#86efac'
                          : q.difficulty === 'medium' || q.difficulty === 'practice'
                            ? '#93c5fd'
                            : '#c4b5fd',
                      }}>
                        {getDifficultyLabel(q.difficulty)}
                      </span>
                    )}
                    {q.advancementLevel && (
                      <span style={{
                        padding: '0.1rem 0.3rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.55rem',
                        fontWeight: '600',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        border: '1px solid #93c5fd'
                      }}>
                        Lvl {q.advancementLevel}
                      </span>
                    )}
                  </div>

                  {/* Question Text - Compact */}
                  <p style={{ 
                    fontSize: useCompactLayout ? '0.8rem' : '0.9rem',
                    lineHeight: 1.4,
                    fontFamily: 'Georgia, serif',
                    marginBottom: '0.4rem',
                    wordWrap: 'break-word',
                  }}>
                    {renderMathText(fixEncodingCorruption(q.question))}
                  </p>

                  {/* Hint - Compact */}
                  {includeHints && q.hint && (
                    <div style={{ 
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fcd34d',
                      borderRadius: '0.2rem',
                      padding: '0.2rem 0.4rem',
                      marginBottom: '0.4rem',
                      fontSize: '0.65rem',
                    }}>
                      <span style={{ fontWeight: '600', color: '#92400e' }}>💡 </span>
                      <span style={{ color: '#78350f', fontStyle: 'italic' }}>
                        {renderMathText(fixEncodingCorruption(q.hint))}
                      </span>
                    </div>
                  )}

                  {/* Answer Box - Compact */}
                  <div style={{ 
                    border: '1.5px solid #d1d5db',
                    borderRadius: '0.2rem',
                    padding: '0.4rem',
                    minHeight: useCompactLayout ? '50px' : '70px',
                    backgroundColor: '#fafafa',
                  }}>
                    <p style={{ fontSize: '0.6rem', color: '#9ca3af', margin: 0 }}>
                      Work:
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Truncation notice */}
            {questions.length > 8 && (
              <p style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.7rem', 
                color: '#6b7280',
                textAlign: 'center',
                fontStyle: 'italic',
              }}>
                Showing 8 of {questions.length} questions (2-page limit)
              </p>
            )}

            {/* Footer - Compact */}
            <div style={{ 
              marginTop: '0.75rem',
              paddingTop: '0.4rem',
              borderTop: '1px solid #d1d5db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.65rem',
              color: '#9ca3af',
            }}>
              <span>{studentName || 'Student'} • {worksheetTitle}</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Print Styles */}
          <style>{`
            @media print {
              @page {
                size: letter;
                margin: 0.5in;
              }
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              .print\\:hidden { display: none !important; }
              .print-worksheet {
                page-break-after: avoid;
              }
              .question-block {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          `}</style>
        </div>,
        document.body
      )}
    </>
  );
}
