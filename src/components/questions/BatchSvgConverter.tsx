import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Play, Pause, CheckCircle, XCircle, ImageIcon, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BatchSvgConverterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConversionResult {
  id: string;
  success: boolean;
  error?: string;
}

interface ShapePreview {
  id: string;
  shape_type: string;
  description: string | null;
  has_svg: boolean;
  thumbnail_url: string | null;
}

export function BatchSvgConverter({ open, onOpenChange }: BatchSvgConverterProps) {
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [stats, setStats] = useState({ total: 0, withSvg: 0, needsConversion: 0 });
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [shapes, setShapes] = useState<ShapePreview[]>([]);

  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Get total count
      const { count: total } = await supabase
        .from('regents_shape_library')
        .select('id', { count: 'exact', head: true });

      // Get count with SVG data
      const { count: withSvg } = await supabase
        .from('regents_shape_library')
        .select('id', { count: 'exact', head: true })
        .not('svg_data', 'is', null);

      // Get shapes needing conversion (no SVG data)
      const { data: needsWork, count: needsConversion } = await supabase
        .from('regents_shape_library')
        .select('id, shape_type, description, svg_data, thumbnail_url', { count: 'exact' })
        .is('svg_data', null)
        .limit(20);

      setStats({
        total: total || 0,
        withSvg: withSvg || 0,
        needsConversion: needsConversion || 0,
      });

      setShapes(
        (needsWork || []).map((s) => ({
          id: s.id,
          shape_type: s.shape_type,
          description: s.description,
          has_svg: !!s.svg_data,
          thumbnail_url: s.thumbnail_url,
        }))
      );
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runBatchConversion = async () => {
    setIsConverting(true);
    setResults([]);
    setProgress(0);

    const batchSize = 5;
    let processedTotal = 0;
    const allResults: ConversionResult[] = [];

    try {
      while (processedTotal < stats.needsConversion) {
        const { data, error } = await supabase.functions.invoke('batch-convert-shapes-to-svg', {
          body: { batchSize },
        });

        if (error) {
          throw error;
        }

        if (data.results) {
          allResults.push(...data.results);
          setResults([...allResults]);
        }

        processedTotal += data.processed || 0;
        setProgress(Math.min(100, (processedTotal / stats.needsConversion) * 100));

        if (data.remaining === 0 || data.processed === 0) {
          break;
        }

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const successCount = allResults.filter((r) => r.success).length;
      toast({
        title: 'Conversion Complete',
        description: `Successfully converted ${successCount} of ${allResults.length} shapes to SVG`,
      });

      // Reload stats
      await loadStats();
    } catch (error) {
      console.error('Batch conversion error:', error);
      toast({
        title: 'Conversion Error',
        description: error instanceof Error ? error.message : 'Failed to convert shapes',
        variant: 'destructive',
      });
    } finally {
      setIsConverting(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Batch SVG Converter
          </DialogTitle>
          <DialogDescription>
            Convert existing Regents shapes to clean SVGs for worksheet generation
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Shapes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.withSvg}</div>
                  <div className="text-sm text-muted-foreground">Have SVG</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.needsConversion}</div>
                  <div className="text-sm text-muted-foreground">Need Conversion</div>
                </CardContent>
              </Card>
            </div>

            {/* Progress */}
            {isConverting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Converting shapes...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    {successCount} success
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" />
                    {failCount} failed
                  </span>
                </div>
              </div>
            )}

            {/* Preview of shapes to convert */}
            {shapes.length > 0 && !isConverting && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Shapes Pending Conversion</h4>
                <ScrollArea className="h-48 border rounded-lg p-2">
                  <div className="grid grid-cols-4 gap-2">
                    {shapes.map((shape) => (
                      <div
                        key={shape.id}
                        className="border rounded p-2 text-center"
                        title={shape.description || shape.shape_type}
                      >
                        {shape.thumbnail_url ? (
                          <img
                            src={shape.thumbnail_url}
                            alt={shape.shape_type}
                            className="w-full h-16 object-contain mb-1"
                          />
                        ) : (
                          <div className="w-full h-16 bg-muted flex items-center justify-center mb-1">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <Badge variant="secondary" className="text-xs truncate max-w-full">
                          {shape.shape_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && !isConverting && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Conversion Results</h4>
                <ScrollArea className="h-32 border rounded-lg p-2">
                  <div className="space-y-1">
                    {results.map((result, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-mono text-xs">{result.id.slice(0, 8)}...</span>
                        {result.error && (
                          <span className="text-muted-foreground text-xs">{result.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={runBatchConversion}
            disabled={isConverting || stats.needsConversion === 0}
          >
            {isConverting ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Converting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Conversion ({stats.needsConversion})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
