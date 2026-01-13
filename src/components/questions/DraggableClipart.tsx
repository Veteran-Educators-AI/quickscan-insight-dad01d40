import { useState, useRef, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
import { getClipartLibrary, type SlideClipart } from './SlideClipartPicker';

interface DraggableClipartProps {
  item: SlideClipart;
  index: number;
  onPositionChange: (index: number, x: number, y: number) => void;
  onRemove: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  isEditing: boolean;
}

export function DraggableClipart({
  item,
  index,
  onPositionChange,
  onRemove,
  containerRef,
  isEditing,
}: DraggableClipartProps) {
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const clipartLibrary = getClipartLibrary();
  const clipart = clipartLibrary.find(c => c.id === item.clipartId);
  
  const sizeMap = { small: 32, medium: 48, large: 64 };
  const size = sizeMap[item.size];
  
  // Get initial position
  const x = item.x ?? 75;
  const y = item.y ?? 25;
  
  // Check if this is an AI-generated image
  const isGenerated = item.isGenerated && item.imageUrl;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditing || !containerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = elementRef.current?.getBoundingClientRect();
    
    const offsetX = e.clientX - (elementRect?.left ?? 0);
    const offsetY = e.clientY - (elementRect?.top ?? 0);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - containerRect.left - offsetX + size / 2;
      const newY = moveEvent.clientY - containerRect.top - offsetY + size / 2;
      
      // Convert to percentage
      const percentX = Math.max(5, Math.min(95, (newX / containerRect.width) * 100));
      const percentY = Math.max(5, Math.min(95, (newY / containerRect.height) * 100));
      
      onPositionChange(index, percentX, percentY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isEditing, containerRef, index, onPositionChange, size]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isEditing || !containerRef.current) return;
    
    e.stopPropagation();
    setIsDragging(true);

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const elementRect = elementRef.current?.getBoundingClientRect();
    
    const offsetX = touch.clientX - (elementRect?.left ?? 0);
    const offsetY = touch.clientY - (elementRect?.top ?? 0);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0];
      const newX = moveTouch.clientX - containerRect.left - offsetX + size / 2;
      const newY = moveTouch.clientY - containerRect.top - offsetY + size / 2;
      
      // Convert to percentage
      const percentX = Math.max(5, Math.min(95, (newX / containerRect.width) * 100));
      const percentY = Math.max(5, Math.min(95, (newY / containerRect.height) * 100));
      
      onPositionChange(index, percentX, percentY);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [isEditing, containerRef, index, onPositionChange, size]);

  // If not generated and no clipart found, skip
  if (!isGenerated && !clipart) return null;

  return (
    <div
      ref={elementRef}
      className={`absolute transition-shadow ${isDragging ? 'z-50 shadow-lg scale-110' : 'z-10'} ${
        isEditing ? 'cursor-move hover:ring-2 hover:ring-white/50 rounded' : ''
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {isGenerated ? (
        <div className="relative w-full h-full">
          <img
            src={item.imageUrl}
            alt="AI Generated clipart"
            className="w-full h-full object-contain rounded"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
          />
          <Sparkles className="absolute -bottom-1 -left-1 w-3 h-3 text-amber-400" />
        </div>
      ) : (
        <div
          className="w-full h-full text-white/80"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
          dangerouslySetInnerHTML={{ __html: clipart!.svg }}
        />
      )}
      {isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-sm"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  );
}
