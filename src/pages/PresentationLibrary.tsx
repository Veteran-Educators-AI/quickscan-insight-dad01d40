import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Star, StarOff, Trash2, Play, Loader2, FolderOpen, 
  Calendar, Clock, ArrowLeft, Grid, List, MoreVertical, CloudOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/AppLayout';
import nyclogicLogo from '@/assets/nyclogic-presents-logo.png';

interface PresentationSlide {
  id: string;
  type: string;
  title: string;
  content: string[];
}

interface SavedPresentation {
  id: string;
  title: string;
  subtitle: string | null;
  topic: string;
  slides: PresentationSlide[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export default function PresentationLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [presentations, setPresentations] = useState<SavedPresentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPresentations();
    }
  }, [user]);

  const loadPresentations = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('nycologic_presentations')
        .select('*')
        .eq('teacher_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const parsed = (data || []).map(p => ({
        ...p,
        slides: (Array.isArray(p.slides) ? p.slides : []) as unknown as PresentationSlide[],
      }));
      
      setPresentations(parsed);
    } catch (error) {
      console.error('Error loading presentations:', error);
      toast.error('Failed to load presentations');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('nycologic_presentations')
        .update({ is_favorite: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setPresentations(prev =>
        prev.map(p => p.id === id ? { ...p, is_favorite: !currentStatus } : p)
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  };

  const deletePresentation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('nycologic_presentations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPresentations(prev => prev.filter(p => p.id !== id));
      toast.success('Presentation deleted');
      setDeleteDialogOpen(false);
      setSelectedForDelete(null);
    } catch (error) {
      console.error('Error deleting presentation:', error);
      toast.error('Failed to delete presentation');
    }
  };

  const loadPresentation = (presentation: SavedPresentation) => {
    // Convert to the format expected by PresentationView
    const presentationData = {
      id: presentation.id,
      title: presentation.title,
      subtitle: presentation.subtitle || '',
      topic: presentation.topic,
      slides: presentation.slides,
      createdAt: new Date(presentation.created_at),
    };
    
    sessionStorage.setItem('nycologic_presentation', JSON.stringify(presentationData));
    navigate('/presentation');
  };

  const filteredPresentations = presentations.filter(p => {
    const matchesSearch = searchQuery === '' || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.topic.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const favoritesPresentations = filteredPresentations.filter(p => p.is_favorite);
  const otherPresentations = filteredPresentations.filter(p => !p.is_favorite);

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src={nyclogicLogo} alt="NYClogic" className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold">Presentation Library</h1>
                <p className="text-muted-foreground text-sm">
                  {presentations.length} saved presentation{presentations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search presentations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex border rounded-lg">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : presentations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20">
              <CloudOff className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Presentations Yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Create your first NYClogic presentation from the dashboard or save one while presenting.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Favorites Section */}
            {favoritesPresentations.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <h2 className="text-lg font-semibold">Favorites</h2>
                </div>
                <PresentationGrid
                  presentations={favoritesPresentations}
                  viewMode={viewMode}
                  onLoad={loadPresentation}
                  onToggleFavorite={toggleFavorite}
                  onDelete={(id) => {
                    setSelectedForDelete(id);
                    setDeleteDialogOpen(true);
                  }}
                />
              </section>
            )}

            {/* All Presentations */}
            <section>
              {favoritesPresentations.length > 0 && otherPresentations.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">All Presentations</h2>
                </div>
              )}
              <PresentationGrid
                presentations={otherPresentations}
                viewMode={viewMode}
                onLoad={loadPresentation}
                onToggleFavorite={toggleFavorite}
                onDelete={(id) => {
                  setSelectedForDelete(id);
                  setDeleteDialogOpen(true);
                }}
              />
            </section>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Presentation?</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              This action cannot be undone. The presentation will be permanently deleted.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => selectedForDelete && deletePresentation(selectedForDelete)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

interface PresentationGridProps {
  presentations: SavedPresentation[];
  viewMode: 'grid' | 'list';
  onLoad: (presentation: SavedPresentation) => void;
  onToggleFavorite: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
}

function PresentationGrid({ 
  presentations, 
  viewMode, 
  onLoad, 
  onToggleFavorite, 
  onDelete 
}: PresentationGridProps) {
  if (presentations.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No presentations found
      </p>
    );
  }

  return (
    <div className={cn(
      viewMode === 'grid' 
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
        : 'space-y-2'
    )}>
      <AnimatePresence>
        {presentations.map((presentation, index) => (
          <motion.div
            key={presentation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05 }}
          >
            {viewMode === 'grid' ? (
              <Card className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden">
                <div 
                  onClick={() => onLoad(presentation)}
                  className="aspect-video bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 relative flex items-center justify-center"
                >
                  <div className="text-center p-4">
                    <h3 className="text-white font-bold text-lg line-clamp-2">
                      {presentation.title}
                    </h3>
                    {presentation.subtitle && (
                      <p className="text-white/60 text-sm mt-1 line-clamp-1">
                        {presentation.subtitle}
                      </p>
                    )}
                  </div>
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Play className="h-4 w-4" />
                      Open
                    </Button>
                  </div>
                  
                  {/* Slide count badge */}
                  <Badge className="absolute bottom-2 right-2 bg-black/50">
                    {presentation.slides.length} slides
                  </Badge>
                </div>
                
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="text-xs mb-1">
                        {presentation.topic}
                      </Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(presentation.updated_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(presentation.id, presentation.is_favorite);
                        }}
                      >
                        {presentation.is_favorite ? (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onLoad(presentation);
                            }}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(presentation.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onLoad(presentation)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-16 w-24 rounded bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white/60 text-xs">{presentation.slides.length} slides</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{presentation.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {presentation.topic}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(presentation.updated_at), 'MMM d')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(presentation.id, presentation.is_favorite);
                      }}
                    >
                      {presentation.is_favorite ? (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(presentation.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
