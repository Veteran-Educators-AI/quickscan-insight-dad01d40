import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Clock, User, Trash2, Play, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { ClassStudentSelector } from './ClassStudentSelector';
import { CameraModal } from './CameraModal';
import { ImagePreview } from './ImagePreview';

interface PendingScan {
  id: string;
  image_url: string;
  student_id: string | null;
  class_id: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  student?: {
    first_name: string;
    last_name: string;
  } | null;
  class?: {
    name: string;
  } | null;
}

interface SaveForLaterTabProps {
  pendingScans: PendingScan[];
  onRefresh: () => void;
  onAnalyzeScan: (scan: PendingScan) => void;
}

export function SaveForLaterTab({ pendingScans, onRefresh, onAnalyzeScan }: SaveForLaterTabProps) {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = useCallback((imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setShowCamera(false);
  }, []);

  const handlePreviewConfirm = useCallback(async (finalImageDataUrl: string) => {
    await saveImageForLater(finalImageDataUrl);
    setCapturedImage(null);
  }, [selectedClassId, selectedStudentIds]);

  const handlePreviewRetake = useCallback(() => {
    setCapturedImage(null);
    setShowCamera(true);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        await saveImageForLater(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const saveImageForLater = async (imageDataUrl: string) => {
    if (!user) {
      toast.error('Please log in to save scans');
      return;
    }

    setIsSaving(true);
    try {
      // Convert base64 to blob and upload to storage
      const base64Data = imageDataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const fileName = `${user.id}/${Date.now()}-pending.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('scan-images')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('scan-images')
        .getPublicUrl(fileName);

      // Save to pending_scans table
      const studentId = selectedStudentIds.length === 1 ? selectedStudentIds[0] : null;
      
      const { error: insertError } = await supabase
        .from('pending_scans')
        .insert({
          teacher_id: user.id,
          student_id: studentId,
          class_id: selectedClassId,
          image_url: urlData.publicUrl,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast.success('Image saved for later analysis');
      onRefresh();
    } catch (error) {
      console.error('Error saving scan:', error);
      toast.error('Failed to save image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteScan = async (scanId: string) => {
    try {
      const { error } = await supabase
        .from('pending_scans')
        .delete()
        .eq('id', scanId);

      if (error) throw error;

      toast.success('Scan deleted');
      onRefresh();
    } catch (error) {
      console.error('Error deleting scan:', error);
      toast.error('Failed to delete scan');
    }
  };

  const isNativeContext = typeof window !== 'undefined' && 
    (window.navigator.userAgent.includes('Capacitor') || 
     window.navigator.userAgent.includes('wv') ||
     (window as any).Capacitor);

  return (
    <div className="space-y-4">
      {/* Image Preview Modal */}
      {capturedImage && (
        <ImagePreview
          imageDataUrl={capturedImage}
          onConfirm={handlePreviewConfirm}
          onRetake={handlePreviewRetake}
        />
      )}

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />

      {/* Class & Student Selector */}
      <ClassStudentSelector
        selectedClassId={selectedClassId}
        selectedStudentIds={selectedStudentIds}
        onClassChange={setSelectedClassId}
        onStudentsChange={setSelectedStudentIds}
        disabled={isSaving}
      />

      {/* Capture/Upload Section */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Save for Later</h2>
              <p className="text-sm text-muted-foreground">
                Capture student work now and analyze when you're ready
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <input
                ref={nativeInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {isNativeContext ? (
                <Button 
                  variant="scan" 
                  size="lg"
                  onClick={() => nativeInputRef.current?.click()}
                  disabled={isSaving}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Take Photo
                </Button>
              ) : (
                <Button 
                  variant="scan" 
                  size="lg"
                  onClick={() => setShowCamera(true)}
                  disabled={isSaving}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Open Camera
                </Button>
              )}

              <Button 
                variant="outline" 
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Images
              </Button>
            </div>

            {isSaving && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Saving image...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Scans List */}
      {pendingScans.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Saved Scans ({pendingScans.length})
          </h3>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingScans.map((scan) => (
              <Card key={scan.id} className="overflow-hidden">
                <div className="aspect-[4/3] relative bg-muted">
                  <img
                    src={scan.image_url}
                    alt="Saved scan"
                    className="w-full h-full object-cover"
                  />
                  {scan.status === 'analyzed' && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Analyzed
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className={scan.student ? '' : 'text-muted-foreground italic'}>
                      {scan.student 
                        ? `${scan.student.first_name} ${scan.student.last_name}`
                        : 'No student assigned'}
                    </span>
                  </div>
                  
                  {scan.class && (
                    <p className="text-xs text-muted-foreground">
                      {scan.class.name}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {new Date(scan.created_at).toLocaleDateString()} at{' '}
                    {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="hero"
                      size="sm"
                      className="flex-1"
                      onClick={() => onAnalyzeScan(scan)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Analyze
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteScan(scan.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pendingScans.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No saved scans yet</p>
            <p className="text-sm">Capture student work to save for later analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
