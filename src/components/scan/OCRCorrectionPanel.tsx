import { useState, useCallback } from 'react';
import { Edit3, Check, X, RotateCcw, AlertCircle, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useVerificationDecisions } from '@/hooks/useVerificationDecisions';

interface OCRCorrection {
  id: string;
  originalText: string;
  correctedText: string;
  type: 'number' | 'text' | 'expression';
  context?: string;
  status: 'pending' | 'corrected' | 'verified';
}

interface OCRCorrectionPanelProps {
  ocrText: string;
  onOCRCorrected?: (corrections: OCRCorrection[]) => void;
  attemptId?: string;
  studentId?: string;
  className?: string;
}

// Extract potential misread items from OCR text
function extractPotentialMisreads(ocrText: string): OCRCorrection[] {
  const corrections: OCRCorrection[] = [];
  let idCounter = 0;

  // Match numbers that might be commonly misread
  // Single digit numbers that often get confused
  const numberPatterns = [
    { pattern: /\b([0-9]+(?:\.[0-9]+)?)\b/g, type: 'number' as const },
  ];

  // Match mathematical expressions
  const expressionPatterns = [
    { pattern: /([0-9]+\s*[+\-*/÷×=≈≠<>≤≥]\s*[0-9]+)/g, type: 'expression' as const },
    { pattern: /(\d+\/\d+)/g, type: 'expression' as const }, // Fractions
    { pattern: /([xy]\s*[=<>]\s*[0-9\-]+)/gi, type: 'expression' as const }, // Variable equations
  ];

  // Find numbers
  for (const { pattern, type } of numberPatterns) {
    let match;
    while ((match = pattern.exec(ocrText)) !== null) {
      const value = match[1];
      // Only flag multi-digit numbers or decimals as they're more likely to have errors
      if (value.length >= 2 || value.includes('.')) {
        const startIdx = Math.max(0, match.index - 15);
        const endIdx = Math.min(ocrText.length, match.index + match[0].length + 15);
        const context = ocrText.slice(startIdx, endIdx);
        
        corrections.push({
          id: `ocr-${idCounter++}`,
          originalText: value,
          correctedText: value,
          type,
          context: `...${context}...`,
          status: 'pending',
        });
      }
    }
  }

  // Find expressions (limit to avoid duplicates)
  for (const { pattern, type } of expressionPatterns) {
    let match;
    const seenExpressions = new Set<string>();
    while ((match = pattern.exec(ocrText)) !== null) {
      const value = match[1];
      if (!seenExpressions.has(value)) {
        seenExpressions.add(value);
        const startIdx = Math.max(0, match.index - 10);
        const endIdx = Math.min(ocrText.length, match.index + match[0].length + 10);
        const context = ocrText.slice(startIdx, endIdx);
        
        corrections.push({
          id: `ocr-${idCounter++}`,
          originalText: value,
          correctedText: value,
          type,
          context: `...${context}...`,
          status: 'pending',
        });
      }
    }
  }

  // Limit to first 15 items to avoid overwhelming the UI
  return corrections.slice(0, 15);
}

export function OCRCorrectionPanel({
  ocrText,
  onOCRCorrected,
  attemptId,
  studentId,
  className,
}: OCRCorrectionPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [corrections, setCorrections] = useState<OCRCorrection[]>(() => 
    extractPotentialMisreads(ocrText || '')
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [hasSaved, setHasSaved] = useState(false);
  const { saveVerificationDecisions, isSaving } = useVerificationDecisions();

  const correctedCount = corrections.filter(c => c.status === 'corrected').length;
  const verifiedCount = corrections.filter(c => c.status === 'verified').length;

  const handleStartEdit = useCallback((correction: OCRCorrection) => {
    setEditingId(correction.id);
    setTempValue(correction.correctedText);
  }, []);

  const handleSaveEdit = useCallback((id: string) => {
    setCorrections(prev => prev.map(c => {
      if (c.id === id) {
        const isChanged = c.originalText !== tempValue;
        return {
          ...c,
          correctedText: tempValue,
          status: isChanged ? 'corrected' : 'verified',
        };
      }
      return c;
    }));
    setEditingId(null);
    setTempValue('');
    setHasSaved(false);
  }, [tempValue]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setTempValue('');
  }, []);

  const handleVerifyAsCorrect = useCallback((id: string) => {
    setCorrections(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'verified' } : c
    ));
    setHasSaved(false);
  }, []);

  const handleResetCorrection = useCallback((id: string) => {
    setCorrections(prev => prev.map(c =>
      c.id === id ? { ...c, correctedText: c.originalText, status: 'pending' } : c
    ));
    setHasSaved(false);
  }, []);

  const handleSaveAllCorrections = async () => {
    // Save corrections as verification decisions
    const decisions = corrections
      .filter(c => c.status === 'corrected')
      .map(c => ({
        originalText: c.originalText,
        interpretation: `OCR read as: ${c.originalText}`,
        decision: 'rejected' as const,
        correctInterpretation: c.correctedText,
        context: c.context,
      }));

    if (decisions.length > 0) {
      const success = await saveVerificationDecisions(decisions, attemptId, studentId);
      if (success) {
        setHasSaved(true);
        onOCRCorrected?.(corrections.filter(c => c.status !== 'pending'));
      }
    } else {
      setHasSaved(true);
      onOCRCorrected?.(corrections.filter(c => c.status !== 'pending'));
    }
  };

  const handleVerifyAll = useCallback(() => {
    setCorrections(prev => prev.map(c => ({
      ...c,
      status: c.status === 'pending' ? 'verified' : c.status,
    })));
    setHasSaved(false);
  }, []);

  if (!ocrText || corrections.length === 0) {
    return null;
  }

  const getTypeIcon = (type: OCRCorrection['type']) => {
    switch (type) {
      case 'number':
        return '🔢';
      case 'expression':
        return '📐';
      default:
        return '📝';
    }
  };

  const getTypeBadge = (type: OCRCorrection['type']) => {
    switch (type) {
      case 'number':
        return <Badge variant="outline" className="text-[10px] px-1">Number</Badge>;
      case 'expression':
        return <Badge variant="outline" className="text-[10px] px-1">Expression</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1">Text</Badge>;
    }
  };

  return (
    <Card className={cn("border-blue-200 bg-blue-50/50 dark:bg-blue-950/20", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-blue-600" />
              OCR Correction
              {(correctedCount > 0 || verifiedCount > 0) && (
                <Badge variant="outline" className="ml-2 border-blue-300 text-blue-600">
                  {correctedCount} fixed, {verifiedCount} verified
                </Badge>
              )}
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? 'Hide' : 'Review'}
              </Button>
            </CollapsibleTrigger>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Review and correct any numbers or text that may have been misread by the AI
          </p>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Bulk actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={handleVerifyAll}
              >
                <Check className="h-3 w-3 mr-1" />
                Verify All Correct
              </Button>
            </div>

            {/* Items list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {corrections.map((correction) => (
                <div
                  key={correction.id}
                  className={cn(
                    "border rounded-lg p-3 transition-colors",
                    correction.status === 'corrected' && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20",
                    correction.status === 'verified' && "border-green-200 bg-green-50/50 dark:bg-green-950/20",
                    correction.status === 'pending' && "border-blue-200 bg-white dark:bg-background"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{getTypeIcon(correction.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeBadge(correction.type)}
                          {correction.status === 'corrected' && (
                            <Badge className="bg-amber-500 text-[10px] px-1">Corrected</Badge>
                          )}
                          {correction.status === 'verified' && (
                            <Badge className="bg-green-600 text-[10px] px-1">✓ Verified</Badge>
                          )}
                        </div>
                        
                        {editingId === correction.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              className="h-8 text-sm font-mono"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(correction.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600"
                              onClick={() => handleSaveEdit(correction.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <code className={cn(
                              "text-sm font-mono px-2 py-0.5 rounded",
                              correction.status === 'corrected' 
                                ? "bg-amber-100 dark:bg-amber-900/30" 
                                : "bg-muted"
                            )}>
                              {correction.status === 'corrected' && correction.originalText !== correction.correctedText && (
                                <span className="line-through text-muted-foreground mr-2">
                                  {correction.originalText}
                                </span>
                              )}
                              {correction.correctedText}
                            </code>
                          </div>
                        )}
                        
                        {correction.context && (
                          <p className="text-[10px] text-muted-foreground mt-1 italic truncate">
                            Context: {correction.context}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {editingId !== correction.id && (
                      <div className="flex items-center gap-1">
                        {correction.status === 'pending' && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleStartEdit(correction)}
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit this value</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-green-600"
                                    onClick={() => handleVerifyAsCorrect(correction.id)}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Verify as correct</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                        {correction.status !== 'pending' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleResetCorrection(correction.id)}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reset to original</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Save button */}
            {(correctedCount > 0 || verifiedCount > 0) && !hasSaved && (
              <Button
                size="sm"
                onClick={handleSaveAllCorrections}
                disabled={isSaving}
                className="w-full gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Corrections to Improve AI
              </Button>
            )}

            {hasSaved && (
              <div className="text-center">
                <Badge variant="outline" className="text-green-600 border-green-300">
                  ✓ Corrections saved - AI will learn from these
                </Badge>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
