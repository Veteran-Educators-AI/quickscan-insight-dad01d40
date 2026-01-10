import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw, Crop, Check, X, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImagePreviewProps {
  imageDataUrl: string;
  onConfirm: (finalImageDataUrl: string) => void;
  onRetake: () => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 80,
      },
      undefined,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export function ImagePreview({ imageDataUrl, onConfirm, onRetake }: ImagePreviewProps) {
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [currentImageUrl, setCurrentImageUrl] = useState(imageDataUrl);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cropImageLoaded, setCropImageLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

  // Load image when URL changes
  useEffect(() => {
    setImageLoaded(false);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setCurrentImageUrl(imageDataUrl);
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load image');
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // Reset crop image loaded state when entering crop mode
  useEffect(() => {
    if (isCropping) {
      setCropImageLoaded(false);
    }
  }, [isCropping]);

  const rotateImage = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    // Set a default crop that's centered and covers 80% of the image
    const defaultCrop = centerAspectCrop(width, height);
    setCrop(defaultCrop);
    setCropImageLoaded(true);
  }, []);

  const applyCrop = async () => {
    if (!cropImageRef.current || !completedCrop || !cropCanvasRef.current) return;

    const image = cropImageRef.current;
    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    
    // Update the main image with cropped version
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setCurrentImageUrl(croppedDataUrl);
      setImageLoaded(true);
    };
    img.src = croppedDataUrl;
    
    // Exit crop mode
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
    
    // Reset transformations since we've applied a new image
    setRotation(0);
    setScale(1);
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const processAndConfirm = async () => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) {
      console.error('Image not ready for processing');
      return;
    }

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Calculate dimensions based on rotation
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const outputWidth = isRotated90or270 ? img.height : img.width;
      const outputHeight = isRotated90or270 ? img.width : img.height;

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      // Clear and set up transform
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Move to center, rotate, then draw
      ctx.translate(outputWidth / 2, outputHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Export as JPEG
      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onConfirm(finalDataUrl);
    } catch (err) {
      console.error('Error processing image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cropping mode
  if (isCropping) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/80">
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelCrop}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5 mr-2" />
            Cancel
          </Button>
          <span className="text-white font-medium">Select Work Area</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={applyCrop}
            disabled={!completedCrop}
            className="text-white hover:bg-white/20"
          >
            <Check className="h-5 w-5 mr-2" />
            Apply
          </Button>
        </div>

        {/* Crop area */}
        <div className="flex-1 relative overflow-auto flex items-center justify-center bg-black p-4">
          <div className="relative">
            <ReactCrop
              crop={crop}
              onChange={(c, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              className="[&_.ReactCrop__crop-selection]:border-4 [&_.ReactCrop__crop-selection]:border-primary [&_.ReactCrop__crop-selection]:rounded-md [&_.ReactCrop__drag-handle]:bg-primary [&_.ReactCrop__drag-handle]:w-4 [&_.ReactCrop__drag-handle]:h-4 [&_.ReactCrop__drag-handle]:border-2 [&_.ReactCrop__drag-handle]:border-white [&_.ReactCrop__drag-handle]:rounded-full"
              style={{ maxHeight: '70vh' }}
              ruleOfThirds
            >
              <img
                ref={cropImageRef}
                src={currentImageUrl}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-w-full max-h-[70vh] object-contain"
                style={{ display: 'block' }}
              />
            </ReactCrop>
            
            {/* Loading indicator while image loads */}
            {!cropImageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-black/80 pb-safe">
          <div className="flex items-center justify-center gap-2 text-white/80 text-sm mb-2">
            <Move className="h-4 w-4" />
            <span>Drag corners or edges to adjust selection</span>
          </div>
          <p className="text-center text-white/60 text-xs">
            Select the student's work area for more accurate grading
          </p>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={cropCanvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetake}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5 mr-2" />
          Retake
        </Button>
        <span className="text-white font-medium">Preview</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={processAndConfirm}
          disabled={isProcessing}
          className="text-white hover:bg-white/20"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          ) : (
            <Check className="h-5 w-5 mr-2" />
          )}
          Use Photo
        </Button>
      </div>

      {/* Image preview area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        <div
          className="transition-transform duration-200"
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
          }}
        >
          <img
            src={currentImageUrl}
            alt="Captured preview"
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      </div>

      {/* Edit controls */}
      <div className="p-4 bg-black/80 pb-safe">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={zoomOut}
            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-6 w-6" />
          </button>
          
          <button
            onClick={() => setIsCropping(true)}
            className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            aria-label="Crop image"
          >
            <Crop className="h-7 w-7" />
          </button>

          <button
            onClick={rotateImage}
            className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            aria-label="Rotate image"
          >
            <RotateCw className="h-7 w-7" />
          </button>

          <button
            onClick={zoomIn}
            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-6 w-6" />
          </button>
        </div>

        <p className="text-center text-white/60 text-sm mt-3">
          Tap crop or rotate to adjust the image
        </p>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
