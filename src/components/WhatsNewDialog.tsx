import { useState, useEffect } from 'react';
import { Sparkles, QrCode, Square, Users, Eye, MessageCircle, Link2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Increment this version when adding new features
const CURRENT_VERSION = '1.6.0';
const STORAGE_KEY = 'scan-genius-last-seen-version';

interface Update {
  version: string;
  date: string;
  title: string;
  features: {
    icon: React.ReactNode;
    title: string;
    description: string;
  }[];
}

const updates: Update[] = [
  {
    version: '1.6.0',
    date: 'January 2026',
    title: 'Scan Scholar Integration',
    features: [
      {
        icon: <Link2 className="h-5 w-5 text-primary" />,
        title: 'Cross-App Data Sharing',
        description: 'Share student performance data with Scan Scholar to generate targeted worksheets based on misconceptions and scores.',
      },
    ],
  },
  {
    version: '1.5.0',
    date: 'January 2026',
    title: 'Student-Teacher Comments',
    features: [
      {
        icon: <MessageCircle className="h-5 w-5 text-primary" />,
        title: 'Student Questions',
        description: 'Students can now leave questions or comments on their results page for teachers to respond to.',
      },
    ],
  },
  {
    version: '1.4.0',
    date: 'January 2026',
    title: 'Student Results View & Batch QR Scanning',
    features: [
      {
        icon: <Eye className="h-5 w-5 text-primary" />,
        title: 'Student Results Page',
        description: 'Students can now view their graded work and feedback by scanning the QR code on their worksheet.',
      },
      {
        icon: <QrCode className="h-5 w-5 text-primary" />,
        title: 'Batch QR Scanning',
        description: 'Process multiple worksheets at once with fast QR code scanning to auto-match students for rapid grading.',
      },
    ],
  },
  {
    version: '1.3.0',
    date: 'January 2026',
    title: 'QR Code Scanning & Manual Region Drawing',
    features: [
      {
        icon: <QrCode className="h-5 w-5 text-primary" />,
        title: 'QR Code Auto-Detection',
        description: 'Scanned worksheets now automatically detect embedded QR codes to identify students and questions instantly.',
      },
      {
        icon: <Square className="h-5 w-5 text-primary" />,
        title: 'Manual Region Drawing',
        description: 'Draw boxes around student work areas manually when AI detection doesn\'t work well.',
      },
      {
        icon: <Users className="h-5 w-5 text-primary" />,
        title: 'Student QR Worksheets',
        description: 'Print worksheets with embedded QR codes that link each question to specific students for automatic grading.',
      },
    ],
  },
  {
    version: '1.2.0',
    date: 'December 2025',
    title: 'Multi-Student Grading',
    features: [
      {
        icon: <Users className="h-5 w-5 text-primary" />,
        title: 'Batch Photo Grading',
        description: 'Upload a single photo of multiple students\' work and grade them all at once with AI-powered region detection.',
      },
      {
        icon: <Sparkles className="h-5 w-5 text-primary" />,
        title: 'Auto Student Matching',
        description: 'Automatically match detected student names to your class roster for seamless grading.',
      },
    ],
  },
];

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);
    
    // Show dialog if user hasn't seen the current version
    if (lastSeenVersion !== CURRENT_VERSION) {
      // Small delay to let the app load first
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setOpen(false);
  };

  const latestUpdate = updates[0];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">What's New</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Version {latestUpdate.version} • {latestUpdate.date}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-2">
            {/* Latest Update */}
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">{latestUpdate.title}</h3>
              
              <div className="space-y-3">
                {latestUpdate.features.map((feature, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50 border">
                    <div className="flex-shrink-0 mt-0.5">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Previous Updates */}
            {updates.length > 1 && (
              <div className="space-y-3 pt-2 border-t">
                <h4 className="text-sm font-medium text-muted-foreground">Previous Updates</h4>
                {updates.slice(1).map((update, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        v{update.version}
                      </Badge>
                      <span className="text-sm">{update.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={handleClose} className="w-full sm:w-auto">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
