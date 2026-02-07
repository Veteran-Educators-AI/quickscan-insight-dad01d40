import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileX } from 'lucide-react';
import { useBlankPageSettings } from '@/hooks/useBlankPageSettings';
import { toast } from 'sonner';

export function BlankPageSettings() {
  const { settings, isLoading, updateSettings } = useBlankPageSettings();

  const handleToggle = async (enabled: boolean) => {
    const success = await updateSettings({ autoScoreBlankPages: enabled });
    if (success) {
      toast.success(enabled ? 'Auto-score blank pages enabled' : 'Auto-score blank pages disabled');
    } else {
      toast.error('Failed to update settings');
    }
  };

  const handleScoreChange = async (value: number[]) => {
    const success = await updateSettings({ blankPageScore: value[0] });
    if (!success) {
      toast.error('Failed to update blank page score');
    }
  };

  const handleCommentChange = async (comment: string) => {
    const success = await updateSettings({ blankPageComment: comment });
    if (!success) {
      toast.error('Failed to update comment template');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileX className="h-5 w-5" />
          No Response / Blank Page Detection
        </CardTitle>
        <CardDescription>
          Automatically detect blank pages and assign a configurable score without using AI credits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <FileX className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <Label htmlFor="blank-page-toggle" className="font-medium">
                Auto-Score Blank Pages
              </Label>
              <p className="text-xs text-muted-foreground">
                Skip AI grading for pages with no student work
              </p>
            </div>
          </div>
          <Switch
            id="blank-page-toggle"
            checked={settings.autoScoreBlankPages}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>

        {settings.autoScoreBlankPages && (
          <>
            {/* Score Slider */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Blank Page Score</Label>
                <Badge variant="secondary" className="text-lg tabular-nums">
                  {settings.blankPageScore}
                </Badge>
              </div>
              <Slider
                value={[settings.blankPageScore]}
                onValueChange={handleScoreChange}
                min={0}
                max={65}
                step={5}
                disabled={isLoading}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>55 (default)</span>
                <span>65</span>
              </div>
            </div>

            {/* Comment Template */}
            <div className="space-y-2">
              <Label className="font-medium">Comment Template</Label>
              <Textarea
                value={settings.blankPageComment}
                onChange={(e) => handleCommentChange(e.target.value)}
                placeholder="Comment to attach to blank pages..."
                rows={2}
                disabled={isLoading}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This comment is saved with each auto-scored blank page
              </p>
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm">
              <FileX className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">How it works:</span> Before calling the AI grader, each page's extracted text is checked. If less than 20 meaningful characters are found (after removing headers, page numbers, and boilerplate), the page is scored as {settings.blankPageScore} and the AI is not called — saving credits.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
