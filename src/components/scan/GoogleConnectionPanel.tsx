import { useState, useEffect } from 'react';
import { Cloud, CheckCircle, Loader2, ChevronDown, FolderSync, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { useGoogleClassroom } from '@/hooks/useGoogleClassroom';

interface GoogleConnectionPanelProps {
  onDriveImport?: () => void;
  onClassroomImport?: () => void;
}

export function GoogleConnectionPanel({ onDriveImport, onClassroomImport }: GoogleConnectionPanelProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const { connected: driveConnected, checkConnection: checkDriveConnection } = useGoogleDrive();
  const { hasClassroomAccess } = useGoogleClassroom();
  
  const [classroomConnected, setClassroomConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkConnections = async () => {
      // Quick timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        if (isMounted) setIsLoading(false);
      }, 3000);
      
      try {
        const driveOk = await checkDriveConnection();
        if (!isMounted) return;
        
        if (driveOk) {
          const hasAccess = await hasClassroomAccess();
          if (isMounted) setClassroomConnected(hasAccess);
        }
      } catch (err) {
        console.log('Google connection check failed:', err);
      } finally {
        clearTimeout(timeout);
        if (isMounted) setIsLoading(false);
      }
    };
    
    checkConnections();
    
    return () => { isMounted = false; };
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const scopes = [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.rosters.readonly',
        'https://www.googleapis.com/auth/classroom.coursework.students',
        'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
      ].join(' ');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/scan',
          scopes,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Google connection error:', error);
      toast.error(error.message || 'Failed to connect Google services');
      setIsConnecting(false);
    }
  };

  const isConnected = driveConnected || classroomConnected;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardContent className="py-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  isConnected ? 'bg-green-500/10' : 'bg-muted'
                }`}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : isConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    Google Integration
                    {isConnected && (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                        Connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isConnected 
                      ? 'Import from Drive or Classroom' 
                      : 'Connect to import student work'}
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-3">
            {!isConnected && !isLoading && (
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting}
                className="w-full"
                variant="outline"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4 mr-2" />
                )}
                Connect Google Drive & Classroom
              </Button>
            )}
            
            {isConnected && (
              <div className="grid grid-cols-2 gap-2">
                {driveConnected && onDriveImport && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onDriveImport}
                    className="gap-2"
                  >
                    <FolderSync className="h-4 w-4" />
                    Drive Import
                  </Button>
                )}
                {classroomConnected && onClassroomImport && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onClassroomImport}
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Classroom
                  </Button>
                )}
              </div>
            )}
            
            {!isConnected && !isLoading && (
              <p className="text-xs text-muted-foreground text-center">
                Sign in with Google to import scans from Drive or pull assignments from Classroom
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}