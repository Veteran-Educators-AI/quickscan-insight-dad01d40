import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, Scan, Check, X, Trash2, Save, Image as ImageIcon, Shapes, Plus, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import type { PDFDocumentProxy } from "pdfjs-dist";
import { getPdfjs } from "@/lib/pdfjsLoader";

interface ExtractedShape {
  id: string;
  shapeType: string;
  description: string;
  svgData: string;
  thumbnailUrl: string;
  vertices?: Array<{ label: string; x: number; y: number }>;
  parameters?: Record<string, unknown>;
  tags: string[];
  nysStandard?: string;
}

interface RegentsShapeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHAPE_TYPES = [
  { value: 'triangle', label: 'Triangle' },
  { value: 'quadrilateral', label: 'Quadrilateral' },
  { value: 'circle', label: 'Circle' },
  { value: 'polygon', label: 'Other Polygon' },
  { value: 'parabola', label: 'Parabola' },
  { value: 'linear', label: 'Linear Graph' },
  { value: 'quadratic', label: 'Quadratic Graph' },
  { value: 'exponential', label: 'Exponential Graph' },
  { value: 'coordinate_plane', label: 'Coordinate Plane' },
  { value: 'number_line', label: 'Number Line' },
  { value: 'force_diagram', label: 'Force Diagram' },
  { value: 'circuit', label: 'Circuit' },
  { value: 'molecule', label: 'Molecule' },
];

const SUBJECTS = [
  { value: 'geometry', label: 'Geometry' },
  { value: 'algebra1', label: 'Algebra 1' },
  { value: 'algebra2', label: 'Algebra 2' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
];

export function RegentsShapeScanner({ open, onOpenChange }: RegentsShapeScannerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pdfFileName, setPdfFileName] = useState('');
  const [sourceExam, setSourceExam] = useState('');
  const [questionNumber, setQuestionNumber] = useState<number | undefined>();
  const [subject, setSubject] = useState('geometry');
  const [extractedShapes, setExtractedShapes] = useState<ExtractedShape[]>([]);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);

  // Render a PDF page to an image
  const renderPdfPage = async (pdf: PDFDocumentProxy, pageNum: number): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    const scale = 2; // Higher scale for better quality
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    return canvas.toDataURL('image/png');
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    if (isPdf) {
      setIsLoadingPdf(true);
      setPdfFileName(file.name);
      
      // Auto-detect exam info from filename
      const filename = file.name.toLowerCase();
      if (filename.includes('algebra') && filename.includes('1')) {
        setSubject('algebra1');
      } else if (filename.includes('algebra') && filename.includes('2')) {
        setSubject('algebra2');
      } else if (filename.includes('geometry')) {
        setSubject('geometry');
      }
      
      // Extract exam date from filename (e.g., 0126ExamAI.pdf -> January 2026)
      const dateMatch = filename.match(/(\d{2})(\d{2})exam/i);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]);
        const year = 2000 + parseInt(dateMatch[2]);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const examType = filename.includes('ai') ? 'Algebra 1' : filename.includes('aii') ? 'Algebra 2' : 'Geometry';
        setSourceExam(`${monthNames[month - 1]} ${year} ${examType} Regents`);
      }
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await getPdfjs();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        
        toast({
          title: 'Loading PDF',
          description: `Rendering ${totalPages} pages...`,
        });
        
        const pages: string[] = [];
        for (let i = 1; i <= totalPages; i++) {
          const pageImage = await renderPdfPage(pdf, i);
          pages.push(pageImage);
        }
        
        setPdfPages(pages);
        setCurrentPageIndex(0);
        setUploadedImage(pages[0]);
        setExtractedShapes([]);
        
        toast({
          title: 'PDF Loaded',
          description: `${totalPages} pages ready to scan for shapes`,
        });
      } catch (error) {
        console.error('PDF loading error:', error);
        toast({
          title: 'PDF Load Failed',
          description: 'Could not load the PDF file. Try a different file.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingPdf(false);
      }
    } else {
      // Handle regular image upload
      setPdfPages([]);
      setPdfFileName('');
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setExtractedShapes([]);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  const goToPage = (index: number) => {
    if (index >= 0 && index < pdfPages.length) {
      setCurrentPageIndex(index);
      setUploadedImage(pdfPages[index]);
    }
  };

  const scanForShapes = async () => {
    if (!uploadedImage) return;

    setIsScanning(true);
    try {
      // Call AI to analyze the image and extract shapes
      const { data, error } = await supabase.functions.invoke('analyze-student-work', {
        body: {
          imageData: uploadedImage,
          extractShapesOnly: true, // Special mode for shape extraction
          subject,
        },
      });

      if (error) throw error;

      // Parse extracted shapes from AI response
      const shapes: ExtractedShape[] = (data?.extractedShapes || []).map((shape: any, idx: number) => ({
        id: `shape-${Date.now()}-${idx}`,
        shapeType: shape.type || 'polygon',
        description: shape.description || '',
        svgData: shape.svg || '',
        thumbnailUrl: shape.thumbnail || uploadedImage,
        vertices: shape.vertices,
        parameters: shape.parameters,
        tags: shape.tags || [],
        nysStandard: shape.standard,
      }));

      if (shapes.length === 0) {
        // Create a placeholder for manual entry
        shapes.push({
          id: `shape-${Date.now()}-0`,
          shapeType: 'polygon',
          description: 'Shape extracted from exam',
          svgData: '',
          thumbnailUrl: uploadedImage,
          tags: [],
        });
      }

      setExtractedShapes(shapes);
      toast({
        title: 'Scan Complete',
        description: `Found ${shapes.length} shape(s) in the image`,
      });
    } catch (error) {
      console.error('Shape scanning error:', error);
      toast({
        title: 'Scan Failed',
        description: 'Could not extract shapes from image. Try adding manually.',
        variant: 'destructive',
      });
      // Add placeholder for manual entry
      setExtractedShapes([{
        id: `shape-${Date.now()}-0`,
        shapeType: 'polygon',
        description: '',
        svgData: '',
        thumbnailUrl: uploadedImage,
        tags: [],
      }]);
    } finally {
      setIsScanning(false);
    }
  };

  const updateShape = (index: number, updates: Partial<ExtractedShape>) => {
    setExtractedShapes(prev => {
      const newShapes = [...prev];
      newShapes[index] = { ...newShapes[index], ...updates };
      return newShapes;
    });
  };

  const removeShape = (index: number) => {
    setExtractedShapes(prev => prev.filter((_, i) => i !== index));
    if (selectedShapeIndex === index) {
      setSelectedShapeIndex(null);
    }
  };

  const addManualShape = () => {
    setExtractedShapes(prev => [
      ...prev,
      {
        id: `shape-${Date.now()}-${prev.length}`,
        shapeType: 'polygon',
        description: '',
        svgData: '',
        thumbnailUrl: uploadedImage || '',
        tags: [],
      },
    ]);
  };

  const saveShapesToLibrary = async () => {
    if (!user || extractedShapes.length === 0) return;

    setIsSaving(true);
    try {
      const shapesToSave = extractedShapes.map(shape => ({
        teacher_id: user.id,
        shape_type: shape.shapeType,
        subject,
        svg_data: shape.svgData || shape.thumbnailUrl,
        thumbnail_url: shape.thumbnailUrl,
        tags: shape.tags,
        description: shape.description,
        nys_standard: shape.nysStandard,
        source_exam: sourceExam,
        source_question_number: questionNumber,
        source_image_url: uploadedImage,
        vertices: shape.vertices ? JSON.parse(JSON.stringify(shape.vertices)) : null,
        parameters: shape.parameters ? JSON.parse(JSON.stringify(shape.parameters)) : null,
        is_verified: true, // Teacher-uploaded shapes are verified
      }));

      const { error } = await supabase
        .from('regents_shape_library')
        .insert(shapesToSave);

      if (error) throw error;

      toast({
        title: 'Shapes Saved',
        description: `Added ${shapesToSave.length} shape(s) to your library`,
      });

      // Reset state
      setUploadedImage(null);
      setExtractedShapes([]);
      setSourceExam('');
      setQuestionNumber(undefined);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving shapes:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save shapes to library',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedShape = selectedShapeIndex !== null ? extractedShapes[selectedShapeIndex] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shapes className="h-5 w-5 text-primary" />
            Regents Shape Scanner
          </DialogTitle>
          <DialogDescription>
            Scan Regents exam images to extract and catalog shapes for reuse in worksheet generation
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Left: Upload & Preview */}
          <div className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>Source Exam</Label>
              <Input
                placeholder="e.g., June 2024 Geometry Regents"
                value={sourceExam}
                onChange={(e) => setSourceExam(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question #</Label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={questionNumber || ''}
                  onChange={(e) => setQuestionNumber(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {isLoadingPdf ? (
                <div className="py-8">
                  <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Loading PDF pages...
                  </p>
                </div>
              ) : uploadedImage ? (
                <div className="space-y-3">
                  {/* PDF Page Navigation */}
                  {pdfPages.length > 1 && (
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPageIndex - 1)}
                        disabled={currentPageIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">
                        Page {currentPageIndex + 1} of {pdfPages.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPageIndex + 1)}
                        disabled={currentPageIndex === pdfPages.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <img
                    src={uploadedImage}
                    alt="Uploaded exam"
                    className="max-h-48 mx-auto rounded border"
                  />
                  
                  {pdfFileName && (
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      {pdfFileName}
                    </Badge>
                  )}
                  
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedImage(null);
                        setPdfPages([]);
                        setPdfFileName('');
                        setExtractedShapes([]);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                    <Button
                      size="sm"
                      onClick={scanForShapes}
                      disabled={isScanning}
                    >
                      {isScanning ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Scan className="h-4 w-4 mr-1" />
                      )}
                      Scan Page for Shapes
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="py-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upload a Regents exam image or PDF
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, or PDF (e.g., JMAP exam archives)
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* Extracted Shapes List */}
            {extractedShapes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Extracted Shapes ({extractedShapes.length})</Label>
                  <Button variant="ghost" size="sm" onClick={addManualShape}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Shape
                  </Button>
                </div>
                <ScrollArea className="h-48 border rounded-lg p-2">
                  <div className="space-y-2">
                    {extractedShapes.map((shape, idx) => (
                      <Card
                        key={shape.id}
                        className={`cursor-pointer transition-colors ${
                          selectedShapeIndex === idx ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedShapeIndex(idx)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            {shape.thumbnailUrl ? (
                              <img
                                src={shape.thumbnailUrl}
                                alt={shape.shapeType}
                                className="w-full h-full object-contain rounded"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {shape.description || shape.shapeType}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {shape.shapeType}
                              </Badge>
                              {shape.nysStandard && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  {shape.nysStandard}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeShape(idx);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Right: Shape Editor */}
          <div className="border rounded-lg p-4 overflow-y-auto">
            {selectedShape ? (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shapes className="h-4 w-4" />
                  Edit Shape #{selectedShapeIndex! + 1}
                </h3>

                <div className="space-y-2">
                  <Label>Shape Type</Label>
                  <Select
                    value={selectedShape.shapeType}
                    onValueChange={(v) => updateShape(selectedShapeIndex!, { shapeType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHAPE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe this shape..."
                    value={selectedShape.description}
                    onChange={(e) => updateShape(selectedShapeIndex!, { description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>NYS Standard</Label>
                  <Input
                    placeholder="e.g., G.CO.B.6"
                    value={selectedShape.nysStandard || ''}
                    onChange={(e) => updateShape(selectedShapeIndex!, { nysStandard: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    placeholder="e.g., coordinate_plane, right_triangle"
                    value={selectedShape.tags.join(', ')}
                    onChange={(e) => updateShape(selectedShapeIndex!, {
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                  />
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-lg p-4 bg-white">
                    {selectedShape.svgData ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: selectedShape.svgData }}
                        className="w-full max-h-48 flex items-center justify-center"
                      />
                    ) : selectedShape.thumbnailUrl ? (
                      <img
                        src={selectedShape.thumbnailUrl}
                        alt="Shape preview"
                        className="max-h-48 mx-auto"
                      />
                    ) : (
                      <div className="h-32 flex items-center justify-center text-muted-foreground">
                        No preview available
                      </div>
                    )}
                  </div>
                </div>

                {/* Vertices (for geometry) */}
                {['triangle', 'quadrilateral', 'polygon'].includes(selectedShape.shapeType) && (
                  <div className="space-y-2">
                    <Label>Vertices (optional)</Label>
                    <Textarea
                      placeholder='e.g., A(0,0), B(4,0), C(0,3)'
                      value={selectedShape.vertices?.map(v => `${v.label}(${v.x},${v.y})`).join(', ') || ''}
                      onChange={(e) => {
                        const matches = e.target.value.match(/([A-Z])\s*\((-?\d+),\s*(-?\d+)\)/g) || [];
                        const vertices = matches.map(m => {
                          const parsed = m.match(/([A-Z])\s*\((-?\d+),\s*(-?\d+)\)/);
                          return parsed ? { label: parsed[1], x: parseInt(parsed[2]), y: parseInt(parsed[3]) } : null;
                        }).filter(Boolean) as Array<{ label: string; x: number; y: number }>;
                        updateShape(selectedShapeIndex!, { vertices });
                      }}
                      rows={2}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Shapes className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a shape to edit</p>
                  <p className="text-sm mt-1">or scan an image to extract shapes</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={saveShapesToLibrary}
            disabled={isSaving || extractedShapes.length === 0}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save {extractedShapes.length} Shape(s) to Library
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
