import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { SimpleResultsView, type SimpleResult } from './SimpleResultsView';

interface ScanResultsErrorBoundaryProps {
  children: React.ReactNode;
  grade?: number;
  studentName?: string;
  result?: SimpleResult | null;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ScanResultsErrorBoundary extends React.Component<ScanResultsErrorBoundaryProps, State> {
  constructor(props: ScanResultsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ScanResultsErrorBoundary] Component crashed:', error.message);
    console.error('[ScanResultsErrorBoundary] Stack:', errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      const { grade, studentName, result } = this.props;

      return (
        <div className="space-y-4">
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Detailed view crashed — showing simplified results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The advanced display had an error, but all grade data is shown below.
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {this.state.error?.message}
              </p>
              <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Full View Again
              </Button>
            </CardContent>
          </Card>

          {/* Show full results via the crash-proof SimpleResultsView */}
          {result ? (
            <SimpleResultsView result={result} studentName={studentName} />
          ) : grade !== undefined ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Grade:</span>
                  <Badge
                    variant={grade >= 80 ? 'default' : grade >= 60 ? 'secondary' : 'destructive'}
                    className="text-lg px-3 py-1"
                  >
                    {grade}%
                  </Badge>
                  {studentName && (
                    <span className="text-sm text-muted-foreground">— {studentName}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}
