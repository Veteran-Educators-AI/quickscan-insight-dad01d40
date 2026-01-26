// School branding configuration for white-labeling
// This allows schools to customize the platform appearance

import hillcrestLogo from '@/assets/hillcrest-logo.jpg';
import nycologicLogo from '@/assets/nycologic-brain-logo.png';

export interface SchoolBranding {
  id: string;
  name: string;
  displayName: string; // e.g., "Hillcrestlogic"
  aiSuffix: string; // Usually "Ai"
  tagline?: string;
  secondaryTagline?: string;
  logo?: string;
  primaryColor: string; // HSL values for CSS variable override
  accentColor: string;
  domain?: string; // Optional: auto-detect branding by domain
}

// Default NYClogic branding
export const DEFAULT_BRANDING: SchoolBranding = {
  id: 'nyclogic',
  name: 'NYClogic',
  displayName: 'Nyclogic',
  aiSuffix: 'Ai',
  tagline: 'Fast, structured diagnostics aligned to state standards',
  secondaryTagline: 'Developed for urban minds by urban educators',
  logo: nycologicLogo,
  primaryColor: '358 82% 50%', // Red
  accentColor: '358 82% 50%',
};

// School-specific brandings
export const SCHOOL_BRANDINGS: Record<string, SchoolBranding> = {
  hillcrest: {
    id: 'hillcrest',
    name: 'Hillcrest High School',
    displayName: 'Hillcrestlogic',
    aiSuffix: 'Ai',
    tagline: 'Fast, structured diagnostics aligned to state standards',
    secondaryTagline: 'Integrity • Respect • Equality',
    logo: hillcrestLogo,
    primaryColor: '270 50% 50%', // Purple
    accentColor: '270 50% 50%',
    domain: 'hillcrest',
  },
};

// Get branding based on current context (could be domain, subdomain, or stored preference)
export function getSchoolBranding(): SchoolBranding {
  // For demo: Default to Hillcrest branding
  // In production, this would be controlled by domain or admin settings
  return SCHOOL_BRANDINGS.hillcrest;
}

// Set school branding (for admin/demo purposes)
export function setSchoolBranding(schoolId: string | null): void {
  if (schoolId && SCHOOL_BRANDINGS[schoolId]) {
    localStorage.setItem('school_branding', schoolId);
  } else {
    localStorage.removeItem('school_branding');
  }
  // Reload to apply changes
  window.location.reload();
}

// Apply branding colors to CSS variables
export function applyBrandingColors(branding: SchoolBranding): void {
  const root = document.documentElement;
  root.style.setProperty('--primary', branding.primaryColor);
  root.style.setProperty('--accent', branding.accentColor);
  root.style.setProperty('--ring', branding.primaryColor);
  root.style.setProperty('--sidebar-primary', branding.primaryColor);
  root.style.setProperty('--sidebar-ring', branding.primaryColor);
}

// Get the "Powered by" branding info
export function getPoweredByBranding(): { logo: string; name: string } {
  return {
    logo: nycologicLogo,
    name: 'Nyclogic Ai',
  };
}
