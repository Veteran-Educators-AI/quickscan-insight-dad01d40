import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Shield, Smartphone, Copy, Check, Camera, Upload, KeyRound, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { AIDetectionSettings } from '@/components/settings/AIDetectionSettings';

const DEPLOYED_URL = 'https://eb414783-3d02-49de-9a11-3c5e9daba81a.lovableproject.com';

const CAPACITOR_STEPS = `# Capacitor Mobile App Build Steps

## Prerequisites
- Node.js installed
- For iOS: macOS with Xcode installed
- For Android: Android Studio installed

## Initial Setup

1. **Export to GitHub**
   Click "Export to GitHub" button in Lovable to transfer the project to your GitHub repository.

2. **Clone and Install**
   \`\`\`bash
   git clone <your-github-repo-url>
   cd <project-folder>
   npm install
   \`\`\`

3. **Add Mobile Platforms**
   \`\`\`bash
   npx cap add ios
   npx cap add android
   \`\`\`

4. **Update Native Dependencies**
   \`\`\`bash
   npx cap update ios
   npx cap update android
   \`\`\`

5. **Build the Web App**
   \`\`\`bash
   npm run build
   \`\`\`

6. **Sync to Native Platforms**
   \`\`\`bash
   npx cap sync
   \`\`\`

## Running the App

### iOS (requires Mac + Xcode)
\`\`\`bash
npx cap run ios
\`\`\`

### Android
\`\`\`bash
npx cap run android
\`\`\`

## After Pulling Updates

Whenever you pull new changes from GitHub:
\`\`\`bash
git pull
npm install
npm run build
npx cap sync
\`\`\`

## Capacitor Configuration

The app is pre-configured with:
- **App ID:** app.lovable.eb4147833d0249de9a113c5e9daba81a
- **App Name:** Regents Geometry QuickScan
- **Live Reload URL:** ${DEPLOYED_URL}?forceHideBadge=true

## Required Permissions

Make sure to configure these permissions in your native projects:

### iOS (Info.plist)
- NSCameraUsageDescription (Camera access for scanning)
- NSPhotoLibraryUsageDescription (Photo library for uploads)

### Android (AndroidManifest.xml)
- android.permission.CAMERA
- android.permission.READ_EXTERNAL_STORAGE
- android.permission.WRITE_EXTERNAL_STORAGE
`;

export default function Settings() {
  const [copied, setCopied] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(DEPLOYED_URL);
      setCopied(true);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const capabilities = [
    { icon: Camera, label: 'Camera', description: 'Required for scanning student work', required: true },
    { icon: Upload, label: 'File Upload', description: 'Upload images and PDFs', required: true },
    { icon: KeyRound, label: 'Authentication', description: 'Email/password login', required: true },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> General</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Settings will be available here. Configure grading scales, misconception tags, and topic maps.
          </CardContent>
        </Card>

        <NotificationSettings />

        <AIDetectionSettings />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Mobile App (Capacitor)</CardTitle>
            <CardDescription>Build a native mobile app from this web application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deployed URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Deployed Web App URL</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
                  {DEPLOYED_URL}
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Capabilities Checklist */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Required Capabilities</label>
              <div className="space-y-2">
                {capabilities.map((cap) => (
                  <div key={cap.label} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <cap.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{cap.label}</div>
                      <div className="text-xs text-muted-foreground">{cap.description}</div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Check className="h-3 w-3" /> Required
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Build Steps Button */}
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => setShowSteps(!showSteps)}
            >
              <span>Show Capacitor Build Steps</span>
              {showSteps ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {/* Build Steps Content */}
            {showSteps && (
              <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[60vh]">
                <pre className="text-xs whitespace-pre-wrap font-mono">{CAPACITOR_STEPS}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Privacy & Data</CardTitle>
            <CardDescription>FERPA Compliance Notice</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Student data is handled in accordance with FERPA guidelines. You can delete student data at any time from the class management page.
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
