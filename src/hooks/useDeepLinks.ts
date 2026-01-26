import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Deep link scheme: app://quickscan/scan, app://quickscan/dashboard, etc.
// This hook parses deep link URLs and navigates to the appropriate route

interface DeepLinkConfig {
  scheme?: string; // e.g., 'app' or 'quickscan'
  host?: string;   // e.g., 'quickscan' 
}

const DEFAULT_CONFIG: DeepLinkConfig = {
  scheme: 'quickscan',
  host: 'app',
};

export function useDeepLinks(config: DeepLinkConfig = DEFAULT_CONFIG) {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle deep links from Capacitor App plugin
    const handleAppUrlOpen = (event: CustomEvent<{ url: string }>) => {
      const url = event.detail?.url;
      if (!url) return;

      const route = parseDeepLink(url, config);
      if (route) {
        navigate(route);
      }
    };

    // Listen for custom deep link events (dispatched by Capacitor)
    window.addEventListener('appUrlOpen', handleAppUrlOpen as EventListener);

    // Check if app was opened with a deep link (initial URL)
    const initialUrl = (window as any).initialDeepLink;
    if (initialUrl) {
      const route = parseDeepLink(initialUrl, config);
      if (route) {
        navigate(route);
      }
      delete (window as any).initialDeepLink;
    }

    return () => {
      window.removeEventListener('appUrlOpen', handleAppUrlOpen as EventListener);
    };
  }, [navigate, config]);
}

export function parseDeepLink(url: string, config: DeepLinkConfig = DEFAULT_CONFIG): string | null {
  try {
    // Handle custom scheme URLs: quickscan://app/scan or app://quickscan/scan
    // Also handle https URLs: https://yourapp.com/scan
    
    let path: string | null = null;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Web URL - extract path
      const urlObj = new URL(url);
      path = urlObj.pathname + urlObj.search;
    } else {
      // Custom scheme URL
      // Format: scheme://host/path or scheme:///path
      const schemeMatch = url.match(/^[\w-]+:\/\/([^/]*)(\/.*)?$/);
      if (schemeMatch) {
        path = schemeMatch[2] || '/';
      }
    }

    // Validate and return the path
    if (path) {
      // Ensure path starts with /
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      
      // Map known deep link routes
      const validRoutes = [
        '/dashboard',
        '/classes',
        '/questions',
        '/assessments',
        '/scan',
        '/reports',
        '/settings',
        '/login',
        '/student/join',
        '/student/login',
        '/student/dashboard',
      ];

      // Check if it's a valid route or starts with a valid route prefix
      const isValid = validRoutes.some(route => 
        path === route || path?.startsWith(route + '/') || path?.startsWith(route + '?')
      );

      if (isValid) {
        return path;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Utility to generate deep link URLs
export function createDeepLink(
  path: string, 
  options: { scheme?: string; useWeb?: boolean; webBaseUrl?: string } = {}
): string {
  const { scheme = 'quickscan', useWeb = false, webBaseUrl } = options;
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  
  if (useWeb && webBaseUrl) {
    return `${webBaseUrl}${normalizedPath}`;
  }
  
  return `${scheme}://app${normalizedPath}`;
}
