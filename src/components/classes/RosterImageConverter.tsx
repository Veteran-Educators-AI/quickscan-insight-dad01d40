import { useState, useRef } from 'react';
import { Upload, Loader2, FileSpreadsheet, Image as ImageIcon, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { handleApiError, checkResponseForApiError } from '@/lib/apiErrorHandler';
import { Badge } from '@/components/ui/badge';

interface ExtractedStudent {
  firstName: string;
  lastName: string;
  studentId?: string;
  email?: string;
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
    return uploadedImages
      .filter((img) => img.status === 'done')
      .flatMap((img) => img.students);
  };

  const downloadCSV = () => {
    const allStudents = getAllExtractedStudents();
    if (allStudents.length === 0) return;

    const headers = ['first_name', 'last_name', 'student_id', 'email'];
    const rows = allStudents.map((s) => [
      s.firstName || '',
      s.lastName || '',
      s.studentId || '',
      s.email || '',
    ]);

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
                          className="text-sm py-1 px-2 bg-muted rounded flex justify-between"
                        >
                          <span>
                            {student.firstName} {student.lastName}
                          </span>
                          {student.studentId && (
                            <span className="text-muted-foreground">
                              ID: {student.studentId}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button onClick={downloadCSV} className="w-full gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Download CSV ({totalStudents} Students)
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
