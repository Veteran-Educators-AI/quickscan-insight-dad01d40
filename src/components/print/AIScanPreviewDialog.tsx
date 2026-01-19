import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Scan, Target, Maximize2, Grid3X3, CornerUpLeft, CornerUpRight, CornerDownLeft, CornerDownRight } from 'lucide-react';

interface Question {
  id: string;
  prompt_text: string | null;
  topicName?: string;
}

interface AIScanPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: Question[];
  studentName?: string;
}

export function AIScanPreviewDialog({
  open,
  onOpenChange,
  questions,
  studentName = 'Student',
}: AIScanPreviewDialogProps) {
  const [showZoomZones, setShowZoomZones] = useState(true);
  const [showWorkAreas, setShowWorkAreas] = useState(true);
  const [showAnswerZones, setShowAnswerZones] = useState(true);
  const [showVicinityRadius, setShowVicinityRadius] = useState(true);
  const [showCornerMarkers, setShowCornerMarkers] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            AI Scan Preview Mode
          </DialogTitle>
          <DialogDescription>
            See exactly how the AI will interpret bounded zones and scan regions on your worksheet
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="shrink-0 flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Switch id="zoom-zones" checked={showZoomZones} onCheckedChange={setShowZoomZones} />
            <Label htmlFor="zoom-zones" className="text-sm flex items-center gap-1.5">
              <Grid3X3 className="h-3.5 w-3.5 text-blue-500" />
              3x Zoom Zones
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="work-areas" checked={showWorkAreas} onCheckedChange={setShowWorkAreas} />
            <Label htmlFor="work-areas" className="text-sm flex items-center gap-1.5">
              <Scan className="h-3.5 w-3.5 text-green-500" />
              Work Areas
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="answer-zones" checked={showAnswerZones} onCheckedChange={setShowAnswerZones} />
            <Label htmlFor="answer-zones" className="text-sm flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-amber-500" />
              Answer Zones
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="vicinity" checked={showVicinityRadius} onCheckedChange={setShowVicinityRadius} />
            <Label htmlFor="vicinity" className="text-sm flex items-center gap-1.5">
              <Maximize2 className="h-3.5 w-3.5 text-purple-500" />
              Vicinity Radius
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="corners" checked={showCornerMarkers} onCheckedChange={setShowCornerMarkers} />
            <Label htmlFor="corners" className="text-sm flex items-center gap-1.5">
              <CornerUpLeft className="h-3.5 w-3.5 text-rose-500" />
              Corner Scan
            </Label>
          </div>
        </div>

        {/* Legend */}
        <div className="shrink-0 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <div className="w-2 h-2 bg-blue-500/30 border border-blue-500 mr-1.5" />
            3x Zoom Zone
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <div className="w-2 h-2 bg-green-500/30 border border-green-500 mr-1.5" />
            Work Area
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
            <div className="w-2 h-2 bg-amber-500/30 border border-amber-500 mr-1.5" />
            Final Answer
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
            <div className="w-2 h-2 bg-purple-500/20 border border-purple-500 border-dashed mr-1.5 rounded-full" />
            Vicinity Search
          </Badge>
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300">
            <CornerUpRight className="h-3 w-3 mr-1" />
            Corner Scan
          </Badge>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto">
          <div 
            className="relative bg-white border-2 border-gray-300 rounded-lg mx-auto"
            style={{ 
              width: '100%',
              maxWidth: '680px',
              minHeight: '800px',
              padding: '40px',
            }}
          >
            {/* 3x Zoom Zone Overlay - Top */}
            {showZoomZones && (
              <>
                <div className="absolute top-0 left-0 right-0 h-1/3 border-2 border-blue-400 border-dashed bg-blue-500/5 pointer-events-none z-10">
                  <span className="absolute top-1 left-2 text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    ZONE 1: TOP (3x Zoom)
                  </span>
                </div>
                <div className="absolute top-1/3 left-0 right-0 h-1/3 border-2 border-blue-400 border-dashed bg-blue-500/5 pointer-events-none z-10">
                  <span className="absolute top-1 left-2 text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    ZONE 2: MIDDLE (3x Zoom)
                  </span>
                </div>
                <div className="absolute top-2/3 left-0 right-0 h-1/3 border-2 border-blue-400 border-dashed bg-blue-500/5 pointer-events-none z-10">
                  <span className="absolute top-1 left-2 text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    ZONE 3: BOTTOM (3x Zoom)
                  </span>
                </div>
                {/* Left/Right Edge Zones */}
                <div className="absolute top-0 left-0 w-12 h-full border-r-2 border-blue-400 border-dashed bg-blue-500/10 pointer-events-none z-10">
                  <span className="absolute top-1/2 -translate-y-1/2 -rotate-90 text-[8px] font-bold text-blue-600 bg-blue-100 px-1 py-0.5 rounded whitespace-nowrap">
                    LEFT EDGE
                  </span>
                </div>
                <div className="absolute top-0 right-0 w-12 h-full border-l-2 border-blue-400 border-dashed bg-blue-500/10 pointer-events-none z-10">
                  <span className="absolute top-1/2 -translate-y-1/2 rotate-90 text-[8px] font-bold text-blue-600 bg-blue-100 px-1 py-0.5 rounded whitespace-nowrap">
                    RIGHT EDGE
                  </span>
                </div>
              </>
            )}

            {/* Corner Markers */}
            {showCornerMarkers && (
              <>
                <div className="absolute top-2 left-2 z-20">
                  <CornerUpLeft className="h-8 w-8 text-rose-500" />
                  <span className="text-[8px] text-rose-600 font-bold">CORNER</span>
                </div>
                <div className="absolute top-2 right-2 z-20">
                  <CornerUpRight className="h-8 w-8 text-rose-500" />
                  <span className="text-[8px] text-rose-600 font-bold">CORNER</span>
                </div>
                <div className="absolute bottom-2 left-2 z-20">
                  <CornerDownLeft className="h-8 w-8 text-rose-500" />
                  <span className="text-[8px] text-rose-600 font-bold">CORNER</span>
                </div>
                <div className="absolute bottom-2 right-2 z-20">
                  <CornerDownRight className="h-8 w-8 text-rose-500" />
                  <span className="text-[8px] text-rose-600 font-bold">CORNER</span>
                </div>
              </>
            )}

            {/* Worksheet Content */}
            <div className="relative z-0">
              {/* Header */}
              <div className="mb-4 pb-3 border-b-2 border-gray-800">
                <h2 className="text-lg font-bold">Diagnostic Worksheet</h2>
                <p className="text-sm text-gray-600">Student: {studentName}</p>
              </div>

              {/* Questions */}
              <div className="space-y-8">
                {questions.slice(0, 3).map((question, index) => (
                  <div key={question.id} className="relative">
                    {/* Vicinity Radius Overlay */}
                    {showVicinityRadius && (
                      <div 
                        className="absolute -inset-8 border-2 border-purple-400 border-dashed rounded-xl bg-purple-500/5 pointer-events-none"
                        style={{ zIndex: 5 }}
                      >
                        <span className="absolute -top-3 left-4 text-[9px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                          VICINITY SEARCH: 2-3" radius scanned for Q{index + 1}
                        </span>
                      </div>
                    )}

                    {/* Question */}
                    <div className="relative z-10">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-bold text-lg">{index + 1}.</span>
                        <span className="text-sm text-gray-700">
                          {question.prompt_text?.substring(0, 80) || 'Sample question text...'}
                          {(question.prompt_text?.length || 0) > 80 ? '...' : ''}
                        </span>
                      </div>

                      {/* AI-Optimized Answer Box Preview */}
                      <div className="border-3 border-gray-800 rounded-lg overflow-hidden" style={{ borderWidth: '3px' }}>
                        {/* Work Area */}
                        <div className={`relative p-3 ${showWorkAreas ? 'bg-green-50' : 'bg-gray-50'}`}>
                          {showWorkAreas && (
                            <div className="absolute inset-0 border-2 border-green-500 bg-green-500/10 pointer-events-none">
                              <span className="absolute top-0 right-0 text-[9px] font-bold text-green-700 bg-green-200 px-1.5 py-0.5">
                                AI SCANS: Work Area Q{index + 1}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-gray-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                              ✏️ Work Area Q{index + 1}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="h-5 border-b border-gray-300" />
                            ))}
                          </div>
                          {/* Corner markers */}
                          <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-gray-800" />
                          <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-gray-800" />
                        </div>

                        {/* Final Answer */}
                        <div className={`relative p-3 border-t-2 border-amber-500 ${showAnswerZones ? 'bg-amber-100' : 'bg-amber-50'}`}>
                          {showAnswerZones && (
                            <div className="absolute inset-0 border-2 border-amber-500 bg-amber-500/20 pointer-events-none">
                              <span className="absolute top-0 right-0 text-[9px] font-bold text-amber-800 bg-amber-300 px-1.5 py-0.5">
                                AI READS: Final Answer
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded border-2 border-amber-500">
                              📝 Final Answer
                            </span>
                            <div className="flex-1 h-6 border-b-2 border-amber-600 bg-amber-50" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Margin Scan Indicators */}
              <div className="mt-8 p-3 bg-gray-100 rounded border border-gray-300">
                <p className="text-xs text-gray-600 text-center">
                  <strong>AI Scan Protocol:</strong> All margins, corners, and blank spaces are scanned at 3x zoom for any student work
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-3 border-t flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            The AI scans all highlighted zones to ensure no student work is missed
          </p>
          <Button onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
