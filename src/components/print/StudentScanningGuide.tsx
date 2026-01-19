import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Printer, CheckCircle, XCircle, Target, PenLine } from "lucide-react";
import { useRef } from "react";

export function StudentScanningGuide() {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Scanning Guide</title>
          <style>
            @page { margin: 0.5in; size: letter; }
            body { 
              font-family: 'Segoe UI', system-ui, sans-serif; 
              margin: 0; 
              padding: 20px;
              color: #1a1a1a;
            }
            .guide-container { max-width: 100%; }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #2563eb; 
              padding-bottom: 12px; 
              margin-bottom: 16px;
            }
            .header h1 { 
              font-size: 24px; 
              margin: 0 0 4px 0; 
              color: #1e40af;
            }
            .header p { 
              font-size: 14px; 
              margin: 0; 
              color: #6b7280;
            }
            .section { 
              margin-bottom: 16px; 
              page-break-inside: avoid;
            }
            .section-title { 
              font-size: 16px; 
              font-weight: 700; 
              color: #1e40af;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .do-dont-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .do-box, .dont-box {
              border: 2px solid;
              border-radius: 8px;
              padding: 12px;
            }
            .do-box { 
              border-color: #22c55e; 
              background: #f0fdf4;
            }
            .dont-box { 
              border-color: #ef4444; 
              background: #fef2f2;
            }
            .box-title {
              font-weight: 700;
              font-size: 14px;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .do-box .box-title { color: #16a34a; }
            .dont-box .box-title { color: #dc2626; }
            .box-list {
              font-size: 12px;
              margin: 0;
              padding-left: 16px;
            }
            .box-list li { margin-bottom: 4px; }
            .example-worksheet {
              border: 2px solid #d1d5db;
              border-radius: 8px;
              padding: 12px;
              background: #fafafa;
            }
            .example-question {
              border: 1px solid #9ca3af;
              border-radius: 4px;
              padding: 8px;
              margin-bottom: 8px;
              background: white;
            }
            .question-text {
              font-size: 11px;
              font-weight: 600;
              margin-bottom: 6px;
              color: #374151;
            }
            .zones-row {
              display: flex;
              gap: 8px;
            }
            .work-zone {
              flex: 2;
              border: 2px dashed #3b82f6;
              border-radius: 4px;
              padding: 8px;
              min-height: 60px;
              background: #eff6ff;
              position: relative;
            }
            .work-zone::before {
              content: "WORK AREA";
              position: absolute;
              top: 2px;
              left: 4px;
              font-size: 8px;
              font-weight: 700;
              color: #2563eb;
            }
            .answer-zone {
              flex: 1;
              border: 2px solid #f59e0b;
              border-radius: 4px;
              padding: 8px;
              min-height: 60px;
              background: #fef3c7;
              position: relative;
            }
            .answer-zone::before {
              content: "FINAL ANSWER";
              position: absolute;
              top: 2px;
              left: 4px;
              font-size: 8px;
              font-weight: 700;
              color: #d97706;
            }
            .zone-content {
              font-size: 10px;
              color: #6b7280;
              margin-top: 14px;
              font-style: italic;
            }
            .tips-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
            }
            .tip-card {
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 10px;
              background: white;
              text-align: center;
            }
            .tip-icon {
              font-size: 24px;
              margin-bottom: 4px;
            }
            .tip-text {
              font-size: 11px;
              color: #374151;
            }
            .footer {
              margin-top: 16px;
              padding-top: 12px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              font-size: 11px;
              color: #6b7280;
            }
            .highlight { 
              background: #fef08a; 
              padding: 0 2px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Student Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Student Scanning Guide
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-4">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Guide
          </Button>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="guide-container">
          <div className="header">
            <h1>📋 How to Write Your Answers for Best Results</h1>
            <p>Follow these guidelines so your work gets graded accurately!</p>
          </div>

          {/* Do's and Don'ts */}
          <div className="section">
            <div className="section-title">
              <span>✅ Do's and ❌ Don'ts</span>
            </div>
            <div className="do-dont-grid">
              <div className="do-box">
                <div className="box-title">
                  <span style={{ color: '#22c55e' }}>✓</span> DO This
                </div>
                <ul className="box-list">
                  <li>Write <strong>all your work</strong> inside the blue "Work Area" box</li>
                  <li>Put your <strong>final answer</strong> in the yellow "Final Answer" box</li>
                  <li>Write <strong>clearly and legibly</strong></li>
                  <li>Show your <strong>steps in order</strong> from top to bottom</li>
                  <li>Circle or box your final answer</li>
                  <li>Keep work for each question in its own area</li>
                </ul>
              </div>
              <div className="dont-box">
                <div className="box-title">
                  <span style={{ color: '#ef4444' }}>✗</span> DON'T Do This
                </div>
                <ul className="box-list">
                  <li>Don't write outside the boxes</li>
                  <li>Don't write work in the margins</li>
                  <li>Don't squeeze multiple answers together</li>
                  <li>Don't write over printed text</li>
                  <li>Don't use very light pencil marks</li>
                  <li>Don't cross out work without rewriting clearly</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Example Worksheet */}
          <div className="section">
            <div className="section-title">
              <span>📝 Example: How Your Worksheet Looks</span>
            </div>
            <div className="example-worksheet">
              <div className="example-question">
                <div className="question-text">Q1: Solve for x: 2x + 5 = 13</div>
                <div className="zones-row">
                  <div className="work-zone">
                    <div className="zone-content">
                      Write your steps here:<br/>
                      2x + 5 = 13<br/>
                      2x = 13 - 5<br/>
                      2x = 8<br/>
                      x = 4
                    </div>
                  </div>
                  <div className="answer-zone">
                    <div className="zone-content">
                      <strong style={{ fontSize: '14px', color: '#1a1a1a' }}>x = 4</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="example-question">
                <div className="question-text">Q2: Find the area of a rectangle with length 8 and width 5</div>
                <div className="zones-row">
                  <div className="work-zone">
                    <div className="zone-content">
                      Area = length × width<br/>
                      Area = 8 × 5<br/>
                      Area = 40
                    </div>
                  </div>
                  <div className="answer-zone">
                    <div className="zone-content">
                      <strong style={{ fontSize: '14px', color: '#1a1a1a' }}>40 square units</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="section">
            <div className="section-title">
              <span>💡 Quick Tips for Best Results</span>
            </div>
            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-icon">✍️</div>
                <div className="tip-text"><strong>Write Dark</strong><br/>Use pen or dark pencil so your work is easy to read</div>
              </div>
              <div className="tip-card">
                <div className="tip-icon">📏</div>
                <div className="tip-text"><strong>Stay in Bounds</strong><br/>Keep all work inside the designated boxes</div>
              </div>
              <div className="tip-card">
                <div className="tip-icon">🎯</div>
                <div className="tip-text"><strong>Final Answer Clear</strong><br/>Make your answer stand out - circle it!</div>
              </div>
              <div className="tip-card">
                <div className="tip-icon">📐</div>
                <div className="tip-text"><strong>Show Your Steps</strong><br/>Each step on a new line, top to bottom</div>
              </div>
              <div className="tip-card">
                <div className="tip-icon">🚫</div>
                <div className="tip-text"><strong>No Margins</strong><br/>Don't write in the page margins or edges</div>
              </div>
              <div className="tip-card">
                <div className="tip-icon">🔢</div>
                <div className="tip-text"><strong>One Question = One Box</strong><br/>Never mix answers from different questions</div>
              </div>
            </div>
          </div>

          {/* Zones Explanation */}
          <div className="section">
            <div className="section-title">
              <span>🎨 Understanding the Zones</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, padding: '10px', border: '2px dashed #3b82f6', borderRadius: '6px', background: '#eff6ff' }}>
                <div style={{ fontWeight: 700, color: '#2563eb', marginBottom: '4px', fontSize: '13px' }}>🔵 Blue Dashed = WORK AREA</div>
                <div style={{ fontSize: '11px', color: '#374151' }}>
                  This is where you show ALL your work, calculations, and steps. 
                  The AI scans this area to understand your problem-solving process.
                </div>
              </div>
              <div style={{ flex: 1, padding: '10px', border: '2px solid #f59e0b', borderRadius: '6px', background: '#fef3c7' }}>
                <div style={{ fontWeight: 700, color: '#d97706', marginBottom: '4px', fontSize: '13px' }}>🟡 Yellow Solid = FINAL ANSWER</div>
                <div style={{ fontSize: '11px', color: '#374151' }}>
                  Put ONLY your final answer here. Keep it clean and clear. 
                  The AI looks here first to check if your answer is correct.
                </div>
              </div>
            </div>
          </div>

          <div className="footer">
            <strong>Remember:</strong> Clear work in the right place = accurate grading! 
            If you're unsure where to write, always use the designated boxes.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
