import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export interface ParsedStudent {
  firstName: string;
  lastName: string;
  studentId?: string;
  email?: string;
}

interface CSVStudentUploaderProps {
  onStudentsParsed: (students: ParsedStudent[]) => void;
  parsedStudents: ParsedStudent[];
  onClear: () => void;
}

export function CSVStudentUploader({ onStudentsParsed, parsedStudents, onClear }: CSVStudentUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (text: string): ParsedStudent[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Find column indices
    const firstNameIdx = headers.findIndex(h => 
      h.includes('first') || h === 'firstname' || h === 'first_name'
    );
    const lastNameIdx = headers.findIndex(h => 
      h.includes('last') || h === 'lastname' || h === 'last_name'
    );
    const studentIdIdx = headers.findIndex(h => 
      h.includes('student') && h.includes('id') || h === 'studentid' || h === 'student_id' || h === 'id'
    );
    const emailIdx = headers.findIndex(h => h.includes('email'));

    if (firstNameIdx === -1 || lastNameIdx === -1) {
      // Try to detect "name" column for full names
      const nameIdx = headers.findIndex(h => h === 'name' || h === 'full_name' || h === 'fullname');
      if (nameIdx !== -1) {
        return lines.slice(1).map(line => {
          const cols = parseCSVLine(line);
          const fullName = cols[nameIdx] || '';
          const parts = fullName.trim().split(/\s+/);
          return {
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || '',
            studentId: studentIdIdx !== -1 ? cols[studentIdIdx] : undefined,
            email: emailIdx !== -1 ? cols[emailIdx] : undefined,
          };
        }).filter(s => s.firstName || s.lastName);
      }
      throw new Error('CSV must have first_name and last_name columns (or a name column)');
    }

    return lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      return {
        firstName: cols[firstNameIdx] || '',
        lastName: cols[lastNameIdx] || '',
        studentId: studentIdIdx !== -1 ? cols[studentIdIdx] : undefined,
        email: emailIdx !== -1 ? cols[emailIdx] : undefined,
      };
    }).filter(s => s.firstName || s.lastName);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const students = parseCSV(text);
        if (students.length === 0) {
          throw new Error('No students found in CSV');
        }
        onStudentsParsed(students);
        toast({
          title: 'CSV parsed successfully',
          description: `Found ${students.length} students`,
        });
      } catch (error: any) {
        toast({
          title: 'Failed to parse CSV',
          description: error.message || 'Check your CSV format',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<ParsedStudent | null>(null);

  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditValues({ ...parsedStudents[index] });
  };

  const handleEditSave = () => {
    if (editingIndex !== null && editValues) {
      const updated = [...parsedStudents];
      updated[editingIndex] = editValues;
      onStudentsParsed(updated);
      setEditingIndex(null);
      setEditValues(null);
    }
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditValues(null);
  };

  const handleRemoveStudent = (index: number) => {
    const updated = parsedStudents.filter((_, i) => i !== index);
    onStudentsParsed(updated);
  };

  if (parsedStudents.length > 0) {
    return (
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {parsedStudents.length} students ready to import
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 max-h-48 overflow-y-auto">
            <div className="text-xs space-y-1">
              {parsedStudents.map((s, i) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2 rounded bg-background/50">
                  {editingIndex === i && editValues ? (
                    <>
                      <Input
                        value={editValues.firstName}
                        onChange={(e) => setEditValues({ ...editValues, firstName: e.target.value })}
                        className="h-6 text-xs flex-1"
                        placeholder="First name"
                      />
                      <Input
                        value={editValues.lastName}
                        onChange={(e) => setEditValues({ ...editValues, lastName: e.target.value })}
                        className="h-6 text-xs flex-1"
                        placeholder="Last name"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEditSave}>
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEditCancel}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-muted-foreground">{s.firstName} {s.lastName}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditStart(i)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveStudent(i)}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border-dashed transition-colors ${isDragOver ? 'border-primary bg-primary/5' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Upload Student Roster (CSV)</p>
            <p className="text-xs text-muted-foreground">
              Drag & drop or click to upload. Columns: first_name, last_name, student_id, email
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload-input"
          />
          <Button variant="secondary" size="sm" asChild>
            <label htmlFor="csv-upload-input" className="cursor-pointer gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </label>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
