import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

const featureModules = [
  {
    title: '🔐 Authentication',
    features: [
      'Login Page → Teacher or Student Dashboard',
      'MFA Challenge for secure access',
      'Password Reset flow',
      'Role-based access (Teacher/Student/Admin)',
    ],
  },
  {
    title: '📚 Class Management',
    features: [
      'Create Class → Set Name/Period/Year → Generate Join Code',
      'Manage Roster via CSV Upload, Image OCR, or Manual Entry',
      'Edit Class settings and student information',
      'Student join via class codes',
    ],
  },
  {
    title: '📝 Worksheet & Question Builder',
    features: [
      'Browse NYS Standards by subject (Geometry, Algebra, etc.)',
      'Select Topics → Build Worksheet or Diagnostic',
      'Differentiated Generator creates Levels A-F assessments',
      'Mastery Challenge mode for advanced students',
      'Print worksheets with embedded QR codes for tracking',
    ],
  },
  {
    title: '📖 Lesson Planning',
    features: [
      'Select Topic → Choose Presentation Theme',
      'AI generates slide content automatically',
      'Edit and customize slides with clipart',
      'Export to PowerPoint (PPTX) format',
      'Save to Lesson Library for reuse',
    ],
  },
  {
    title: '📸 Scan & Grade',
    features: [
      'Upload images or use camera (Single/Batch mode)',
      'Student Identification: QR Code, AI Name Match, or Manual',
      'Grading Modes:',
      '  • AI Only: Full automated analysis',
      '  • Teacher-Guided: Upload answer key for comparison',
      '  • Manual: Score rubric criteria manually',
      '  • Comparison: Side-by-side AI vs Teacher view',
      'View rubric scores, misconceptions, and remediation suggestions',
      'Save results to gradebook',
    ],
  },
  {
    title: '📋 Batch Processing',
    features: [
      'Add multiple images at once',
      'Auto-identify students via QR or handwriting',
      'Link front/back pages automatically',
      'Process entire queue in parallel',
      'Generate batch report with summary',
      'Save all grades at once',
      'Export differentiation group PDFs',
    ],
  },
  {
    title: '📊 Reports & Analytics',
    features: [
      'Gradebook: View/edit all saved grades',
      'Mastery Heatmap: Topic performance visualization',
      'Grade History Chart: Trend analysis over time',
      'Differentiation Groups: Skill-based student grouping',
      'Class Misconceptions: Common errors summary',
      'Regents Score Report: Projected exam scores',
      'Student Progress Tracker: Individual performance',
    ],
  },
  {
    title: '🎓 Student Portal',
    features: [
      'Join class with code',
      'View personal dashboard',
      'See grades and feedback',
      'Track progress over time',
    ],
  },
  {
    title: '🔗 Integrations & Settings',
    features: [
      'Webhook Push: Real-time alerts to external systems',
      'Scholar Sync: Push grades to sister app for rewards',
      'Google Drive Sync: Auto-import scanned images',
      'Grade Floor Settings: NYS 55% standard support',
      'AI Detection: Handwriting similarity analysis',
      'Auto-Push Alerts: Parent notifications for low scores',
    ],
  },
];

const flowchartText = `
AUTHENTICATION FLOW
├── Login Page
│   ├── Teacher → Teacher Dashboard
│   └── Student → Student Dashboard
├── MFA Challenge → Dashboard
└── Password Reset → Login

CLASS MANAGEMENT FLOW
├── Create Class
│   ├── Set Name/Period/Year
│   └── Generate Join Code
└── Manage Roster
    ├── CSV Upload
    ├── Roster Image OCR
    └── Manual Entry

WORKSHEET BUILDER FLOW
├── Browse NYS Standards
├── Select Topics
└── Choose Mode
    ├── Worksheet → Add Questions → Print with QR
    ├── Diagnostic → Generate Levels A-F → Print
    └── Mastery Challenge

LESSON PLANNING FLOW
├── Select Topic
├── Choose Theme
├── AI Generate Slides
├── Edit/Customize
└── Export to PPTX

SCAN & GRADE FLOW
├── Upload/Camera
├── Scan Mode
│   ├── Single Paper
│   ├── Batch (Multi-Paper)
│   ├── Saved (Pending)
│   └── Continuous QR Scanner
├── Identification
│   ├── QR Code → Auto-Link
│   ├── Handwriting → AI Match
│   └── Manual → Select from Roster
├── Grading Mode
│   ├── AI Only → Full Analysis
│   ├── Teacher-Guided → Upload Answer Key
│   ├── Manual → Scoring Form
│   └── Comparison → Side-by-Side
└── Results
    ├── Rubric Scores
    ├── Misconceptions
    ├── Remediation
    └── Save to Gradebook

BATCH PROCESSING FLOW
├── Add Multiple Images
├── Auto-Identify Students
├── Link Front/Back Pages
├── Process Queue
├── Batch Report
└── Save All / Export PDFs

REPORTS FLOW
├── Gradebook → Filter → View/Edit
├── Mastery Heatmap → Topic Grid
├── Grade History → Trend Analysis
├── Differentiation → Skill Groups
├── Misconceptions → Error Summary
├── Regents Report → Projected Scores
└── Student Progress → Individual Tracking

STUDENT PORTAL FLOW
├── Join with Code
├── View Dashboard
├── See Grades
├── View Feedback
└── Track Progress

INTEGRATIONS
├── Webhook Push → Real-time Alerts
├── Scholar Sync → Sister App
├── Google Drive → Auto-Import
├── Grade Floor → NYS 55%
├── AI Detection → Handwriting Analysis
└── Auto-Push → Parent Notifications
`;

export default function FeatureDocumentation() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Helper function to check page break
      const checkPageBreak = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Title
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NYCLogic AI - Feature Documentation', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Feature Modules
      for (const module of featureModules) {
        checkPageBreak(30);
        
        // Module title
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 100, 150);
        pdf.text(module.title, margin, yPosition);
        yPosition += 8;

        // Module features
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);

        for (const feature of module.features) {
          checkPageBreak(6);
          const lines = pdf.splitTextToSize(`• ${feature}`, contentWidth - 5);
          pdf.text(lines, margin + 5, yPosition);
          yPosition += lines.length * 5;
        }

        yPosition += 8;
      }

      // Add flowchart page
      pdf.addPage();
      yPosition = margin;

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 100, 150);
      pdf.text('Application Flow Charts', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      pdf.setFontSize(9);
      pdf.setFont('courier', 'normal');
      pdf.setTextColor(0, 0, 0);

      const flowLines = flowchartText.trim().split('\n');
      for (const line of flowLines) {
        checkPageBreak(5);
        pdf.text(line, margin, yPosition);
        yPosition += 4.5;
      }

      // Save the PDF
      pdf.save('NYCLogic-AI-Feature-Documentation.pdf');
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Feature Documentation</h1>
            <p className="text-muted-foreground">Complete overview of all app features and workflows</p>
          </div>
          <Button onClick={generatePDF} disabled={isGenerating} variant="hero">
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureModules.map((module, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {module.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2">
                      <FileText className="h-3 w-3 mt-1 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
