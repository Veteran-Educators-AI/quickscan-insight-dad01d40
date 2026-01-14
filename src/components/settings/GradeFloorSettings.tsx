import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, GraduationCap, AlertTriangle, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { GradeRecalculationDialog } from '@/components/reports/GradeRecalculationDialog';

const GRADE_FLOOR_OPTIONS = [
  { value: 50, label: '50', description: 'Minimum for any submission' },
  { value: 55, label: '55', description: 'NYS Regents standard minimum' },
  { value: 60, label: '60', description: 'Slightly higher minimum' },
  { value: 65, label: '65', description: 'Higher minimum for effort' },
];

const GRADE_FLOOR_EFFORT_OPTIONS = [
  { value: 55, label: '55', description: 'Standard minimum' },
  { value: 60, label: '60', description: 'Slightly higher' },
  { value: 65, label: '65', description: 'Effort-based minimum (recommended)' },
  { value: 70, label: '70', description: 'Higher effort floor' },
];

export function GradeFloorSettings() {
  const { user } = useAuth();
  const [gradeFloor, setGradeFloor] = useState<number>(55);
  const [gradeFloorWithEffort, setGradeFloorWithEffort] = useState<number>(65);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalValues, setOriginalValues] = useState({ gradeFloor: 55, gradeFloorWithEffort: 65 });
  const [showRecalcDialog, setShowRecalcDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('grade_floor, grade_floor_with_effort')
        .eq('teacher_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading grade floor settings:', error);
        toast.error('Failed to load grade floor settings');
        return;
      }

      if (data) {
        const floor = data.grade_floor ?? 55;
        const effortFloor = data.grade_floor_with_effort ?? 65;
        setGradeFloor(floor);
        setGradeFloorWithEffort(effortFloor);
        setOriginalValues({ gradeFloor: floor, gradeFloorWithEffort: effortFloor });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFloorChange = (value: string) => {
    const newFloor = parseInt(value);
    setGradeFloor(newFloor);
    setHasChanges(newFloor !== originalValues.gradeFloor || gradeFloorWithEffort !== originalValues.gradeFloorWithEffort);
  };

  const handleEffortFloorChange = (value: string) => {
    const newEffortFloor = parseInt(value);
    setGradeFloorWithEffort(newEffortFloor);
    setHasChanges(gradeFloor !== originalValues.gradeFloor || newEffortFloor !== originalValues.gradeFloorWithEffort);
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          teacher_id: user.id,
          grade_floor: gradeFloor,
          grade_floor_with_effort: gradeFloorWithEffort,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'teacher_id',
        });

      if (error) throw error;

      setOriginalValues({ gradeFloor, gradeFloorWithEffort });
      setHasChanges(false);
      toast.success('Grade floor settings saved');
    } catch (error) {
      console.error('Error saving grade floor settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Grade Floor Settings
        </CardTitle>
        <CardDescription>
          Set minimum grades for student work. These settings apply to all AI-graded assignments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Minimum Grade Floor */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Absolute Minimum Grade
            <Badge variant="outline" className="text-xs">
              For blank/irrelevant work
            </Badge>
          </Label>
          <Select value={gradeFloor.toString()} onValueChange={handleFloorChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select minimum grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_FLOOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-muted-foreground text-xs">- {option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This grade is given when student submits blank work or completely irrelevant content.
          </p>
        </div>

        {/* Grade Floor with Effort */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Minimum Grade for Work Showing Effort
            <Badge variant="secondary" className="text-xs">
              For any understanding shown
            </Badge>
          </Label>
          <Select value={gradeFloorWithEffort.toString()} onValueChange={handleEffortFloorChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select effort floor" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_FLOOR_EFFORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-muted-foreground text-xs">- {option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This grade is the minimum for any work that shows understanding, even if limited.
          </p>
        </div>

        {/* Warning if effort floor is less than base floor */}
        {gradeFloorWithEffort < gradeFloor && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              The effort floor should be higher than or equal to the absolute minimum. Currently, work showing effort would get a lower grade than blank work.
            </p>
          </div>
        )}

        {/* Preview */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">Grade Floor Preview:</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between p-2 bg-background rounded border">
              <span className="text-muted-foreground">Blank/Irrelevant work:</span>
              <span className="font-bold text-orange-600">{gradeFloor}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-background rounded border">
              <span className="text-muted-foreground">Work showing effort:</span>
              <span className="font-bold text-green-600">{gradeFloorWithEffort}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !hasChanges}
            className="flex-1"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowRecalcDialog(true)}
          >
            <Calculator className="mr-2 h-4 w-4" />
            Recalculate Grades
          </Button>
        </div>

        {/* Hint about recalculation */}
        <p className="text-xs text-muted-foreground text-center">
          After changing settings, use "Recalculate Grades" to update existing grades.
        </p>
      </CardContent>

      {/* Grade Recalculation Dialog */}
      <GradeRecalculationDialog
        open={showRecalcDialog}
        onOpenChange={setShowRecalcDialog}
      />
    </Card>
  );
}