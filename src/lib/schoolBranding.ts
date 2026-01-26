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
  // Check localStorage for school override (for demo/testing)
  const storedSchool = localStorage.getItem('school_branding');
  if (storedSchool && SCHOOL_BRANDINGS[storedSchool]) {
    return SCHOOL_BRANDINGS[storedSchool];
  }

  // Check URL for school parameter
  const urlParams = new URLSearchParams(window.location.search);
  const schoolParam = urlParams.get('school');
  if (schoolParam && SCHOOL_BRANDINGS[schoolParam]) {
    // Store in localStorage for persistence
    localStorage.setItem('school_branding', schoolParam);
    return SCHOOL_BRANDINGS[schoolParam];
  }

  // Check subdomain
  const hostname = window.location.hostname;
  for (const branding of Object.values(SCHOOL_BRANDINGS)) {
    if (branding.domain && hostname.includes(branding.domain)) {
      return branding;
    }
  }

  // Default to NYClogic
  return DEFAULT_BRANDING;
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
