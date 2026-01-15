import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface Interpretation {
  id: string;
  text: string;
  context: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface TeacherVerificationPanelProps {
  rawAnalysis: string;
  onVerificationComplete?: (interpretations: Interpretation[]) => void;
}

// Extract interpretations from the raw analysis text
function extractInterpretations(rawAnalysis: string): Interpretation[] {
  const interpretations: Interpretation[] = [];
  
  // Match patterns like [INTERPRETATION - VERIFY: ...] or similar
  const patterns = [
    /\[INTERPRETATION\s*[-–]\s*VERIFY:\s*([^\]]+)\]/gi,
    /\[VERIFY:\s*([^\]]+)\]/gi,
    /\[NEEDS\s+VERIFICATION:\s*([^\]]+)\]/gi,
    /INTERPRETATION:\s*([^.\n]+)/gi,
  ];
  
  let idCounter = 0;
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(rawAnalysis)) !== null) {
      const text = match[1].trim();
      // Get surrounding context (50 chars before and after)
      const startIndex = Math.max(0, match.index - 50);
      const endIndex = Math.min(rawAnalysis.length, match.index + match[0].length + 50);
      const context = rawAnalysis.slice(startIndex, endIndex);
      
      // Avoid duplicates
      if (!interpretations.some(i => i.text === text)) {
        interpretations.push({
          id: `interp-${idCounter++}`,
          text,
          context,
          status: 'pending',
        });
      }
    }
  }
  
  return interpretations;
}

export function TeacherVerificationPanel({ 
  rawAnalysis, 
  onVerificationComplete 
}: TeacherVerificationPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [interpretations, setInterpretations] = useState<Interpretation[]>(() => 
    extractInterpretations(rawAnalysis || '')
  );

  // Don't render if no interpretations need verification
  if (interpretations.length === 0) {
    return null;
  }

  const pendingCount = interpretations.filter(i => i.status === 'pending').length;
  const approvedCount = interpretations.filter(i => i.status === 'approved').length;
  const rejectedCount = interpretations.filter(i => i.status === 'rejected').length;

  const handleApprove = (id: string) => {
    const updated = interpretations.map(i => 
      i.id === id ? { ...i, status: 'approved' as const } : i
    );
    setInterpretations(updated);
    if (updated.every(i => i.status !== 'pending')) {
      onVerificationComplete?.(updated);
    }
  };

  const handleReject = (id: string) => {
    const updated = interpretations.map(i => 
      i.id === id ? { ...i, status: 'rejected' as const } : i
    );
    setInterpretations(updated);
    if (updated.every(i => i.status !== 'pending')) {
      onVerificationComplete?.(updated);
    }
  };

  const handleApproveAll = () => {
    const updated = interpretations.map(i => ({ ...i, status: 'approved' as const }));
    setInterpretations(updated);
    onVerificationComplete?.(updated);
  };

  const handleRejectAll = () => {
    const updated = interpretations.map(i => ({ ...i, status: 'rejected' as const }));
    setInterpretations(updated);
    onVerificationComplete?.(updated);
  };

  const getStatusIcon = (status: Interpretation['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: Interpretation['status']) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Pending Review</Badge>;
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600" />
              Teacher Verification Required
              {pendingCount > 0 && (
                <Badge variant="outline" className="ml-2 border-amber-500 text-amber-600">
                  {pendingCount} pending
                </Badge>
              )}
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            The AI made {interpretations.length} interpretation(s) that need your verification
          </p>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {approvedCount} approved
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" />
                {rejectedCount} rejected
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                {pendingCount} pending
              </span>
            </div>

            {/* Bulk Actions */}
            {pendingCount > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50"
                  onClick={handleApproveAll}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={handleRejectAll}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject All
                </Button>
              </div>
            )}

            {/* Individual Interpretations */}
            <div className="space-y-3">
              {interpretations.map((interpretation) => (
                <div
                  key={interpretation.id}
                  className={cn(
                    "border rounded-lg p-3 transition-colors",
                    interpretation.status === 'approved' && "border-green-200 bg-green-50/50 dark:bg-green-950/20",
                    interpretation.status === 'rejected' && "border-red-200 bg-red-50/50 dark:bg-red-950/20",
                    interpretation.status === 'pending' && "border-amber-200 bg-white dark:bg-background"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      {getStatusIcon(interpretation.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{interpretation.text}</p>
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Context: "...{interpretation.context}..."
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(interpretation.status)}
                  </div>

                  {interpretation.status === 'pending' && (
                    <div className="flex gap-2 mt-3 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => handleApprove(interpretation.id)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleReject(interpretation.id)}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {pendingCount === 0 && (
              <div className="text-center py-2">
                <Badge variant="outline" className="text-green-600 border-green-300">
                  ✓ All interpretations reviewed
                </Badge>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}