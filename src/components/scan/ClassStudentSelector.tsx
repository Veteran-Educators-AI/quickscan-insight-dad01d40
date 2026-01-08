import { useState, useEffect } from 'react';
import { Check, ChevronDown, Users, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useStudentNames } from '@/lib/StudentNameContext';

interface ClassOption {
  id: string;
  name: string;
  studentCount: number;
}

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
}

interface ClassStudentSelectorProps {
  selectedClassId: string | null;
  selectedStudentIds: string[];
  onClassChange: (classId: string | null) => void;
  onStudentsChange: (studentIds: string[]) => void;
  disabled?: boolean;
}

export function ClassStudentSelector({
  selectedClassId,
  selectedStudentIds,
  onClassChange,
  onStudentsChange,
  disabled = false,
}: ClassStudentSelectorProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [classOpen, setClassOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { getDisplayName } = useStudentNames();

  // Fetch classes
  useEffect(() => {
    async function fetchClasses() {
      setLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, students(id)')
        .order('name');

      if (!error && data) {
        setClasses(data.map(c => ({
          id: c.id,
          name: c.name,
          studentCount: c.students?.length || 0,
        })));
      }
      setLoading(false);
    }
    fetchClasses();
  }, []);

  // Fetch students when class changes
  useEffect(() => {
    async function fetchStudents() {
      if (!selectedClassId) {
        setStudents([]);
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id')
        .eq('class_id', selectedClassId)
        .order('last_name');

      if (!error && data) {
        setStudents(data);
      }
    }
    fetchStudents();
  }, [selectedClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const toggleStudent = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      onStudentsChange(selectedStudentIds.filter(id => id !== studentId));
    } else {
      onStudentsChange([...selectedStudentIds, studentId]);
    }
  };

  const selectAll = () => {
    onStudentsChange(students.map(s => s.id));
  };

  const deselectAll = () => {
    onStudentsChange([]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Select Class & Students
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Class Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Class</label>
          <Popover open={classOpen} onOpenChange={setClassOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={classOpen}
                className="w-full justify-between"
                disabled={disabled || loading}
              >
                {selectedClass ? (
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {selectedClass.name}
                    <Badge variant="secondary" className="ml-auto">
                      {selectedClass.studentCount} students
                    </Badge>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select a class...</span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search classes..." />
                <CommandList>
                  <CommandEmpty>No classes found.</CommandEmpty>
                  <CommandGroup>
                    {classes.map((classOption) => (
                      <CommandItem
                        key={classOption.id}
                        value={classOption.name}
                        onSelect={() => {
                          onClassChange(classOption.id);
                          onStudentsChange([]);
                          setClassOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedClassId === classOption.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1">{classOption.name}</span>
                        <Badge variant="outline">{classOption.studentCount}</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Student List */}
        {selectedClassId && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Students ({selectedStudentIds.length}/{students.length} selected)
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  disabled={disabled || selectedStudentIds.length === students.length}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  disabled={disabled || selectedStudentIds.length === 0}
                >
                  Clear
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-2 space-y-1">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No students in this class
                  </p>
                ) : (
                  students.map((student) => {
                    const displayName = getDisplayName(student.id, student.first_name, student.last_name);
                    return (
                    <div
                      key={student.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer",
                        selectedStudentIds.includes(student.id) && "bg-primary/10"
                      )}
                      onClick={() => !disabled && toggleStudent(student.id)}
                    >
                      <Checkbox
                        checked={selectedStudentIds.includes(student.id)}
                        disabled={disabled}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {displayName}
                        </p>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {!selectedClassId && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a class to see students
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function useClassStudents(classId: string | null) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchStudents() {
      if (!classId) {
        setStudents([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id')
        .eq('class_id', classId)
        .order('last_name');

      if (!error && data) {
        setStudents(data);
      }
      setLoading(false);
    }
    fetchStudents();
  }, [classId]);

  return { students, loading };
}
