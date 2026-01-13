import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, SwitchCamera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);

  // Track mounted state to prevent state updates after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (mountedRef.current) {
      setIsReady(false);
    }
  }, []);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    if (!mountedRef.current) return;
    
    setError(null);
    setIsReady(false);

    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping track:', e);
          }
        });
        streamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!mountedRef.current) {
        // Component unmounted while waiting for camera
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Use a promise-based approach for metadata loading
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }
          
          const video = videoRef.current;
          
          const handleLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            resolve();
          };
          
          const handleError = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            reject(new Error('Video failed to load'));
          };
          
          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);
        });
        
        if (mountedRef.current && videoRef.current) {
          await videoRef.current.play();
          setIsReady(true);
        }
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (!mountedRef.current) return;
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access in your browser or device settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is already in use by another application.');
        } else if (err.name === 'AbortError') {
          // User cancelled or component closed - don't show error
          return;
        } else {
          setError('Unable to access camera. Please try again.');
        }
      } else {
        setError('Unable to access camera. Please try again.');
      }
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      
      // Brief flash effect
      setTimeout(() => {
        if (mountedRef.current) {
          setIsCapturing(false);
        }
        stopCamera();
        onCapture(dataUrl);
      }, 150);
    }
  }, [isReady, stopCamera, onCapture]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Camera capture flash effect */}
      <div 
        className={cn(
          "absolute inset-0 bg-white pointer-events-none z-20 transition-opacity duration-150",
          isCapturing ? "opacity-80" : "opacity-0"
        )} 
      />

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 left-4 z-30 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="Close camera"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Switch camera button */}
      <button
        onClick={switchCamera}
        className="absolute top-4 right-4 z-30 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="Switch camera"
      >
        <SwitchCamera className="h-6 w-6" />
      </button>

      {/* Video preview */}
      <div className="absolute inset-0 flex items-center justify-center">
        {error ? (
          <div className="text-center text-white p-6 max-w-md">
            <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-4">{error}</p>
            <div className="flex flex-col gap-3 items-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        stopCamera();
                        onCapture(dataUrl);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <div className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-md hover:bg-white/90 transition-colors">
                  <Upload className="h-5 w-5" />
                  Upload Image Instead
                </div>
              </label>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="bg-transparent border-white text-white hover:bg-white/20">
                  Cancel
                </Button>
                <Button onClick={() => startCamera(facingMode)} className="bg-white/20 text-white hover:bg-white/30 border border-white">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isReady ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Loading state */}
        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p>Starting camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Scan guide overlay */}
      {isReady && !error && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Corner guides */}
          <div className="absolute inset-8 sm:inset-16 md:inset-24">
            <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-white/70 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-white/70 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-white/70 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-white/70 rounded-br-lg" />
          </div>
          
          {/* Hint text */}
          <div className="absolute top-20 left-0 right-0 text-center">
            <p className="text-white/80 text-sm bg-black/30 inline-block px-4 py-2 rounded-full">
              Align student work within the frame
            </p>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-safe z-30">
        <div className="flex items-center justify-center pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Shutter button */}
          <button
            onClick={capturePhoto}
            disabled={!isReady || !!error}
            className={cn(
              "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all",
              "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
              isReady && !error ? "bg-white/20 hover:bg-white/30" : "bg-transparent"
            )}
            aria-label="Take photo"
          >
            <div className="w-16 h-16 rounded-full bg-white" />
          </button>
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
