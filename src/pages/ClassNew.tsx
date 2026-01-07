import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { RosterImageConverter } from '@/components/classes/RosterImageConverter';
import { CSVStudentUploader, ParsedStudent } from '@/components/classes/CSVStudentUploader';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function ClassNew() {
  const [name, setName] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [classPeriod, setClassPeriod] = useState('');
  const [customPeriod, setCustomPeriod] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingStudents, setPendingStudents] = useState<ParsedStudent[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const joinCode = generateJoinCode();
      
      const { data, error } = await supabase
        .from('classes')
        .insert({
          teacher_id: user.id,
          name,
          join_code: joinCode,
          school_year: schoolYear || null,
          class_period: classPeriod === 'other' ? customPeriod.trim() || null : classPeriod || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Import pending students if any
      if (pendingStudents.length > 0) {
        const studentsToInsert = pendingStudents.map(s => ({
          class_id: data.id,
          first_name: s.firstName,
          last_name: s.lastName,
          student_id: s.studentId || null,
          email: s.email || null,
        }));

        const { error: studentsError } = await supabase
          .from('students')
          .insert(studentsToInsert);

        if (studentsError) {
          console.error('Failed to import students:', studentsError);
          toast({
            title: 'Class created, but student import failed',
            description: studentsError.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Class created!',
            description: `Join code: ${joinCode}. Imported ${pendingStudents.length} students.`,
          });
        }
      } else {
        toast({
          title: 'Class created!',
          description: `Join code: ${joinCode}`,
        });
      }

      navigate(`/classes/${data.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create class',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/classes')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Classes
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Create a New Class</CardTitle>
                <CardDescription>
                  Set up a class and get a join code for students
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Geometry Period 3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolYear">School Year</Label>
                <Input
                  id="schoolYear"
                  placeholder="e.g., 2025-2026"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classPeriod">Class Period</Label>
                <Select value={classPeriod} onValueChange={setClassPeriod}>
                  <SelectTrigger id="classPeriod">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Period 1</SelectItem>
                    <SelectItem value="2">Period 2</SelectItem>
                    <SelectItem value="3">Period 3</SelectItem>
                    <SelectItem value="4">Period 4</SelectItem>
                    <SelectItem value="5">Period 5</SelectItem>
                    <SelectItem value="6">Period 6</SelectItem>
                    <SelectItem value="7">Period 7</SelectItem>
                    <SelectItem value="8">Period 8</SelectItem>
                    <SelectItem value="9">Period 9</SelectItem>
                    <SelectItem value="10">Period 10</SelectItem>
                    <SelectItem value="11">Period 11</SelectItem>
                    <SelectItem value="12">Period 12</SelectItem>
                    <SelectItem value="13">Period 13</SelectItem>
                    <SelectItem value="homeroom">Homeroom</SelectItem>
                    <SelectItem value="other">Other (custom)</SelectItem>
                  </SelectContent>
                </Select>
                {classPeriod === 'other' && (
                  <Input
                    placeholder="Enter custom period name"
                    value={customPeriod}
                    onChange={(e) => setCustomPeriod(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="pt-2 border-t space-y-3">
                <Label className="text-sm text-muted-foreground">Import Students (Optional)</Label>
                
                <CSVStudentUploader
                  onStudentsParsed={setPendingStudents}
                  parsedStudents={pendingStudents}
                  onClear={() => setPendingStudents([])}
                />
                
                <div className="flex items-center gap-2">
                  <RosterImageConverter />
                  <span className="text-xs text-muted-foreground">
                    or convert a roster photo to CSV
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/classes')}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="hero" disabled={isLoading || !name.trim()}>
                  {isLoading ? 'Creating...' : 'Create Class'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
