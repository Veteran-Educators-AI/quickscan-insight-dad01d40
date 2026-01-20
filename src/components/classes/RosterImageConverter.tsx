import { useState, useRef, useMemo } from 'react';
import { Upload, Loader2, FileSpreadsheet, Image as ImageIcon, X, Plus, FileDown, Settings2, ChevronDown, ChevronUp, FileUp, Merge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { handleApiError, checkResponseForApiError } from '@/lib/apiErrorHandler';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';

interface ExtractedStudent {
  firstName: string;
  lastName: string;
  studentId?: string;
  email?: string;
  grade?: string;
  [key: string]: string | undefined; // Allow additional dynamic fields
}

interface UploadedImage {
  id: string;
  dataUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  students: ExtractedStudent[];
  error?: string;
}

interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  include: boolean;
}

interface TemplateData {
  fileName: string;
  headers: string[];
  rows: Record<string, string | number>[];
  matchColumn: string;
}

// Common gradebook column presets
const GRADEBOOK_PRESETS = {
  default: { label: 'Default', mappings: {} },
  jupiterGrades: { 
    label: 'Jupiter Grades', 
    mappings: { 
      firstName: 'First Name', 
      lastName: 'Last Name', 
      studentId: 'Student ID',
      email: 'Email Address'
    } 
  },
  powerschool: { 
    label: 'PowerSchool', 
    mappings: { 
      firstName: 'First_Name', 
      lastName: 'Last_Name', 
      studentId: 'Student_Number',
      email: 'Student_Email'
    } 
  },
  googleClassroom: { 
    label: 'Google Classroom', 
    mappings: { 
      firstName: 'First name', 
      lastName: 'Last name', 
      studentId: 'Student ID',
      email: 'Email address'
    } 
  },
  canvas: { 
    label: 'Canvas LMS', 
    mappings: { 
      firstName: 'first_name', 
      lastName: 'last_name', 
      studentId: 'sis_user_id',
      email: 'email'
    } 
  },
};

export function RosterImageConverter() {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [combineNames, setCombineNames] = useState(false);
  const [calculateAverages, setCalculateAverages] = useState(false);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [excludedColumns, setExcludedColumns] = useState<Set<string>>(new Set());
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('default');
  
  // Template merge state
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [templateMatchColumn, setTemplateMatchColumn] = useState<string>('');
  const [extractedMatchColumn, setExtractedMatchColumn] = useState<string>('lastName');
  const [gradeColumnsToMerge, setGradeColumnsToMerge] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('export');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage: UploadedImage = {
          id: crypto.randomUUID(),
          dataUrl: event.target?.result as string,
          status: 'pending',
          students: [],
        };
        setUploadedImages((prev) => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input so the same files can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const processAllImages = async () => {
    const pendingImages = uploadedImages.filter((img) => img.status === 'pending');
    if (pendingImages.length === 0) return;

    setIsProcessing(true);

    for (const image of pendingImages) {
      setUploadedImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, status: 'processing' } : img
        )
      );

      try {
        const base64Data = image.dataUrl.split(',')[1];

        const { data, error } = await supabase.functions.invoke('extract-roster-from-image', {
          body: { imageBase64: base64Data },
        });

        if (error) {
          setUploadedImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? { ...img, status: 'error', error: error.message }
                : img
            )
          );
          continue;
        }

        if (checkResponseForApiError(data)) {
          setUploadedImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? { ...img, status: 'error', error: 'API error occurred' }
                : img
            )
          );
          continue;
        }

        if (data?.students && Array.isArray(data.students)) {
          setUploadedImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? { ...img, status: 'done', students: data.students }
                : img
            )
          );
        } else {
          setUploadedImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? { ...img, status: 'error', error: 'No students found' }
                : img
            )
          );
        }
      } catch (error: unknown) {
        console.error('Error processing roster image:', error);
        setUploadedImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, status: 'error', error: 'Processing failed' }
              : img
          )
        );
      }
    }

    setIsProcessing(false);

    const totalStudents = uploadedImages.reduce(
      (sum, img) => sum + (img.status === 'done' ? img.students.length : 0),
      0
    );
    
    toast({
      title: 'Processing complete!',
      description: `Extracted students from ${uploadedImages.filter((img) => img.status === 'done').length} images`,
    });
  };

  const getAllExtractedStudents = (): ExtractedStudent[] => {
    const allStudents = uploadedImages
      .filter((img) => img.status === 'done')
      .flatMap((img) => img.students);
    
    // Deduplicate by normalized first + last name
    const seen = new Set<string>();
    return allStudents.filter((student) => {
      const key = `${(student.firstName || '').toLowerCase().trim()}_${(student.lastName || '').toLowerCase().trim()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Get all unique columns from extracted data
  const allColumns = useMemo(() => {
    const allStudents = getAllExtractedStudents();
    const columnSet = new Set<string>();
    allStudents.forEach((student) => {
      Object.keys(student).forEach((key) => {
        if (student[key] !== undefined && student[key] !== '') {
          columnSet.add(key);
        }
      });
    });
    return Array.from(columnSet);
  }, [uploadedImages]);

  // Apply preset mappings
  const applyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = GRADEBOOK_PRESETS[presetKey as keyof typeof GRADEBOOK_PRESETS];
    if (preset) {
      setColumnMappings(preset.mappings);
    }
  };

  // Update a single column mapping
  const updateColumnMapping = (sourceCol: string, targetCol: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [sourceCol]: targetCol,
    }));
  };

  // Toggle column inclusion
  const toggleColumnExclusion = (col: string) => {
    setExcludedColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(col)) {
        newSet.delete(col);
      } else {
        newSet.add(col);
      }
      return newSet;
    });
  };

  // Convert camelCase to Title Case (e.g., "firstName" -> "First Name")
  const toTitleCase = (str: string): string => {
    // Add space before capital letters and split
    const withSpaces = str.replace(/([A-Z])/g, ' $1').trim();
    // Capitalize first letter of each word
    return withSpaces
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get the mapped column name with Title Case formatting
  const getMappedColumnName = (col: string): string => {
    // If there's a custom mapping, use it as-is
    if (columnMappings[col]) {
      return columnMappings[col];
    }
    // Otherwise, convert to Title Case
    return toTitleCase(col);
  };

  // Helper to check if a value looks like a numeric grade
  const isNumericGrade = (value: string | undefined): boolean => {
    if (!value) return false;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  };

  // Helper to replace 0 grades with 55
  const transformGrade = (value: string | undefined): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (!isNaN(num) && num === 0) {
      return '55';
    }
    return value;
  };

  const downloadCSV = () => {
    const allStudents = getAllExtractedStudents()
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
    if (allStudents.length === 0) return;

    // Dynamically collect all unique column keys across all students
    const columnSet = new Set<string>();
    allStudents.forEach((student) => {
      Object.keys(student).forEach((key) => {
        if (student[key] !== undefined && student[key] !== '' && !excludedColumns.has(key)) {
          columnSet.add(key);
        }
      });
    });

    // Define preferred column order based on combineNames setting
    const preferredOrder = combineNames 
      ? ['fullName', 'studentId', 'email', 'grade']
      : ['firstName', 'lastName', 'studentId', 'email', 'grade'];
    
    // Remove firstName/lastName from columnSet if combining
    if (combineNames) {
      columnSet.delete('firstName');
      columnSet.delete('lastName');
      columnSet.add('fullName');
    }

    const orderedColumns: string[] = [];
    
    // Add columns in preferred order first
    preferredOrder.forEach((col) => {
      if (columnSet.has(col) && !excludedColumns.has(col)) {
        orderedColumns.push(col);
        columnSet.delete(col);
      }
    });
    
    // Add remaining columns alphabetically (excluding excluded ones)
    const remainingColumns = Array.from(columnSet).filter(col => !excludedColumns.has(col)).sort();
    orderedColumns.push(...remainingColumns);

    // Identify numeric grade columns (exclude known non-grade fields)
    const nonGradeFields = ['firstName', 'lastName', 'fullName', 'studentId', 'email', 'id', 'name'];
    const numericGradeColumns = orderedColumns.filter((col) => {
      if (nonGradeFields.includes(col)) return false;
      // Check if at least one student has a numeric value in this column
      return allStudents.some((s) => isNumericGrade(s[col]));
    });

    // Add average column if enabled and there are numeric grade columns
    if (calculateAverages && numericGradeColumns.length > 0) {
      orderedColumns.push('average');
    }

    // Apply column mappings for headers
    const headers = orderedColumns.map((col) => getMappedColumnName(col));
    
    const rows = allStudents.map((s) => {
      return orderedColumns.map((col) => {
        if (col === 'fullName') {
          return `${s.lastName || ''}, ${s.firstName || ''}`.trim();
        }
        if (col === 'average') {
          // Calculate average from numeric grade columns
          const grades = numericGradeColumns
            .map((gc) => {
              const val = transformGrade(s[gc]);
              return parseFloat(val);
            })
            .filter((n) => !isNaN(n));
          if (grades.length === 0) return '';
          const avg = grades.reduce((sum, g) => sum + g, 0) / grades.length;
          return avg.toFixed(1);
        }
        // Transform grades (replace 0 with 55) for numeric columns
        if (numericGradeColumns.includes(col)) {
          return transformGrade(s[col]);
        }
        return String(s[col] ?? '');
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'roster.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV downloaded!',
      description: `Downloaded ${allStudents.length} students. You can now upload this CSV to add students to your class.`,
    });
  };

  const downloadExcel = () => {
    const allStudents = getAllExtractedStudents()
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
    if (allStudents.length === 0) return;

    // Dynamically collect all unique column keys across all students
    const columnSet = new Set<string>();
    allStudents.forEach((student) => {
      Object.keys(student).forEach((key) => {
        if (student[key] !== undefined && student[key] !== '' && !excludedColumns.has(key)) {
          columnSet.add(key);
        }
      });
    });

    // Define preferred column order based on combineNames setting
    const preferredOrder = combineNames 
      ? ['fullName', 'studentId', 'email', 'grade']
      : ['firstName', 'lastName', 'studentId', 'email', 'grade'];
    
    // Remove firstName/lastName from columnSet if combining
    if (combineNames) {
      columnSet.delete('firstName');
      columnSet.delete('lastName');
      columnSet.add('fullName');
    }

    const orderedColumns: string[] = [];
    
    // Add columns in preferred order first
    preferredOrder.forEach((col) => {
      if (columnSet.has(col) && !excludedColumns.has(col)) {
        orderedColumns.push(col);
        columnSet.delete(col);
      }
    });
    
    // Add remaining columns alphabetically (excluding excluded ones)
    const remainingColumns = Array.from(columnSet).filter(col => !excludedColumns.has(col)).sort();
    orderedColumns.push(...remainingColumns);

    // Identify numeric grade columns (exclude known non-grade fields)
    const nonGradeFields = ['firstName', 'lastName', 'fullName', 'studentId', 'email', 'id', 'name'];
    const numericGradeColumns = orderedColumns.filter((col) => {
      if (nonGradeFields.includes(col)) return false;
      return allStudents.some((s) => isNumericGrade(s[col]));
    });

    // Add average column if enabled and there are numeric grade columns
    if (calculateAverages && numericGradeColumns.length > 0) {
      orderedColumns.push('average');
    }

    // Apply column mappings for headers
    const headers = orderedColumns.map((col) => getMappedColumnName(col));
    
    // Build data rows
    const dataRows = allStudents.map((s) => {
      const row: Record<string, string | number> = {};
      orderedColumns.forEach((col, idx) => {
        const headerName = headers[idx];
        if (col === 'fullName') {
          row[headerName] = `${s.lastName || ''}, ${s.firstName || ''}`.trim();
        } else if (col === 'average') {
          const grades = numericGradeColumns
            .map((gc) => {
              const val = transformGrade(s[gc]);
              return parseFloat(val);
            })
            .filter((n) => !isNaN(n));
          if (grades.length === 0) {
            row[headerName] = '';
          } else {
            const avg = grades.reduce((sum, g) => sum + g, 0) / grades.length;
            row[headerName] = parseFloat(avg.toFixed(1));
          }
        } else if (numericGradeColumns.includes(col)) {
          const transformed = transformGrade(s[col]);
          const num = parseFloat(transformed);
          row[headerName] = isNaN(num) ? transformed : num;
        } else {
          row[headerName] = String(s[col] ?? '');
        }
      });
      return row;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataRows, { header: headers });

    // Set column widths
    const colWidths = headers.map((h) => ({ wch: Math.max(h.length + 2, 12) }));
    ws['!cols'] = colWidths;

    // Apply bold 12pt formatting to header row
    // Note: xlsx library has limited styling support in the community version
    // Headers will be bold when opened in Excel if we set the header style
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true, sz: 12 },
          alignment: { horizontal: 'center' }
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Roster');

    // Generate and download the file
    XLSX.writeFile(wb, 'roster.xlsx');

    toast({
      title: 'Excel downloaded!',
      description: `Downloaded ${allStudents.length} students with formatted headers.`,
    });
  };

  const clearAll = () => {
    setUploadedImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle template Excel file upload
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(firstSheet, { defval: '' });
        
        if (jsonData.length === 0) {
          toast({
            title: 'Empty template',
            description: 'The uploaded file has no data rows.',
            variant: 'destructive',
          });
          return;
        }

        const headers = Object.keys(jsonData[0]);
        
        setTemplateData({
          fileName: file.name,
          headers,
          rows: jsonData,
          matchColumn: headers[0],
        });
        
        // Auto-detect name column
        const nameColumn = headers.find(h => 
          h.toLowerCase().includes('name') || 
          h.toLowerCase().includes('student')
        );
        if (nameColumn) {
          setTemplateMatchColumn(nameColumn);
        } else {
          setTemplateMatchColumn(headers[0]);
        }

        toast({
          title: 'Template loaded!',
          description: `Found ${jsonData.length} students and ${headers.length} columns.`,
        });
      } catch (error) {
        console.error('Error parsing template:', error);
        toast({
          title: 'Error reading file',
          description: 'Could not parse the Excel file. Please ensure it is a valid .xlsx file.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (templateInputRef.current) {
      templateInputRef.current.value = '';
    }
  };

  // Toggle grade column selection for merge
  const toggleGradeColumnMerge = (col: string) => {
    setGradeColumnsToMerge((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(col)) {
        newSet.delete(col);
      } else {
        newSet.add(col);
      }
      return newSet;
    });
  };

  // Normalize name for matching
  const normalizeName = (name: string): string => {
    return name.toLowerCase().trim().replace(/[^a-z]/g, '');
  };

  // Match extracted students to template rows
  const matchStudentToTemplate = (
    student: ExtractedStudent,
    templateRow: Record<string, string | number>,
    matchColumn: string
  ): boolean => {
    const templateValue = String(templateRow[matchColumn] || '');
    
    // Try different matching strategies
    const extractedName = `${student.lastName || ''} ${student.firstName || ''}`.trim();
    const extractedLastFirst = `${student.lastName || ''}, ${student.firstName || ''}`.trim();
    
    // Normalize for comparison
    const normalizedTemplate = normalizeName(templateValue);
    const normalizedExtracted = normalizeName(extractedName);
    const normalizedLastFirst = normalizeName(extractedLastFirst);
    
    // Check if student ID matches
    if (student.studentId && String(templateRow[matchColumn]).includes(student.studentId)) {
      return true;
    }
    
    // Check name matches
    if (normalizedTemplate === normalizedExtracted || normalizedTemplate === normalizedLastFirst) {
      return true;
    }
    
    // Check if template contains lastName
    if (student.lastName && normalizedTemplate.includes(normalizeName(student.lastName))) {
      // Additional check for first name if available
      if (student.firstName && normalizedTemplate.includes(normalizeName(student.firstName))) {
        return true;
      }
      // Just last name match is acceptable
      return true;
    }
    
    return false;
  };

  // Merge grades into template and download
  const mergeAndDownload = () => {
    if (!templateData || gradeColumnsToMerge.size === 0) {
      toast({
        title: 'Cannot merge',
        description: 'Please upload a template and select grade columns to merge.',
        variant: 'destructive',
      });
      return;
    }

    const extractedStudents = getAllExtractedStudents();
    if (extractedStudents.length === 0) {
      toast({
        title: 'No extracted data',
        description: 'Please extract students from images first.',
        variant: 'destructive',
      });
      return;
    }

    // Create merged data
    const mergedRows = templateData.rows.map((templateRow) => {
      const newRow = { ...templateRow };
      
      // Find matching student
      const matchedStudent = extractedStudents.find((student) =>
        matchStudentToTemplate(student, templateRow, templateMatchColumn)
      );

      if (matchedStudent) {
        // Merge selected grade columns
        gradeColumnsToMerge.forEach((col) => {
          if (matchedStudent[col] !== undefined) {
            const gradeValue = transformGrade(matchedStudent[col]);
            const headerName = getMappedColumnName(col);
            // Add to existing columns or create new
            newRow[headerName] = gradeValue;
          }
        });
      }

      return newRow;
    });

    // Sort by the match column (assuming it contains names)
    mergedRows.sort((a, b) => {
      const aVal = String(a[templateMatchColumn] || '');
      const bVal = String(b[templateMatchColumn] || '');
      return aVal.localeCompare(bVal);
    });

    // Get all headers (original + new grade columns)
    const newHeaders = [...new Set([
      ...templateData.headers,
      ...Array.from(gradeColumnsToMerge).map(getMappedColumnName),
    ])];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(mergedRows, { header: newHeaders });

    // Set column widths
    const colWidths = newHeaders.map((h) => ({ wch: Math.max(String(h).length + 2, 12) }));
    ws['!cols'] = colWidths;

    // Apply header styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true, sz: 12 },
          alignment: { horizontal: 'center' }
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Merged Grades');

    // Generate filename
    const baseName = templateData.fileName.replace(/\.[^/.]+$/, '');
    XLSX.writeFile(wb, `${baseName}_merged.xlsx`);

    // Count matches
    const matchCount = templateData.rows.filter((row) =>
      extractedStudents.some((student) => matchStudentToTemplate(student, row, templateMatchColumn))
    ).length;

    toast({
      title: 'Merged grades downloaded!',
      description: `Matched ${matchCount} of ${templateData.rows.length} students. Grades added to ${gradeColumnsToMerge.size} column(s).`,
    });
  };

  const clearTemplate = () => {
    setTemplateData(null);
    setGradeColumnsToMerge(new Set());
    if (templateInputRef.current) {
      templateInputRef.current.value = '';
    }
  };

  const pendingCount = uploadedImages.filter((img) => img.status === 'pending').length;
  const doneCount = uploadedImages.filter((img) => img.status === 'done').length;
  const totalStudents = getAllExtractedStudents().length;
  
  // Get grade columns from extracted data
  const extractedGradeColumns = useMemo(() => {
    const nonGradeFields = ['firstName', 'lastName', 'fullName', 'studentId', 'email', 'id', 'name'];
    return allColumns.filter((col) => {
      if (nonGradeFields.includes(col)) return false;
      const students = getAllExtractedStudents();
      return students.some((s) => isNumericGrade(s[col]));
    });
  }, [allColumns]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ImageIcon className="h-4 w-4" />
          Convert Roster Image
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Roster Images to CSV</DialogTitle>
          <DialogDescription>
            Upload one or more images of your class roster (for large classes, use multiple pages) and we'll extract all students into a single CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3 text-center">
                Upload images of your roster (photos, screenshots, or scans)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesSelect}
                className="hidden"
                id="roster-image-input"
              />
              <Button asChild variant="secondary" size="sm">
                <label htmlFor="roster-image-input" className="cursor-pointer gap-2">
                  <Plus className="h-4 w-4" />
                  {uploadedImages.length > 0 ? 'Add More Images' : 'Select Images'}
                </label>
              </Button>
            </CardContent>
          </Card>

          {/* Image thumbnails */}
          {uploadedImages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} uploaded
                </span>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear All
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {uploadedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.dataUrl}
                      alt="Roster page"
                      className="h-24 w-full object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(image.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="absolute bottom-1 left-1">
                      {image.status === 'pending' && (
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      )}
                      {image.status === 'processing' && (
                        <Badge variant="secondary" className="text-xs">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Processing
                        </Badge>
                      )}
                      {image.status === 'done' && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          {image.students.length} found
                        </Badge>
                      )}
                      {image.status === 'error' && (
                        <Badge variant="destructive" className="text-xs">Error</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {uploadedImages.length > 0 && (
            <div className="space-y-3">
              {pendingCount > 0 && (
                <Button
                  onClick={processAllImages}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting Students...
                    </>
                  ) : (
                    `Extract Students from ${pendingCount} Image${pendingCount !== 1 ? 's' : ''}`
                  )}
                </Button>
              )}

              {totalStudents > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Total Extracted: {totalStudents} Students
                    </CardTitle>
                    <CardDescription className="text-xs">
                      From {doneCount} image{doneCount !== 1 ? 's' : ''}. Review before downloading.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                      {getAllExtractedStudents().map((student, index) => (
                        <div
                          key={index}
                          className="text-sm py-1 px-2 bg-muted rounded flex justify-between items-center gap-2"
                        >
                          <span className="truncate">
                            {student.firstName} {student.lastName}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {student.grade && (
                              <Badge variant="secondary" className="text-xs">
                                {student.grade}
                              </Badge>
                            )}
                            {student.studentId && (
                              <span className="text-muted-foreground text-xs">
                                ID: {student.studentId}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Export/Merge Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="export" className="gap-1.5 text-xs">
                          <FileDown className="h-3.5 w-3.5" />
                          New Export
                        </TabsTrigger>
                        <TabsTrigger value="merge" className="gap-1.5 text-xs">
                          <Merge className="h-3.5 w-3.5" />
                          Merge to Template
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="export" className="space-y-3 mt-3">
                        {/* CSV Options */}
                        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Export Options</p>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="combine-names" className="text-sm cursor-pointer">
                              Combine names (Last, First)
                            </Label>
                            <Switch
                              id="combine-names"
                              checked={combineNames}
                              onCheckedChange={setCombineNames}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="calc-averages" className="text-sm cursor-pointer">
                              Calculate student averages
                            </Label>
                            <Switch
                              id="calc-averages"
                              checked={calculateAverages}
                              onCheckedChange={setCalculateAverages}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Note: All 0 grades will be replaced with 55
                          </p>
                        </div>

                        {/* Column Mapping Section */}
                        <Collapsible open={showColumnMapping} onOpenChange={setShowColumnMapping}>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full gap-2 justify-between">
                              <span className="flex items-center gap-2">
                                <Settings2 className="h-4 w-4" />
                                Column Mapping
                              </span>
                              {showColumnMapping ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <div className="p-3 border rounded-lg space-y-3">
                              {/* Preset selector */}
                              <div className="space-y-1">
                                <Label className="text-xs">Gradebook Preset</Label>
                                <Select value={selectedPreset} onValueChange={applyPreset}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select preset..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(GRADEBOOK_PRESETS).map(([key, preset]) => (
                                      <SelectItem key={key} value={key}>
                                        {preset.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Column mappings */}
                              <div className="space-y-2">
                                <Label className="text-xs">Column Names</Label>
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                  {allColumns.map((col) => (
                                    <div key={col} className="flex items-center gap-2">
                                      <Switch
                                        checked={!excludedColumns.has(col)}
                                        onCheckedChange={() => toggleColumnExclusion(col)}
                                        className="scale-75"
                                      />
                                      <span className="text-xs text-muted-foreground w-20 truncate" title={col}>
                                        {col}
                                      </span>
                                      <span className="text-xs text-muted-foreground">→</span>
                                      <Input
                                        value={columnMappings[col] || ''}
                                        onChange={(e) => updateColumnMapping(col, e.target.value)}
                                        placeholder={col}
                                        className="h-7 text-xs flex-1"
                                        disabled={excludedColumns.has(col)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <p className="text-xs text-muted-foreground">
                                Toggle columns on/off and rename them to match your gradebook's import format.
                              </p>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={downloadCSV} variant="outline" className="gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            Download CSV
                          </Button>
                          <Button onClick={downloadExcel} className="gap-2">
                            <FileDown className="h-4 w-4" />
                            Download Excel
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Excel format includes bold 12pt headers
                        </p>
                      </TabsContent>

                      <TabsContent value="merge" className="space-y-3 mt-3">
                        {/* Template upload */}
                        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Your Gradebook Template
                          </p>
                          
                          {!templateData ? (
                            <div className="text-center py-3">
                              <input
                                ref={templateInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleTemplateUpload}
                                className="hidden"
                                id="template-input"
                              />
                              <Button asChild variant="outline" size="sm">
                                <label htmlFor="template-input" className="cursor-pointer gap-2">
                                  <FileUp className="h-4 w-4" />
                                  Upload Excel Template
                                </label>
                              </Button>
                              <p className="text-xs text-muted-foreground mt-2">
                                Upload your existing gradebook to merge extracted grades
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium truncate max-w-[180px]" title={templateData.fileName}>
                                    {templateData.fileName}
                                  </span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={clearTemplate}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary">{templateData.rows.length} students</Badge>
                                <Badge variant="secondary">{templateData.headers.length} columns</Badge>
                              </div>
                            </div>
                          )}
                        </div>

                        {templateData && (
                          <>
                            {/* Match column selection */}
                            <div className="p-3 border rounded-lg space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Match students by (template column)</Label>
                                <Select value={templateMatchColumn} onValueChange={setTemplateMatchColumn}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select column..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {templateData.headers.map((header) => (
                                      <SelectItem key={header} value={header}>
                                        {header}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Grade columns to merge */}
                            <div className="p-3 border rounded-lg space-y-3">
                              <Label className="text-xs">Select grade columns to merge</Label>
                              {extractedGradeColumns.length > 0 ? (
                                <div className="max-h-32 overflow-y-auto space-y-2">
                                  {extractedGradeColumns.map((col) => (
                                    <div key={col} className="flex items-center gap-2">
                                      <Switch
                                        checked={gradeColumnsToMerge.has(col)}
                                        onCheckedChange={() => toggleGradeColumnMerge(col)}
                                        className="scale-75"
                                      />
                                      <span className="text-sm">{toTitleCase(col)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  No numeric grade columns found in extracted data.
                                </p>
                              )}
                            </div>

                            <Button 
                              onClick={mergeAndDownload} 
                              className="w-full gap-2"
                              disabled={gradeColumnsToMerge.size === 0}
                            >
                              <Merge className="h-4 w-4" />
                              Merge & Download
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                              Grades will be matched by student name and added to your template
                            </p>
                          </>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
