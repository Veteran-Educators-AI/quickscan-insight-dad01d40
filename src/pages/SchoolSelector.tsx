import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { School, ArrowRight, Sparkles } from 'lucide-react';
import nycologicLogo from '@/assets/nycologic-brain-logo.png';
import hillcrestLogo from '@/assets/hillcrest-logo.png';
import { SCHOOL_BRANDINGS, setSchoolBranding, DEFAULT_BRANDING } from '@/lib/schoolBranding';

export default function SchoolSelector() {
  const navigate = useNavigate();
  const [hoveredSchool, setHoveredSchool] = useState<string | null>(null);

  const handleSelectSchool = (schoolId: string | null) => {
    setSchoolBranding(schoolId);
    // The page will reload due to setSchoolBranding
  };

  const schools = [
    {
      id: null,
      name: 'NYClogic Ai',
      displayName: 'Nyclogic',
      tagline: 'The Super Site - Full Platform Access',
      logo: nycologicLogo,
      color: 'hsl(358, 82%, 50%)',
      bgGradient: 'from-red-500/20 to-red-600/10',
      borderColor: 'border-red-500/30 hover:border-red-500/60',
    },
    {
      id: 'hillcrest',
      name: 'Hillcrest High School',
      displayName: 'Hillcrestlogic',
      tagline: 'Integrity • Respect • Equality',
      logo: hillcrestLogo,
      color: 'hsl(270, 50%, 50%)',
      bgGradient: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30 hover:border-purple-500/60',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full bg-red-500/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full bg-purple-500/5 blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/3 blur-3xl animate-pulse-slow" />
      </div>

      <div className="w-full max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <img src={nycologicLogo} alt="NYClogic Ai" className="h-20 w-auto animate-brain-pulse" />
          </div>
          <h1 
            className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-3"
            style={{ fontFamily: "'Darker Grotesque', sans-serif" }}
          >
            Welcome to <span className="text-red-500">Nyclogic Ai</span><sup className="text-sm align-super ml-0.5">™</sup>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Smart AI-powered diagnostics for student work analysis
          </p>
          <p className="text-white/40 text-sm mt-2 italic">
            Developed for urban minds by urban educators
          </p>
        </div>

        {/* School Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <School className="h-5 w-5 text-white/50" />
            <h2 className="text-lg font-medium text-white/70">Select Your School</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {schools.map((school) => (
              <Card
                key={school.id || 'nyclogic'}
                className={`relative overflow-hidden cursor-pointer transition-all duration-300 bg-white/5 backdrop-blur-sm border-2 ${school.borderColor} ${
                  hoveredSchool === (school.id || 'nyclogic') ? 'scale-[1.02] shadow-2xl' : ''
                }`}
                onMouseEnter={() => setHoveredSchool(school.id || 'nyclogic')}
                onMouseLeave={() => setHoveredSchool(null)}
                onClick={() => handleSelectSchool(school.id)}
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${school.bgGradient} opacity-50`} />
                
                {/* Super site badge */}
                {school.id === null && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-amber-500/20 rounded-full border border-amber-500/30">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">Super Site</span>
                  </div>
                )}

                <div className="relative p-6 flex flex-col items-center text-center">
                  <img 
                    src={school.logo} 
                    alt={school.name} 
                    className="h-24 w-auto mb-4 transition-transform duration-300"
                    style={{ 
                      transform: hoveredSchool === (school.id || 'nyclogic') ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                  <h3 
                    className="text-2xl font-bold text-white mb-1"
                    style={{ fontFamily: "'Darker Grotesque', sans-serif" }}
                  >
                    {school.displayName} <span style={{ color: school.color }}>Ai</span>
                  </h3>
                  <p className="text-white/50 text-sm mb-4">{school.tagline}</p>
                  
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 group"
                  >
                    Enter
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-white/30 text-xs">
            All school sites are powered by Nyclogic Ai™ technology
          </p>
        </div>
      </div>
    </div>
  );
}
