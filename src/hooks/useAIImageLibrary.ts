import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface AIGeneratedImage {
  id: string;
  teacher_id: string;
  image_url: string;
  prompt: string;
  subject: string | null;
  topic: string | null;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  source: 'worksheet' | 'presentation' | 'clipart' | 'manual';
  usage_count: number;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export function useAIImageLibrary() {
  const { user } = useAuth();
  const [images, setImages] = useState<AIGeneratedImage[]>([]);
  const [pendingImages, setPendingImages] = useState<AIGeneratedImage[]>([]);
  const [approvedImages, setApprovedImages] = useState<AIGeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all images for the teacher
  const fetchImages = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_generated_images')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = (data || []) as AIGeneratedImage[];
      setImages(typedData);
      setPendingImages(typedData.filter(img => img.status === 'pending'));
      setApprovedImages(typedData.filter(img => img.status === 'approved'));
    } catch (error) {
      console.error('Error fetching AI images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save a new generated image for review
  const saveImageForReview = async (
    imageUrl: string,
    prompt: string,
    options: {
      subject?: string;
      topic?: string;
      tags?: string[];
      source?: 'worksheet' | 'presentation' | 'clipart' | 'manual';
    } = {}
  ): Promise<AIGeneratedImage | null> => {
    if (!user) {
      toast.error('You must be logged in to save images');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('ai_generated_images')
        .insert({
          teacher_id: user.id,
          image_url: imageUrl,
          prompt,
          subject: options.subject || null,
          topic: options.topic || null,
          tags: options.tags || [],
          source: options.source || 'worksheet',
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      const newImage = data as AIGeneratedImage;
      setImages(prev => [newImage, ...prev]);
      setPendingImages(prev => [newImage, ...prev]);
      
      return newImage;
    } catch (error) {
      console.error('Error saving image for review:', error);
      toast.error('Failed to save image for review');
      return null;
    }
  };

  // Approve an image
  const approveImage = async (imageId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('ai_generated_images')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', imageId)
        .eq('teacher_id', user.id);

      if (error) throw error;

      // Update local state
      setImages(prev =>
        prev.map(img =>
          img.id === imageId
            ? { ...img, status: 'approved' as const, reviewed_at: new Date().toISOString() }
            : img
        )
      );
      setPendingImages(prev => prev.filter(img => img.id !== imageId));
      const approvedImg = images.find(img => img.id === imageId);
      if (approvedImg) {
        setApprovedImages(prev => [{ ...approvedImg, status: 'approved' as const }, ...prev]);
      }

      toast.success('Image approved and added to your library');
      return true;
    } catch (error) {
      console.error('Error approving image:', error);
      toast.error('Failed to approve image');
      return false;
    }
  };

  // Reject an image
  const rejectImage = async (imageId: string, reason?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('ai_generated_images')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq('id', imageId)
        .eq('teacher_id', user.id);

      if (error) throw error;

      // Update local state
      setImages(prev =>
        prev.map(img =>
          img.id === imageId
            ? { ...img, status: 'rejected' as const, reviewed_at: new Date().toISOString(), rejection_reason: reason || null }
            : img
        )
      );
      setPendingImages(prev => prev.filter(img => img.id !== imageId));

      toast.success('Image rejected');
      return true;
    } catch (error) {
      console.error('Error rejecting image:', error);
      toast.error('Failed to reject image');
      return false;
    }
  };

  // Delete an image
  const deleteImage = async (imageId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('ai_generated_images')
        .delete()
        .eq('id', imageId)
        .eq('teacher_id', user.id);

      if (error) throw error;

      // Update local state
      setImages(prev => prev.filter(img => img.id !== imageId));
      setPendingImages(prev => prev.filter(img => img.id !== imageId));
      setApprovedImages(prev => prev.filter(img => img.id !== imageId));

      toast.success('Image deleted');
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
      return false;
    }
  };

  // Increment usage count when an image is used
  const incrementUsage = async (imageId: string): Promise<void> => {
    if (!user) return;

    try {
      // Get current usage count and increment
      const { data: currentImage } = await supabase
        .from('ai_generated_images')
        .select('usage_count')
        .eq('id', imageId)
        .single();

      const newCount = (currentImage?.usage_count || 0) + 1;

      await supabase
        .from('ai_generated_images')
        .update({ usage_count: newCount })
        .eq('id', imageId);

      // Update local state
      setImages(prev =>
        prev.map(img =>
          img.id === imageId
            ? { ...img, usage_count: newCount }
            : img
        )
      );
      setApprovedImages(prev =>
        prev.map(img =>
          img.id === imageId
            ? { ...img, usage_count: newCount }
            : img
        )
      );
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  };

  // Search approved images by topic or tags
  const searchApprovedImages = (query: string): AIGeneratedImage[] => {
    const lowerQuery = query.toLowerCase();
    return approvedImages.filter(
      img =>
        img.topic?.toLowerCase().includes(lowerQuery) ||
        img.prompt.toLowerCase().includes(lowerQuery) ||
        img.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        img.subject?.toLowerCase().includes(lowerQuery)
    );
  };

  // Get images by topic
  const getImagesByTopic = (topic: string): AIGeneratedImage[] => {
    return approvedImages.filter(
      img => img.topic?.toLowerCase() === topic.toLowerCase()
    );
  };

  // Load images on mount
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return {
    images,
    pendingImages,
    approvedImages,
    isLoading,
    fetchImages,
    saveImageForReview,
    approveImage,
    rejectImage,
    deleteImage,
    incrementUsage,
    searchApprovedImages,
    getImagesByTopic,
    pendingCount: pendingImages.length,
  };
}
