import { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';
import { toast } from 'sonner';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  student_id: string | null;
}

interface SyncRosterToScholarButtonProps {
  classId: string;
  className: string;
  students: Student[];
}

export function SyncRosterToScholarButton({
  classId,
  className,
  students,
}: SyncRosterToScholarButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const { pushToSisterApp } = usePushToSisterApp();

  const handleSync = async () => {
    if (students.length === 0) {
      toast.error('No students to sync');
      return;
    }

    setShowDialog(true);
    setSyncing(true);
    setProgress(0);
    setSyncedCount(0);
    setFailedCount(0);

    let synced = 0;
    let failed = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const fullName = `${student.first_name} ${student.last_name}`;

      try {
        const result = await pushToSisterApp({
          class_id: classId,
          title: 'Roster Sync',
          student_id: student.id,
          student_name: fullName,
          type: 'student_created',
          first_name: student.first_name,
          last_name: student.last_name,
          student_email: student.email || undefined,
          class_name: className,
        });

        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to sync ${fullName}:`, error);
        failed++;
      }

      setSyncedCount(synced);
      setFailedCount(failed);
      setProgress(Math.round(((i + 1) / students.length) * 100));
    }

    setSyncing(false);

    if (failed === 0) {
      toast.success(`Successfully synced ${synced} students to Scholar`);
    } else if (synced > 0) {
      toast.warning(`Synced ${synced} students. ${failed} failed.`);
    } else {
      toast.error('Failed to sync roster. Check Scholar connection in Settings.');
    }
  };

  const handleClose = () => {
    if (!syncing) {
      setShowDialog(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleSync}
        disabled={syncing || students.length === 0}
        className="gap-2"
      >
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4 text-purple-500" />
        )}
        Sync to Scholar
      </Button>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {syncing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                  Syncing Roster...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Sync Complete
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Sending student roster to NYCLogic Scholar AI App
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Progress value={progress} className="h-2" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{syncedCount}</p>
                <p className="text-xs text-muted-foreground">Synced</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>

            {!syncing && failedCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Some students failed to sync. This may be due to Scholar connection issues.
                Check Settings → Integrations.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose} disabled={syncing}>
              {syncing ? 'Please wait...' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
