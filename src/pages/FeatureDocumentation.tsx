import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  BookOpen, 
  Camera, 
  Download, 
  FileText, 
  GraduationCap, 
  Layers, 
  Lightbulb, 
  Loader2, 
  Lock, 
  Settings, 
  Users 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

const featureModules = [
  {
    title: 'Authentication',
    icon: Lock,
    features: [
      'Login Page -> Teacher or Student Dashboard',
      'MFA Challenge for secure access',
      'Password Reset flow',
      'Role-based access (Teacher/Student/Admin)',
    ],
  },
  {
    title: 'Class Management',
    icon: Users,
    features: [
      'Create Class -> Set Name/Period/Year -> Generate Join Code',
      'Manage roster via CSV upload, image OCR, or manual entry',
      'Edit class settings and student information',
      'Student join via class codes',
    ],
  },
  {
    title: 'Worksheet & Question Builder',
    icon: BookOpen,
    features: [
      'Browse NYS Standards by subject (Geometry, Algebra, etc.)',
      'Select topics -> Build worksheet or diagnostic',
      'Differentiated generator creates Levels A-F assessments',
      'Mastery challenge mode for advanced students',
      'Print worksheets with embedded QR codes for tracking',
    ],
  },
  {
    title: 'Lesson Planning',
    icon: Lightbulb,
    features: [
      'Select topic -> Choose presentation theme',
      'AI generates slide content automatically',
      'Edit and customize slides with clipart',
      'Export to PowerPoint (PPTX) format',
      'Save to lesson library for reuse',
    ],
  },
  {
    title: 'Scan & Grade',
    icon: Camera,
    features: [
      'Upload images or use camera (Single/Batch mode)',
      'Student identification: QR code, AI name match, or manual',
      'Grading modes:',
      'AI Only: Full automated analysis',
      'Teacher-Guided: Upload answer key for comparison',
      'Manual: Score rubric criteria manually',
      'Comparison: Side-by-side AI vs teacher view',
      'View rubric scores, misconceptions, and remediation suggestions',
      'Save results to gradebook',
    ],
  },
  {
    title: 'Batch Processing',
    icon: Layers,
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
    title: 'Reports & Analytics',
    icon: BarChart3,
    features: [
      'Gradebook: View/edit all saved grades',
      'Mastery heatmap: Topic performance visualization',
      'Grade history chart: Trend analysis over time',
      'Differentiation groups: Skill-based student grouping',
      'Class misconceptions: Common errors summary',
      'Regents score report: Projected exam scores',
      'Student progress tracker: Individual performance',
    ],
  },
  {
    title: 'Student Portal',
    icon: GraduationCap,
    features: [
      'Join class with code',
      'View personal dashboard',
      'See grades and feedback',
      'Track progress over time',
    ],
  },
  {
    title: 'Integrations & Settings',
    icon: Settings,
    features: [
      'Webhook push: Real-time alerts to external systems',
      'Scholar sync: Push grades to sister app for rewards',
      'Google Drive sync: Auto-import scanned images',
      'Grade floor settings: NYS 55% standard support',
      'AI detection: Handwriting similarity analysis',
      'Auto-push alerts: Parent notifications for low scores',
    ],
  },
];

const flowchartText = `
AUTHENTICATION FLOW
- Login Page
  - Teacher -> Teacher Dashboard
  - Student -> Student Dashboard
- MFA Challenge -> Dashboard
- Password Reset -> Login

CLASS MANAGEMENT FLOW
- Create Class
  - Set Name/Period/Year
  - Generate Join Code
- Manage Roster
  - CSV Upload
  - Roster Image OCR
  - Manual Entry

WORKSHEET BUILDER FLOW
- Browse NYS Standards
- Select Topics
- Choose Mode
  - Worksheet -> Add Questions -> Print with QR
  - Diagnostic -> Generate Levels A-F -> Print
  - Mastery Challenge

LESSON PLANNING FLOW
- Select Topic
- Choose Theme
- AI Generate Slides
- Edit/Customize
- Export to PPTX

SCAN & GRADE FLOW
- Upload/Camera
- Scan Mode
  - Single Paper
  - Batch (Multi-Paper)
  - Saved (Pending)
  - Continuous QR Scanner
- Identification
  - QR Code -> Auto-Link
  - Handwriting -> AI Match
  - Manual -> Select from Roster
- Grading Mode
  - AI Only -> Full Analysis
  - Teacher-Guided -> Upload Answer Key
  - Manual -> Scoring Form
  - Comparison -> Side-by-Side
- Results
  - Rubric Scores
  - Misconceptions
  - Remediation
  - Save to Gradebook

BATCH PROCESSING FLOW
- Add Multiple Images
- Auto-Identify Students
- Link Front/Back Pages
- Process Queue
- Batch Report
- Save All / Export PDFs

REPORTS FLOW
- Gradebook -> Filter -> View/Edit
- Mastery Heatmap -> Topic Grid
- Grade History -> Trend Analysis
- Differentiation -> Skill Groups
- Misconceptions -> Error Summary
- Regents Report -> Projected Scores
- Student Progress -> Individual Tracking

STUDENT PORTAL FLOW
- Join with Code
- View Dashboard
- See Grades
- View Feedback
- Track Progress

INTEGRATIONS
- Webhook Push -> Real-time Alerts
- Scholar Sync -> Sister App
- Google Drive -> Auto-Import
- Grade Floor -> NYS 55%
- AI Detection -> Handwriting Analysis
- Auto-Push -> Parent Notifications
`;

export default function FeatureDocumentation() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
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

      // Draw header background
      pdf.setFillColor(30, 64, 175);
      pdf.rect(0, 0, pageWidth, 45, 'F');

      // Title
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('NYCLogic AI', pageWidth / 2, 22, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Feature Documentation & Workflow Guide', pageWidth / 2, 32, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, pageWidth / 2, 40, { align: 'center' });
      
      yPosition = 55;
      pdf.setTextColor(0, 0, 0);

      // Table of Contents
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Table of Contents', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      featureModules.forEach((module, index) => {
        pdf.text(`${index + 1}. ${module.title}`, margin + 5, yPosition);
        yPosition += 7;
      });
      
      yPosition += 5;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;

      // Feature Modules
      for (let i = 0; i < featureModules.length; i++) {
        const module = featureModules[i];
        checkPageBreak(50);
        
        // Module header with background
        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(margin, yPosition - 5, contentWidth, 12, 2, 2, 'F');
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 64, 175);
        pdf.text(`${i + 1}. ${module.title}`, margin + 5, yPosition + 3);
        yPosition += 15;

        // Module features
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);

        for (const feature of module.features) {
          checkPageBreak(10);
          const lines = pdf.splitTextToSize(`- ${feature}`, contentWidth - 15);
          pdf.text(lines, margin + 10, yPosition);
          yPosition += lines.length * 6 + 2;
        }

        yPosition += 12;
      }

      // Flowchart Section - New Page
      pdf.addPage();
      
      // Flowchart header
      pdf.setFillColor(30, 64, 175);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Application Workflow Diagrams', pageWidth / 2, 22, { align: 'center' });
      
      yPosition = 45;
      pdf.setTextColor(0, 0, 0);

      const flowSections = flowchartText.trim().split('\n\n');
      
      for (const section of flowSections) {
        const lines = section.split('\n');
        if (lines.length === 0) continue;
        
        checkPageBreak(lines.length * 6 + 20);
        
        // Section title (first line without tree characters)
        const titleLine = lines[0];
        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(margin, yPosition - 4, contentWidth, 10, 2, 2, 'F');
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 64, 175);
        pdf.text(titleLine, margin + 5, yPosition + 2);
        yPosition += 14;
        
        // Flow lines
        pdf.setFontSize(10);
        pdf.setFont('courier', 'normal');
        pdf.setTextColor(60, 60, 60);
        
        for (let i = 1; i < lines.length; i++) {
          checkPageBreak(7);
          pdf.text(lines[i], margin + 8, yPosition);
          yPosition += 5.5;
        }
        
        yPosition += 10;
      }

      // Footer on last page
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('NYCLogic AI - QuickScan Insight', margin, pageHeight - 10);
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
          {featureModules.map((module, index) => {
            const ModuleIcon = module.icon;
            return (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ModuleIcon className="h-4 w-4 text-primary" />
                    {module.title}
                  </CardTitle>
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
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
