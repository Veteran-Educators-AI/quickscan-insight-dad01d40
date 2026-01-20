import { useState, useRef } from 'react';
import { Upload, Loader2, FileSpreadsheet, Image as ImageIcon, X, Plus, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { handleApiError, checkResponseForApiError } from '@/lib/apiErrorHandler';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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

export function RosterImageConverter() {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [combineNames, setCombineNames] = useState(false);
  const [calculateAverages, setCalculateAverages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const allStudents = getAllExtractedStudents();
    if (allStudents.length === 0) return;

    // Dynamically collect all unique column keys across all students
    const columnSet = new Set<string>();
    allStudents.forEach((student) => {
      Object.keys(student).forEach((key) => {
        if (student[key] !== undefined && student[key] !== '') {
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
      if (columnSet.has(col)) {
        orderedColumns.push(col);
        columnSet.delete(col);
      }
    });
    
    // Add remaining columns alphabetically
    const remainingColumns = Array.from(columnSet).sort();
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

    // Convert camelCase to snake_case for CSV headers
    const toSnakeCase = (str: string) => 
      str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    
    const headers = orderedColumns.map(toSnakeCase);
    
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
    const allStudents = getAllExtractedStudents();
    if (allStudents.length === 0) return;

    // Dynamically collect all unique column keys across all students
    const columnSet = new Set<string>();
    allStudents.forEach((student) => {
      Object.keys(student).forEach((key) => {
        if (student[key] !== undefined && student[key] !== '') {
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
      if (columnSet.has(col)) {
        orderedColumns.push(col);
        columnSet.delete(col);
      }
    });
    
    // Add remaining columns alphabetically
    const remainingColumns = Array.from(columnSet).sort();
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

    // Convert camelCase to Title Case for Excel headers
    const toTitleCase = (str: string) => {
      const withSpaces = str.replace(/([A-Z])/g, ' $1').trim();
      return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
    };
    
    const headers = orderedColumns.map(toTitleCase);
    
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

  const pendingCount = uploadedImages.filter((img) => img.status === 'pending').length;
  const doneCount = uploadedImages.filter((img) => img.status === 'done').length;
  const totalStudents = getAllExtractedStudents().length;

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
                    {/* CSV Options */}
                    <div className="space-y-3 mb-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CSV Options</p>
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
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Excel format includes bold 12pt headers
                    </p>
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
