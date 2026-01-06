import { useState, useRef } from 'react';
import { Upload, Loader2, FileSpreadsheet, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedStudent {
  firstName: string;
  lastName: string;
  studentId?: string;
  email?: string;
}

export function RosterImageConverter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedStudents, setExtractedStudents] = useState<ExtractedStudent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setExtractedStudents([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    try {
      const base64Data = selectedImage.split(',')[1];

      const { data, error } = await supabase.functions.invoke('extract-roster-from-image', {
        body: { imageBase64: base64Data },
      });

      if (error) throw error;

      if (data?.students && Array.isArray(data.students)) {
        setExtractedStudents(data.students);
        toast({
          title: 'Roster extracted!',
          description: `Found ${data.students.length} students`,
        });
      } else {
        throw new Error('Could not extract student data from image');
      }
    } catch (error: any) {
      console.error('Error processing roster image:', error);
      toast({
        title: 'Processing failed',
        description: error.message || 'Failed to extract roster from image',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCSV = () => {
    if (extractedStudents.length === 0) return;

    const headers = ['first_name', 'last_name', 'student_id', 'email'];
    const rows = extractedStudents.map(s => [
      s.firstName || '',
      s.lastName || '',
      s.studentId || '',
      s.email || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
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
      description: 'You can now upload this CSV to add students to your class',
    });
  };

  const clearImage = () => {
    setSelectedImage(null);
    setExtractedStudents([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
          <DialogTitle>Convert Roster Image to CSV</DialogTitle>
          <DialogDescription>
            Upload an image of your class roster and we'll extract the student information into a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedImage ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Upload an image of your roster (photo, screenshot, or scan)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="roster-image-input"
                />
                <Button asChild variant="secondary">
                  <label htmlFor="roster-image-input" className="cursor-pointer">
                    Select Image
                  </label>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Roster preview"
                  className="max-h-48 w-full object-contain rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={clearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {extractedStudents.length === 0 ? (
                <Button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting Students...
                    </>
                  ) : (
                    'Extract Students from Image'
                  )}
                </Button>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Extracted Students ({extractedStudents.length})</CardTitle>
                    <CardDescription className="text-xs">
                      Review the extracted data before downloading
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                      {extractedStudents.map((student, index) => (
                        <div key={index} className="text-sm py-1 px-2 bg-muted rounded flex justify-between">
                          <span>{student.firstName} {student.lastName}</span>
                          {student.studentId && (
                            <span className="text-muted-foreground">ID: {student.studentId}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button onClick={downloadCSV} className="w-full gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Download CSV
                    </Button>
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
