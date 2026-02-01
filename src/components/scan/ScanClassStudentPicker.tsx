import { useState, useEffect } from 'react';
import { Check, ChevronDown, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface ScanClassStudentPickerProps {
  selectedClassId: string | null;
  selectedStudentId: string | null;
  onClassChange: (classId: string | null) => void;
  onStudentChange: (studentId: string | null) => void;
  disabled?: boolean;
}

export function ScanClassStudentPicker({
  selectedClassId,
  selectedStudentId,
  onClassChange,
  onStudentChange,
  disabled = false,
}: ScanClassStudentPickerProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [classOpen, setClassOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { getDisplayName } = useStudentNames();

  // Fetch classes
  useEffect(() => {
    async function fetchClasses() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, students(id)')
          .is('archived_at', null)
          .order('name');

        if (error) {
          console.error('Error fetching classes:', error);
        }
        
        if (data) {
          console.log('Fetched classes:', data.length, data.map(c => c.name));
          setClasses(data.map(c => ({
            id: c.id,
            name: c.name,
            studentCount: c.students?.length || 0,
          })));
        }
      } catch (e) {
        console.error('Exception fetching classes:', e);
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
        .order('last_name')
        .limit(500);

      if (!error && data) {
        setStudents(data);
      }
    }
    fetchStudents();
  }, [selectedClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Class Picker */}
      <Popover open={classOpen} onOpenChange={setClassOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={classOpen}
            className="justify-between min-w-[150px]"
            disabled={disabled || loading}
          >
            <Users className="h-4 w-4 mr-2 shrink-0" />
            {selectedClass ? (
              <span className="truncate">{selectedClass.name}</span>
            ) : (
              <span className="text-muted-foreground">Select class...</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
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
                      onStudentChange(null);
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
                    <Badge variant="outline" className="ml-2">
                      {classOption.studentCount}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Student Picker */}
      <Popover open={studentOpen} onOpenChange={setStudentOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={studentOpen}
            className="justify-between min-w-[180px]"
            disabled={disabled || !selectedClassId}
          >
            <User className="h-4 w-4 mr-2 shrink-0" />
            {selectedStudent ? (
              <span className="truncate">
                {getDisplayName(selectedStudent.id, selectedStudent.first_name, selectedStudent.last_name)}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {selectedClassId ? 'Select student...' : 'Select class first'}
              </span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <Command>
            <CommandInput placeholder="Search students..." />
            <ScrollArea className="h-[300px]">
              <CommandList className="max-h-none">
                <CommandEmpty>No students found in this class.</CommandEmpty>
                <CommandGroup heading={`${students.length} students`}>
                  {students.map((student) => {
                    const displayName = getDisplayName(student.id, student.first_name, student.last_name);
                    return (
                      <CommandItem
                        key={student.id}
                        value={`${student.first_name} ${student.last_name} ${displayName}`}
                        onSelect={() => {
                          onStudentChange(student.id);
                          setStudentOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            selectedStudentId === student.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1 truncate">
                          {displayName}
                        </span>
                        {student.student_id && (
                          <span className="text-xs text-muted-foreground ml-2">
                            #{student.student_id}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedStudent && (
        <Badge variant="secondary" className="gap-1">
          <User className="h-3 w-3" />
          {getDisplayName(selectedStudent.id, selectedStudent.first_name, selectedStudent.last_name)}
        </Badge>
      )}
    </div>
  );
}

// Export hook to get student name by ID
export function useStudentName(studentId: string | null) {
  const [studentName, setStudentName] = useState<string | null>(null);
  const { getDisplayName } = useStudentNames();

  useEffect(() => {
    async function fetchStudent() {
      if (!studentId) {
        setStudentName(null);
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('id', studentId)
        .single();

      if (!error && data) {
        setStudentName(getDisplayName(studentId, data.first_name, data.last_name));
      }
    }
    fetchStudent();
  }, [studentId, getDisplayName]);

  return studentName;
}
