import { useState } from 'react';
import { ImageIcon, Library, Search, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAIImageLibrary, AIGeneratedImage } from '@/hooks/useAIImageLibrary';

interface ImageLibraryPickerProps {
  onSelectImage: (imageUrl: string, imageId: string) => void;
  topicFilter?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ImageLibraryPicker({
  onSelectImage,
  topicFilter,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  className,
}: ImageLibraryPickerProps) {
  const { approvedImages, searchApprovedImages, incrementUsage } = useAIImageLibrary();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(topicFilter || '');

  const filteredImages = searchQuery
    ? searchApprovedImages(searchQuery)
    : approvedImages;

  const handleSelectImage = async (image: AIGeneratedImage) => {
    await incrementUsage(image.id);
    onSelectImage(image.image_url, image.id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || approvedImages.length === 0}
          className={className}
        >
          <Library className="w-4 h-4 mr-1" />
          Library
          {approvedImages.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {approvedImages.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground p-4 text-center">
              <ImageIcon className="w-10 h-10 mb-2" />
              <p className="text-sm font-medium">No approved images</p>
              <p className="text-xs">Generate and approve images to add them to your library.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 p-3">
              {filteredImages.map((image) => (
                <button
                  key={image.id}
                  onClick={() => handleSelectImage(image)}
                  className="group relative aspect-square rounded-md overflow-hidden bg-muted border-2 border-transparent hover:border-primary transition-colors"
                >
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  {image.topic && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                      <p className="text-[10px] text-white truncate">{image.topic}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
