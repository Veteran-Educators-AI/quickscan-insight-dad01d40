import { getPoweredByBranding, isSchoolBranding } from '@/lib/schoolBranding';

interface PoweredByBadgeProps {
  className?: string;
  alwaysShow?: boolean;
}

export function PoweredByBadge({ className = '', alwaysShow = false }: PoweredByBadgeProps) {
  const { logo, name } = getPoweredByBranding();
  
  // Only show badge for school-branded sites (or if alwaysShow is true)
  if (!alwaysShow && !isSchoolBranding()) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <p className="text-xs text-muted-foreground">Powered by</p>
      <div className="flex items-center gap-2">
        <img src={logo} alt="NYClogic Ai" className="h-8 w-auto" />
        <span 
          className="text-lg font-bold tracking-tight" 
          style={{ fontFamily: "'Darker Grotesque', sans-serif" }}
        >
          Nyclogic <span style={{ color: 'hsl(358, 82%, 50%)' }}>Ai</span>
        </span>
      </div>
    </div>
  );
}
