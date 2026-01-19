import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Presentation, Printer } from "lucide-react";
import { useRef } from "react";

export function ClassroomScanningPoster() {
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
          <title>Classroom Scanning Poster</title>
          <style>
            @page { margin: 0; size: letter landscape; }
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', system-ui, sans-serif; 
              margin: 0; 
              padding: 0;
              background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .poster {
              width: 10.5in;
              height: 8in;
              padding: 0.4in;
              background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
              color: white;
              position: relative;
              overflow: hidden;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 42px;
              font-weight: 800;
              margin: 0;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
              background: linear-gradient(90deg, #fbbf24, #f59e0b);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .header p {
              font-size: 16px;
              opacity: 0.9;
              margin: 8px 0 0 0;
            }
            .main-content {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              height: calc(100% - 100px);
            }
            .zone-section {
              background: rgba(255,255,255,0.1);
              border-radius: 16px;
              padding: 20px;
              backdrop-filter: blur(10px);
            }
            .zone-title {
              font-size: 22px;
              font-weight: 700;
              margin-bottom: 12px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .work-zone-demo {
              border: 4px dashed #3b82f6;
              border-radius: 12px;
              padding: 16px;
              background: rgba(59, 130, 246, 0.15);
              min-height: 120px;
              position: relative;
            }
            .work-zone-demo::before {
              content: "WORK AREA";
              position: absolute;
              top: -12px;
              left: 16px;
              background: #3b82f6;
              color: white;
              padding: 4px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 700;
            }
            .answer-zone-demo {
              border: 4px solid #f59e0b;
              border-radius: 12px;
              padding: 16px;
              background: rgba(245, 158, 11, 0.2);
              min-height: 80px;
              margin-top: 16px;
              position: relative;
            }
            .answer-zone-demo::before {
              content: "FINAL ANSWER";
              position: absolute;
              top: -12px;
              left: 16px;
              background: #f59e0b;
              color: white;
              padding: 4px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 700;
            }
            .demo-content {
              font-size: 14px;
              opacity: 0.9;
              line-height: 1.6;
            }
            .demo-answer {
              font-size: 24px;
              font-weight: 700;
              text-align: center;
              margin-top: 8px;
            }
            .rules-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .do-box {
              background: rgba(34, 197, 94, 0.2);
              border: 2px solid #22c55e;
              border-radius: 12px;
              padding: 14px;
            }
            .dont-box {
              background: rgba(239, 68, 68, 0.2);
              border: 2px solid #ef4444;
              border-radius: 12px;
              padding: 14px;
            }
            .box-header {
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .do-box .box-header { color: #4ade80; }
            .dont-box .box-header { color: #f87171; }
            .rule-list {
              list-style: none;
              padding: 0;
              margin: 0;
              font-size: 13px;
            }
            .rule-list li {
              padding: 4px 0;
              display: flex;
              align-items: flex-start;
              gap: 8px;
            }
            .rule-list li::before {
              content: "•";
              font-weight: bold;
            }
            .do-box .rule-list li::before { color: #4ade80; }
            .dont-box .rule-list li::before { color: #f87171; }
            .tips-row {
              display: flex;
              gap: 10px;
              margin-top: 16px;
            }
            .tip-badge {
              background: rgba(255,255,255,0.15);
              border-radius: 20px;
              padding: 8px 14px;
              font-size: 13px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 6px;
              white-space: nowrap;
            }
            .footer {
              position: absolute;
              bottom: 16px;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 14px;
              opacity: 0.7;
            }
            .icon-circle {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
            }
            .blue-icon { background: #3b82f6; }
            .yellow-icon { background: #f59e0b; }
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
          <Presentation className="h-4 w-4" />
          Classroom Poster
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            Classroom Scanning Poster
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-4">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Poster
          </Button>
        </div>

        {/* Poster Preview */}
        <div ref={printRef} className="poster" style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '16px',
          position: 'relative',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 800,
              margin: 0,
              background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              📋 HOW TO WRITE YOUR ANSWERS
            </h1>
            <p style={{ fontSize: '14px', opacity: 0.9, margin: '8px 0 0 0' }}>
              Follow these rules for accurate AI scanning!
            </p>
          </div>

          {/* Main Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Left: Zone Examples */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#3b82f6', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔵</span>
                The Two Zones
              </div>

              {/* Work Zone Demo */}
              <div style={{
                border: '3px dashed #3b82f6',
                borderRadius: '8px',
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.15)',
                position: 'relative',
                marginBottom: '12px',
              }}>
                <span style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '12px',
                  background: '#3b82f6',
                  color: 'white',
                  padding: '2px 10px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                }}>WORK AREA</span>
                <div style={{ fontSize: '12px', marginTop: '8px', lineHeight: 1.5 }}>
                  ✏️ Show ALL your steps here<br/>
                  ✏️ Write calculations top to bottom<br/>
                  ✏️ Keep it neat and organized
                </div>
              </div>

              {/* Answer Zone Demo */}
              <div style={{
                border: '3px solid #f59e0b',
                borderRadius: '8px',
                padding: '12px',
                background: 'rgba(245, 158, 11, 0.2)',
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '12px',
                  background: '#f59e0b',
                  color: 'white',
                  padding: '2px 10px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                }}>FINAL ANSWER</span>
                <div style={{ fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                  🎯 Put ONLY your final answer here<br/>
                  <span style={{ fontSize: '20px', fontWeight: 700 }}>x = 4</span>
                </div>
              </div>
            </div>

            {/* Right: Do's and Don'ts */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Do Box */}
                <div style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '2px solid #22c55e',
                  borderRadius: '8px',
                  padding: '10px',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#4ade80', marginBottom: '8px' }}>
                    ✓ DO THIS
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '11px' }}>
                    <li style={{ padding: '3px 0' }}>• Write in the boxes</li>
                    <li style={{ padding: '3px 0' }}>• Show your steps</li>
                    <li style={{ padding: '3px 0' }}>• Write clearly</li>
                    <li style={{ padding: '3px 0' }}>• Circle final answer</li>
                    <li style={{ padding: '3px 0' }}>• Use dark pen/pencil</li>
                  </ul>
                </div>

                {/* Don't Box */}
                <div style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '2px solid #ef4444',
                  borderRadius: '8px',
                  padding: '10px',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f87171', marginBottom: '8px' }}>
                    ✗ DON'T DO
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '11px' }}>
                    <li style={{ padding: '3px 0' }}>• Write in margins</li>
                    <li style={{ padding: '3px 0' }}>• Mix question answers</li>
                    <li style={{ padding: '3px 0' }}>• Write over text</li>
                    <li style={{ padding: '3px 0' }}>• Use light pencil</li>
                    <li style={{ padding: '3px 0' }}>• Leave work messy</li>
                  </ul>
                </div>
              </div>

              {/* Quick Tips */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>✍️ Write Dark</span>
                <span style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>📏 Stay in Boxes</span>
                <span style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>🎯 Clear Answer</span>
                <span style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>📐 Show Steps</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            marginTop: '16px',
            fontSize: '12px',
            opacity: 0.7,
          }}>
            📌 Clear work in the right place = accurate grading!
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
