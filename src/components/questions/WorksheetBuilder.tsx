import { useState, useRef, useEffect } from 'react';
import { Download, Printer, FileText, X, Sparkles, Loader2, Save, FolderOpen, Trash2, Share2, Copy, Check, Link, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import jsPDF from 'jspdf';
import { getFormulasForTopics, type FormulaCategory } from '@/data/formulaReference';

export interface WorksheetQuestion {
  id: string;
  topicName: string;
  standard: string;
  jmapUrl: string;
  subject: string;
  category: string;
}

interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  difficulty: 'medium' | 'hard' | 'challenging';
  svg?: string;
  imageUrl?: string;
  imagePrompt?: string;
}

interface SavedWorksheet {
  id: string;
  title: string;
  teacher_name: string | null;
  questions: GeneratedQuestion[];
  topics: WorksheetQuestion[];
  settings: {
    questionCount: string;
    difficultyFilter: string[];
    showAnswerLines: boolean;
    includeGeometry?: boolean;
    includeFormulas?: boolean;
    includeFormulaSheet?: boolean;
    includeGraphPaper?: boolean;
    includeCoordinateGeometry?: boolean;
    useAIImages?: boolean;
  };
  created_at: string;
  share_code: string | null;
  is_shared: boolean;
}

interface WorksheetBuilderProps {
  selectedQuestions: WorksheetQuestion[];
  onRemoveQuestion: (id: string) => void;
  onClearAll: () => void;
}

export function WorksheetBuilder({ selectedQuestions, onRemoveQuestion, onClearAll }: WorksheetBuilderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [worksheetTitle, setWorksheetTitle] = useState('Math Practice Worksheet');
  const [hasUserEditedTitle, setHasUserEditedTitle] = useState(false);
  const [worksheetType, setWorksheetType] = useState<'practice' | 'assessment'>('practice');
  const [teacherName, setTeacherName] = useState('');

  // Auto-update title to first topic name when questions are added
  useEffect(() => {
    if (selectedQuestions.length > 0 && !hasUserEditedTitle) {
      const prefix = worksheetType === 'assessment' ? 'Assessment: ' : '';
      setWorksheetTitle(prefix + selectedQuestions[0].topicName);
    } else if (selectedQuestions.length === 0 && !hasUserEditedTitle) {
      setWorksheetTitle(worksheetType === 'assessment' ? 'Math Assessment' : 'Math Practice Worksheet');
    }
  }, [selectedQuestions, hasUserEditedTitle, worksheetType]);
  const [showAnswerLines, setShowAnswerLines] = useState(true);
  const [questionCount, setQuestionCount] = useState('5');
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>(['medium', 'hard', 'challenging']);
  const [includeGeometry, setIncludeGeometry] = useState(false);
  const [includeFormulas, setIncludeFormulas] = useState(false);
  const [includeFormulaSheet, setIncludeFormulaSheet] = useState(false);
  const [includeGraphPaper, setIncludeGraphPaper] = useState(false);
  const [includeCoordinateGeometry, setIncludeCoordinateGeometry] = useState(false);
  const [useAIImages, setUseAIImages] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledQuestions, setCompiledQuestions] = useState<GeneratedQuestion[]>([]);
  const [isCompiled, setIsCompiled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedWorksheets, setSavedWorksheets] = useState<SavedWorksheet[]>([]);
  const [showSavedWorksheets, setShowSavedWorksheets] = useState(false);
  const [isLoadingWorksheets, setIsLoadingWorksheets] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleDifficulty = (difficulty: string) => {
    setDifficultyFilter(prev => 
      prev.includes(difficulty)
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    );
  };

  const fetchSavedWorksheets = async () => {
    if (!user) return;
    setIsLoadingWorksheets(true);
    try {
      const { data, error } = await supabase
        .from('worksheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedWorksheets((data || []).map(w => ({
        ...w,
        questions: w.questions as unknown as GeneratedQuestion[],
        topics: w.topics as unknown as WorksheetQuestion[],
        settings: w.settings as unknown as SavedWorksheet['settings'],
      })));
    } catch (error) {
      console.error('Error fetching worksheets:', error);
    } finally {
      setIsLoadingWorksheets(false);
    }
  };

  const saveWorksheet = async () => {
    if (!user || compiledQuestions.length === 0) return;

    setIsSaving(true);
    try {
      const worksheetData = {
        teacher_id: user.id,
        title: worksheetTitle,
        teacher_name: teacherName || null,
        questions: JSON.parse(JSON.stringify(compiledQuestions)),
        topics: JSON.parse(JSON.stringify(selectedQuestions)),
        settings: JSON.parse(JSON.stringify({
          questionCount,
          difficultyFilter,
          showAnswerLines,
          includeGeometry,
          includeFormulas,
          includeFormulaSheet,
          includeGraphPaper,
          includeCoordinateGeometry,
          useAIImages,
        })),
      };
      const { error } = await supabase.from('worksheets').insert([worksheetData]);

      if (error) throw error;

      toast({
        title: 'Worksheet saved!',
        description: 'You can access it from your saved worksheets.',
      });
      fetchSavedWorksheets();
    } catch (error) {
      console.error('Error saving worksheet:', error);
      toast({
        title: 'Failed to save',
        description: 'Could not save worksheet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadWorksheet = (worksheet: SavedWorksheet) => {
    setWorksheetTitle(worksheet.title);
    setHasUserEditedTitle(true);
    setTeacherName(worksheet.teacher_name || '');
    setCompiledQuestions(worksheet.questions);
    setQuestionCount(worksheet.settings.questionCount);
    setDifficultyFilter(worksheet.settings.difficultyFilter);
    setShowAnswerLines(worksheet.settings.showAnswerLines);
    setIncludeGeometry(worksheet.settings.includeGeometry ?? false);
    setIncludeFormulas(worksheet.settings.includeFormulas ?? false);
    setIncludeFormulaSheet(worksheet.settings.includeFormulaSheet ?? false);
    setIncludeGraphPaper(worksheet.settings.includeGraphPaper ?? false);
    setIncludeCoordinateGeometry(worksheet.settings.includeCoordinateGeometry ?? false);
    setUseAIImages(worksheet.settings.useAIImages ?? false);
    setIsCompiled(true);
    setShowSavedWorksheets(false);
    toast({
      title: 'Worksheet loaded',
      description: `"${worksheet.title}" has been loaded.`,
    });
  };

  const deleteWorksheet = async (id: string) => {
    try {
      const { error } = await supabase.from('worksheets').delete().eq('id', id);
      if (error) throw error;
      setSavedWorksheets(prev => prev.filter(w => w.id !== id));
      toast({ title: 'Worksheet deleted' });
    } catch (error) {
      console.error('Error deleting worksheet:', error);
      toast({
        title: 'Failed to delete',
        description: 'Could not delete worksheet.',
        variant: 'destructive',
      });
    }
  };

  const generateShareCode = () => {
    return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  };

  const toggleShareWorksheet = async (worksheet: SavedWorksheet) => {
    setIsSharing(true);
    try {
      if (worksheet.is_shared) {
        // Unshare
        const { error } = await supabase
          .from('worksheets')
          .update({ is_shared: false, share_code: null })
          .eq('id', worksheet.id);

        if (error) throw error;

        setSavedWorksheets(prev => prev.map(w => 
          w.id === worksheet.id ? { ...w, is_shared: false, share_code: null } : w
        ));
        toast({ title: 'Worksheet unshared' });
      } else {
        // Share
        const shareCode = generateShareCode();
        const { error } = await supabase
          .from('worksheets')
          .update({ is_shared: true, share_code: shareCode })
          .eq('id', worksheet.id);

        if (error) throw error;

        setSavedWorksheets(prev => prev.map(w => 
          w.id === worksheet.id ? { ...w, is_shared: true, share_code: shareCode } : w
        ));
        toast({ title: 'Worksheet shared!' });
      }
    } catch (error) {
      console.error('Error toggling share:', error);
      toast({
        title: 'Failed to update sharing',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = async (shareCode: string, worksheetId: string) => {
    const shareUrl = `${window.location.origin}/worksheet/${shareCode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(worksheetId);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Link copied to clipboard!' });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: shareUrl,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavedWorksheets();
    }
  }, [user]);

  const compileWorksheet = async () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: 'No topics selected',
        description: 'Please select at least one topic to compile.',
        variant: 'destructive',
      });
      return;
    }

    setIsCompiling(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics: selectedQuestions.map(q => ({
            topicName: q.topicName,
            standard: q.standard,
            subject: q.subject,
            category: q.category,
          })),
          questionCount: parseInt(questionCount),
          difficultyLevels: difficultyFilter,
          includeGeometry,
          includeFormulas,
          includeGraphPaper,
          includeCoordinateGeometry,
          useAIImages,
        },
      });

      if (error) throw error;

      if (data.questions && data.questions.length > 0) {
        setCompiledQuestions(data.questions);
        setIsCompiled(true);
        toast({
          title: 'Worksheet compiled!',
          description: `Generated ${data.questions.length} higher-order questions.`,
        });
      } else {
        throw new Error('No questions generated');
      }
    } catch (error) {
      console.error('Error compiling worksheet:', error);
      toast({
        title: 'Compilation failed',
        description: 'Failed to generate questions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const resetCompilation = () => {
    setIsCompiled(false);
    setCompiledQuestions([]);
  };

  const generatePDF = async () => {
    if (compiledQuestions.length === 0) {
      toast({
        title: 'No questions compiled',
        description: 'Please compile the worksheet first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
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
      for (const question of compiledQuestions) {
        // Check if we need a new page
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = margin;
        }

        // Question number and difficulty badge
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        const difficultyText = question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
        pdf.text(`${question.questionNumber}. [${difficultyText}]`, margin, yPosition);
        yPosition += 6;

        // Topic and standard reference
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(`${question.topic} (${question.standard})`, margin + 5, yPosition);
        pdf.setTextColor(0);
        yPosition += 8;

        // Question text - wrap long text
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(question.question, contentWidth - 10);
        
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin + 5, yPosition);
          yPosition += 6;
        });

        yPosition += 4;

        // Render AI-generated image if present
        if (question.imageUrl) {
          try {
            // Create an image from the base64 data URL
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.crossOrigin = 'anonymous';
              img.src = question.imageUrl!;
            });
            
            // Draw to canvas and get as PNG data URL
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 400;
            canvas.height = img.height || 400;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              const pngDataUrl = canvas.toDataURL('image/png');
              
              // Check if we need a new page for the image
              if (yPosition > pageHeight - 80) {
                pdf.addPage();
                yPosition = margin;
              }
              
              // Add image to PDF (centered)
              const imgWidth = 60; // mm
              const imgHeight = 60; // mm
              const imgX = (pageWidth - imgWidth) / 2;
              pdf.addImage(pngDataUrl, 'PNG', imgX, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 5;
            }
          } catch (imgError) {
            console.error('Error rendering AI image to PDF:', imgError);
          }
        }
        // Render SVG as image if present (fallback)
        else if (question.svg) {
          try {
            // Convert SVG to data URL
            const svgBlob = new Blob([question.svg], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);
            
            // Create an image from SVG
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = svgUrl;
            });
            
            // Draw to canvas and get as PNG data URL
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, 200, 200);
              ctx.drawImage(img, 0, 0, 200, 200);
              const pngDataUrl = canvas.toDataURL('image/png');
              
              // Check if we need a new page for the image
              if (yPosition > pageHeight - 70) {
                pdf.addPage();
                yPosition = margin;
              }
              
              // Add image to PDF (centered)
              const imgWidth = 50; // mm
              const imgHeight = 50; // mm
              const imgX = (pageWidth - imgWidth) / 2;
              pdf.addImage(pngDataUrl, 'PNG', imgX, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 5;
            }
            
            URL.revokeObjectURL(svgUrl);
          } catch (svgError) {
            console.error('Error rendering SVG to PDF:', svgError);
          }
        }

        // Work area
        if (showAnswerLines) {
          pdf.setDrawColor(200);
          pdf.setLineWidth(0.2);
          for (let i = 0; i < 5; i++) {
            if (yPosition > pageHeight - 30) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.line(margin + 5, yPosition + (i * 8), pageWidth - margin, yPosition + (i * 8));
          }
          yPosition += 45;
        } else {
          yPosition += 15;
        }
      }

      // Formula Reference Sheet
      if (includeFormulaSheet) {
        const relevantFormulas = getFormulasForTopics(
          selectedQuestions.map(q => ({ category: q.category, topicName: q.topicName }))
        );

        if (relevantFormulas.length > 0) {
          pdf.addPage();
          yPosition = margin;

          // Formula sheet header
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0);
          pdf.text('Formula Reference Sheet', pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 12;

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(100);
          pdf.text('Based on selected topics', pageWidth / 2, yPosition, { align: 'center' });
          pdf.setTextColor(0);
          yPosition += 10;

          pdf.setLineWidth(0.5);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 8;

          // Render each formula category
          for (const category of relevantFormulas) {
            // Check if we need a new page
            if (yPosition > pageHeight - 60) {
              pdf.addPage();
              yPosition = margin;
            }

            // Category header
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(category.category, margin, yPosition);
            yPosition += 7;

            // Formulas in this category
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');

            for (const formula of category.formulas) {
              if (yPosition > pageHeight - 30) {
                pdf.addPage();
                yPosition = margin;
              }

              // Formula name and formula
              const formulaLine = `• ${formula.name}: ${formula.formula}`;
              const lines = pdf.splitTextToSize(formulaLine, contentWidth - 10);
              
              lines.forEach((line: string) => {
                pdf.text(line, margin + 5, yPosition);
                yPosition += 5;
              });

              // Description if present
              if (formula.description) {
                pdf.setFontSize(9);
                pdf.setTextColor(100);
                pdf.text(`  (${formula.description})`, margin + 10, yPosition);
                pdf.setTextColor(0);
                pdf.setFontSize(10);
                yPosition += 5;
              }

              yPosition += 2;
            }

            yPosition += 5;
          }
        }
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text('Generated with Scan Genius - NYS Regents Aligned', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Download
      pdf.save(`${worksheetTitle.replace(/\s+/g, '_')}.pdf`);

      toast({
        title: 'Worksheet downloaded!',
        description: `Your worksheet with ${compiledQuestions.length} question(s) has been saved.`,
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
    if (compiledQuestions.length === 0) {
      toast({
        title: 'No questions compiled',
        description: 'Please compile the worksheet first.',
        variant: 'destructive',
      });
      return;
    }
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'challenging': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (selectedQuestions.length === 0 && !isCompiled && !showSavedWorksheets) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-lg mb-2">Worksheet Builder</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            Select topics from the list to add them to your worksheet. Click the + button next to any topic.
          </p>
          {savedWorksheets.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowSavedWorksheets(true)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Load Saved ({savedWorksheets.length})
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showSavedWorksheets) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Saved Worksheets</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSavedWorksheets(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingWorksheets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedWorksheets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No saved worksheets yet.
            </p>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {savedWorksheets.map((worksheet) => (
                  <div
                    key={worksheet.id}
                    className="p-3 rounded-lg border hover:bg-muted/50 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{worksheet.title}</p>
                          {worksheet.is_shared && (
                            <Badge variant="outline" className="text-xs">
                              <Link className="h-3 w-3 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {worksheet.questions.length} questions • {new Date(worksheet.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadWorksheet(worksheet)}
                        >
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteWorksheet(worksheet.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Share controls */}
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <Button
                        variant={worksheet.is_shared ? "secondary" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => toggleShareWorksheet(worksheet)}
                        disabled={isSharing}
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        {worksheet.is_shared ? 'Unshare' : 'Share'}
                      </Button>
                      {worksheet.is_shared && worksheet.share_code && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => copyShareLink(worksheet.share_code!, worksheet.id)}
                        >
                          {copiedId === worksheet.id ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy Link
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
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
            <Badge variant="secondary">
              {isCompiled ? `${compiledQuestions.length} questions` : `${selectedQuestions.length} topic(s)`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCompiled ? (
            <>
              {/* Worksheet Type Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">What are you building?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={worksheetType === 'practice' ? 'default' : 'outline'}
                    className={`h-auto py-4 flex flex-col items-center gap-2 ${
                      worksheetType === 'practice' 
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setWorksheetType('practice');
                      if (!hasUserEditedTitle) {
                        setWorksheetTitle(selectedQuestions.length > 0 ? selectedQuestions[0].topicName : 'Math Practice Worksheet');
                      }
                    }}
                  >
                    <BookOpen className="h-6 w-6" />
                    <span className="font-semibold">Practice Worksheet</span>
                    <span className="text-xs opacity-80 text-center">For practice and homework</span>
                  </Button>
                  <Button
                    type="button"
                    variant={worksheetType === 'assessment' ? 'default' : 'outline'}
                    className={`h-auto py-4 flex flex-col items-center gap-2 ${
                      worksheetType === 'assessment' 
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setWorksheetType('assessment');
                      if (!hasUserEditedTitle) {
                        setWorksheetTitle(selectedQuestions.length > 0 ? 'Assessment: ' + selectedQuestions[0].topicName : 'Math Assessment');
                      }
                    }}
                  >
                    <FileText className="h-6 w-6" />
                    <span className="font-semibold">Assessment</span>
                    <span className="text-xs opacity-80 text-center">For quizzes and tests</span>
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Configuration */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-sm">Worksheet Title</Label>
                  <Input
                    id="title"
                    value={worksheetTitle}
                    onChange={(e) => {
                      setWorksheetTitle(e.target.value);
                      setHasUserEditedTitle(true);
                    }}
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
                <div className="space-y-1.5">
                  <Label htmlFor="questionCount" className="text-sm">Number of Questions</Label>
                  <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 questions</SelectItem>
                      <SelectItem value="5">5 questions</SelectItem>
                      <SelectItem value="8">8 questions</SelectItem>
                      <SelectItem value="10">10 questions</SelectItem>
                      <SelectItem value="15">15 questions</SelectItem>
                      <SelectItem value="20">20 questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Difficulty Levels</Label>
                  <div className="flex flex-wrap gap-2">
                    {['medium', 'hard', 'challenging'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleDifficulty(level)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                          difficultyFilter.includes(level)
                            ? level === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              : level === 'hard'
                              ? 'bg-orange-100 text-orange-800 border-orange-300'
                              : 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                  {difficultyFilter.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one difficulty level</p>
                  )}
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeGeometry"
                    checked={includeGeometry}
                    onChange={(e) => setIncludeGeometry(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeGeometry" className="text-sm cursor-pointer">
                    Include geometric shapes/diagrams
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeFormulas"
                    checked={includeFormulas}
                    onChange={(e) => setIncludeFormulas(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeFormulas" className="text-sm cursor-pointer">
                    Include mathematical formulas
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeFormulaSheet"
                    checked={includeFormulaSheet}
                    onChange={(e) => setIncludeFormulaSheet(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeFormulaSheet" className="text-sm cursor-pointer">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      Append formula reference sheet
                    </span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeGraphPaper"
                    checked={includeGraphPaper}
                    onChange={(e) => setIncludeGraphPaper(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeGraphPaper" className="text-sm cursor-pointer">
                    Include graph paper solutions
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeCoordinateGeometry"
                    checked={includeCoordinateGeometry}
                    onChange={(e) => setIncludeCoordinateGeometry(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeCoordinateGeometry" className="text-sm cursor-pointer">
                    Include coordinate geometry solutions
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useAIImages"
                    checked={useAIImages}
                    onChange={(e) => setUseAIImages(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="useAIImages" className="text-sm cursor-pointer">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      Use AI-generated images for diagrams
                    </span>
                  </Label>
                </div>
              </div>

              <Separator />

              {/* Selected Topics */}
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

              {/* Compile Button */}
              <Button
                className="w-full"
                onClick={compileWorksheet}
                disabled={isCompiling || difficultyFilter.length === 0}
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Compile Worksheet
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={onClearAll}
              >
                Clear All
              </Button>
            </>
          ) : (
            <>
              {/* Compiled Questions Preview */}
              <div className="space-y-2">
                <Label className="text-sm">Generated Questions</Label>
                <ScrollArea className="h-64 rounded-md border p-2">
                  {compiledQuestions.map((question) => (
                    <div
                      key={question.questionNumber}
                      className="py-3 px-2 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">{question.questionNumber}.</span>
                        <Badge variant="outline" className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {question.topic} ({question.standard})
                      </p>
                      <p className="text-sm">{question.question}</p>
                      {question.imageUrl && (
                        <div className="mt-2 flex justify-center">
                          <img 
                            src={question.imageUrl} 
                            alt={`Diagram for question ${question.questionNumber}`}
                            className="max-w-[200px] max-h-[200px] border rounded"
                          />
                        </div>
                      )}
                      {!question.imageUrl && question.svg && (
                        <div 
                          className="mt-2 flex justify-center"
                          dangerouslySetInnerHTML={{ __html: question.svg }}
                        />
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Download/Print/Save Actions */}
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

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={saveWorksheet}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Worksheet
                </Button>
                {savedWorksheets.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSavedWorksheets(true)}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={resetCompilation}
              >
                Edit Topics
              </Button>
            </>
          )}
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
              {compiledQuestions.map((question) => (
                <div key={question.questionNumber} className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold">{question.questionNumber}.</span>
                    <span className="text-xs px-2 py-0.5 rounded border bg-muted">
                      {question.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-5">
                    {question.topic} ({question.standard})
                  </p>
                  <p className="ml-5">{question.question}</p>
                  {question.svg && (
                    <div 
                      className="ml-5 mt-2 flex justify-center"
                      dangerouslySetInnerHTML={{ __html: question.svg }}
                    />
                  )}
                  {showAnswerLines && (
                    <div className="ml-5 mt-4 space-y-3">
                      {[1, 2, 3, 4, 5].map((line) => (
                        <div key={line} className="border-b border-gray-300" style={{ height: '24px' }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Formula Reference Sheet in Print Preview */}
            {includeFormulaSheet && (() => {
              const relevantFormulas = getFormulasForTopics(
                selectedQuestions.map(q => ({ category: q.category, topicName: q.topicName }))
              );
              
              if (relevantFormulas.length === 0) return null;
              
              return (
                <div className="mt-12 pt-8 border-t-2 border-dashed page-break-before">
                  <h2 className="text-xl font-bold text-center mb-2">Formula Reference Sheet</h2>
                  <p className="text-center text-sm text-muted-foreground mb-6">Based on selected topics</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {relevantFormulas.map((category) => (
                      <div key={category.category} className="space-y-2">
                        <h3 className="font-semibold text-sm border-b pb-1">{category.category}</h3>
                        <ul className="space-y-1 text-sm">
                          {category.formulas.map((formula, idx) => (
                            <li key={idx} className="flex flex-col">
                              <span>
                                <span className="font-medium">{formula.name}:</span>{' '}
                                <span className="font-mono text-xs">{formula.formula}</span>
                              </span>
                              {formula.description && (
                                <span className="text-xs text-muted-foreground ml-4">({formula.description})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
