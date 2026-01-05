import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.eb4147833d0249de9a113c5e9daba81a',
  appName: 'scan-mastery-genius',
  webDir: 'dist',
  server: {
    url: 'https://eb414783-3d02-49de-9a11-3c5e9daba81a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
  }
};

export default config;
