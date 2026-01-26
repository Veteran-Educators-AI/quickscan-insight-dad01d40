// School branding configuration for white-labeling
// This allows schools to customize the platform appearance

import hillcrestLogo from '@/assets/hillcrest-logo.png';
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
  domains?: string[]; // Domains that trigger this branding
}

// Default NYClogic branding (the "Super Site")
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
  domains: ['localhost', 'lovable.app', 'nyclogicai.com', 'nyclogic.ai'],
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
    domains: ['thescangeniusapp.com', 'hillcrest.nyclogicai.com'],
  },
};

// Storage key for manual school selection
const SCHOOL_BRANDING_KEY = 'selected_school_branding';

// Check if the user has seen the school selector
const SCHOOL_SELECTOR_SEEN_KEY = 'school_selector_seen';

// Detect branding based on current domain
function detectBrandingByDomain(): SchoolBranding | null {
  const hostname = window.location.hostname.toLowerCase();
  
  // Check school brandings first
  for (const [, branding] of Object.entries(SCHOOL_BRANDINGS)) {
    if (branding.domains?.some(domain => hostname.includes(domain))) {
      return branding;
    }
  }
  
  // Check if it matches default domains
  if (DEFAULT_BRANDING.domains?.some(domain => hostname.includes(domain))) {
    return DEFAULT_BRANDING;
  }
  
  return null;
}

// Get branding based on current context (domain or stored preference)
export function getSchoolBranding(): SchoolBranding {
  // First, check domain-based detection
  const domainBranding = detectBrandingByDomain();
  
  // If domain specifically maps to a school (not default), use that
  if (domainBranding && domainBranding.id !== 'nyclogic') {
    return domainBranding;
  }
  
  // Check for manually selected branding
  const storedBrandingId = localStorage.getItem(SCHOOL_BRANDING_KEY);
  if (storedBrandingId && SCHOOL_BRANDINGS[storedBrandingId]) {
    return SCHOOL_BRANDINGS[storedBrandingId];
  }
  
  // Default to NYClogic Ai (the super site)
  return DEFAULT_BRANDING;
}

// Check if the school selector should be shown
export function shouldShowSchoolSelector(): boolean {
  // If domain specifically maps to a school, don't show selector
  const domainBranding = detectBrandingByDomain();
  if (domainBranding && domainBranding.id !== 'nyclogic') {
    return false;
  }
  
  // Check if user has already selected a school or dismissed the selector
  const hasSeen = localStorage.getItem(SCHOOL_SELECTOR_SEEN_KEY);
  const hasSelected = localStorage.getItem(SCHOOL_BRANDING_KEY);
  
  return !hasSeen && !hasSelected;
}

// Mark that the user has seen/interacted with the school selector
export function markSchoolSelectorSeen(): void {
  localStorage.setItem(SCHOOL_SELECTOR_SEEN_KEY, 'true');
}

// Set school branding (for admin/demo purposes)
export function setSchoolBranding(schoolId: string | null): void {
  markSchoolSelectorSeen();
  
  if (schoolId && SCHOOL_BRANDINGS[schoolId]) {
    localStorage.setItem(SCHOOL_BRANDING_KEY, schoolId);
  } else {
    localStorage.removeItem(SCHOOL_BRANDING_KEY);
  }
  // Reload to apply changes
  window.location.href = '/login';
}

// Clear branding preference (to show selector again)
export function clearSchoolBrandingPreference(): void {
  localStorage.removeItem(SCHOOL_BRANDING_KEY);
  localStorage.removeItem(SCHOOL_SELECTOR_SEEN_KEY);
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

// Get the "Powered by" branding info (always NYClogic Ai)
export function getPoweredByBranding(): { logo: string; name: string } {
  return {
    logo: nycologicLogo,
    name: 'Nyclogic Ai',
  };
}

// Check if current branding is a school (not the super site)
export function isSchoolBranding(): boolean {
  const branding = getSchoolBranding();
  return branding.id !== 'nyclogic';
}
