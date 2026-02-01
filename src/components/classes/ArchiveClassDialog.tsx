import { useState } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ArchiveClassDialogProps {
  classId: string;
  className: string;
  isArchived: boolean;
  onUpdate: () => void;
}

export function ArchiveClassDialog({
  classId,
  className,
  isArchived,
  onUpdate,
}: ArchiveClassDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleToggleArchive = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          archived_at: isArchived ? null : new Date().toISOString(),
        })
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: isArchived ? 'Class restored' : 'Class archived',
        description: isArchived
          ? `${className} has been restored to active classes`
          : `${className} has been moved to archives`,
      });
      onUpdate();
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast({
        title: 'Error',
        description: 'Failed to update class',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${isArchived ? 'text-green-600' : 'text-muted-foreground'}`}
          title={isArchived ? 'Restore class' : 'Archive class'}
        >
          {isArchived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isArchived ? 'Restore Class?' : 'Archive Class?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArchived ? (
              <>
                This will restore <strong>{className}</strong> to your active classes.
                Students and data will remain intact.
              </>
            ) : (
              <>
                This will archive <strong>{className}</strong>. The class will be hidden
                from your main view but all data will be preserved. You can restore it
                anytime from the Archives tab.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleToggleArchive}
            disabled={loading}
            className={isArchived ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {loading
              ? 'Processing...'
              : isArchived
              ? 'Restore Class'
              : 'Archive Class'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
