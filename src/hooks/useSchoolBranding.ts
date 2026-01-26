import { useState, useEffect } from 'react';
import { 
  getSchoolBranding, 
  applyBrandingColors, 
  SchoolBranding,
  DEFAULT_BRANDING 
} from '@/lib/schoolBranding';

export function useSchoolBranding() {
  const [branding, setBranding] = useState<SchoolBranding>(DEFAULT_BRANDING);
  const [isCustomBranding, setIsCustomBranding] = useState(false);

  useEffect(() => {
    const currentBranding = getSchoolBranding();
    setBranding(currentBranding);
    setIsCustomBranding(currentBranding.id !== 'nyclogic');
    
    // Apply colors
    applyBrandingColors(currentBranding);

    // Cleanup: reset to default colors when unmounting
    return () => {
      applyBrandingColors(DEFAULT_BRANDING);
    };
  }, []);

  return {
    branding,
    isCustomBranding,
  };
}
