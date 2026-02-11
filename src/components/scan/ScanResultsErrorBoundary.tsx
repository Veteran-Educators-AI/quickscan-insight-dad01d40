import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ScanResultsErrorBoundaryProps {
  children: React.ReactNode;
  grade?: number;
  studentName?: string;
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
      const { grade, studentName } = this.props;

      return (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Results display encountered an error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {grade !== undefined && (
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
            )}
            <p className="text-sm text-muted-foreground">
              The analysis completed successfully but the detailed view failed to render. 
              Your grade data has been saved. Try refreshing to see full details.
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {this.state.error?.message}
            </p>
            <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
