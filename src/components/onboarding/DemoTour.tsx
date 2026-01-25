import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useDemoTour } from '@/hooks/useDemoTour';
import { Sparkles, Users, FileText, Camera, BarChart3, Shield, Smartphone, BookOpen, Zap, Gift } from 'lucide-react';

// Demo-specific sample components with enhanced styling
const DemoWelcomeCard = () => (
  <div className="mt-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-lg border-2 border-amber-300 dark:border-amber-700 text-left">
    <div className="flex items-center gap-2 mb-3">
      <div className="p-2 bg-amber-500 rounded-full">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <span className="font-bold text-amber-700 dark:text-amber-300">Demo Mode Active</span>
    </div>
    <ul className="text-sm space-y-2">
      <li className="flex items-center gap-2">
        <span className="text-green-500">✓</span>
        <span>Full access to all features</span>
      </li>
      <li className="flex items-center gap-2">
        <span className="text-green-500">✓</span>
        <span>Sample data pre-loaded</span>
      </li>
      <li className="flex items-center gap-2">
        <span className="text-green-500">✓</span>
        <span>No credit card required</span>
      </li>
    </ul>
  </div>
);

const DemoClassesPreview = () => (
  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-left">
    <div className="flex items-center gap-2 mb-2">
      <Users className="h-4 w-4 text-blue-600" />
      <span className="font-semibold text-blue-700 dark:text-blue-300">Try This:</span>
    </div>
    <div className="text-sm space-y-2">
      <div className="p-2 bg-white dark:bg-gray-800 rounded border flex justify-between">
        <span>Create "Demo Algebra Class"</span>
        <span className="text-xs text-muted-foreground">~30 sec</span>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 rounded border flex justify-between">
        <span>Add 3 sample students</span>
        <span className="text-xs text-muted-foreground">~1 min</span>
      </div>
    </div>
    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
      💡 Each student gets a unique QR code for their worksheets
    </div>
  </div>
);

const DemoWorksheetPreview = () => (
  <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 text-left">
    <div className="flex items-center gap-2 mb-2">
      <FileText className="h-4 w-4 text-green-600" />
      <span className="font-semibold text-green-700 dark:text-green-300">AI-Powered Generation</span>
    </div>
    <div className="text-sm space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">1</span>
        <span>Select any math topic or standard</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">2</span>
        <span>Choose difficulty level</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">3</span>
        <span>AI generates questions + rubrics</span>
      </div>
    </div>
    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/50 rounded text-xs">
      <strong>Demo tip:</strong> Try generating worksheets for "Quadratic Equations" or "Triangle Congruence"
    </div>
  </div>
);

const DemoScanFeature = () => (
  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800 text-left">
    <div className="flex items-center gap-2 mb-2">
      <Camera className="h-4 w-4 text-orange-600" />
      <span className="font-semibold text-orange-700 dark:text-orange-300">Instant Grading Magic</span>
    </div>
    <div className="text-sm space-y-2">
      <div className="flex items-start gap-2">
        <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
        <span>Snap a photo of student work</span>
      </div>
      <div className="flex items-start gap-2">
        <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
        <span>QR code identifies the student</span>
      </div>
      <div className="flex items-start gap-2">
        <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
        <span>AI analyzes work & finds misconceptions</span>
      </div>
    </div>
    <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/50 rounded text-xs flex items-center gap-2">
      <span className="text-lg">⏱️</span>
      <span>Grade a full class in <strong>under 5 minutes</strong></span>
    </div>
  </div>
);

const DemoReportsPreview = () => (
  <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 text-left">
    <div className="flex items-center gap-2 mb-2">
      <BarChart3 className="h-4 w-4 text-purple-600" />
      <span className="font-semibold text-purple-700 dark:text-purple-300">Data-Driven Insights</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="p-2 bg-white dark:bg-gray-800 rounded border text-center">
        <div className="font-bold text-lg text-purple-600">📊</div>
        <div>Mastery Heatmaps</div>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 rounded border text-center">
        <div className="font-bold text-lg text-purple-600">📈</div>
        <div>Progress Tracking</div>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 rounded border text-center">
        <div className="font-bold text-lg text-purple-600">🎯</div>
        <div>Misconception Analysis</div>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 rounded border text-center">
        <div className="font-bold text-lg text-purple-600">📋</div>
        <div>Standards Reports</div>
      </div>
    </div>
  </div>
);

const DemoAIDetection = () => (
  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800 text-left">
    <div className="flex items-center gap-2 mb-2">
      <Shield className="h-4 w-4 text-red-600" />
      <span className="font-semibold text-red-700 dark:text-red-300">Academic Integrity Tools</span>
    </div>
    <div className="text-sm space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-red-500">🔍</span>
        <span>AI-generated content detection</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-red-500">✍️</span>
        <span>Handwriting similarity checks</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-red-500">🔀</span>
        <span>Anti-copy differentiated forms</span>
      </div>
    </div>
    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
      Configurable sensitivity in Settings → AI Detection
    </div>
  </div>
);

const DemoStudentApp = () => (
  <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800 text-left">
    <div className="flex items-center gap-2 mb-2">
      <Smartphone className="h-4 w-4 text-indigo-600" />
      <span className="font-semibold text-indigo-700 dark:text-indigo-300">NYCLogic Scholar Integration</span>
    </div>
    <div className="text-sm space-y-2">
      <p className="text-muted-foreground">Push personalized remediation to students' devices:</p>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border flex-1 text-center">
          <Gift className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
          <div className="text-xs">Earn XP & Coins</div>
        </div>
        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border flex-1 text-center">
          <BookOpen className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
          <div className="text-xs">Targeted Practice</div>
        </div>
      </div>
    </div>
  </div>
);

const DemoNextSteps = () => (
  <div className="mt-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 rounded-lg border-2 border-green-300 dark:border-green-700 text-left">
    <div className="font-semibold text-green-700 dark:text-green-300 mb-3">🚀 Try These Demo Actions:</div>
    <ol className="text-sm space-y-2">
      <li className="flex items-start gap-2">
        <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center shrink-0">1</span>
        <span>Go to <strong>Classes</strong> → Create a demo class</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center shrink-0">2</span>
        <span>Visit <strong>Worksheets</strong> → Generate an AI worksheet</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center shrink-0">3</span>
        <span>Check <strong>Reports</strong> → Explore sample analytics</span>
      </li>
    </ol>
    <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/50 rounded text-xs flex items-center gap-2">
      <span className="text-lg">💳</span>
      <span>Ready to upgrade? Contact us for school pricing!</span>
    </div>
  </div>
);

const demoTourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: '🎉 Welcome to Your Demo Experience!',
    content: (
      <div className="text-left space-y-2">
        <p>You're exploring <strong>NYCLogic Ai</strong> with full demo access. Let's walk through the key features you can try today!</p>
        <DemoWelcomeCard />
      </div>
    ),
  },
  {
    target: '[data-tour="nav-classes"]',
    title: '📚 Step 1: Manage Classes',
    content: (
      <div className="text-left space-y-2">
        <p>Start by creating classes and adding students. This is the foundation for everything else.</p>
        <DemoClassesPreview />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-questions"]',
    title: '📝 Step 2: Create Worksheets',
    content: (
      <div className="text-left space-y-2">
        <p>Our AI generates standards-aligned worksheets with automatic rubrics and answer keys.</p>
        <DemoWorksheetPreview />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-scan"]',
    title: '📷 Step 3: Scan & Grade',
    content: (
      <div className="text-left space-y-2">
        <p>This is the <strong>game-changer</strong>. Photograph student work and get instant AI grading with detailed feedback.</p>
        <DemoScanFeature />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-reports"]',
    title: '📊 Step 4: Analyze Results',
    content: (
      <div className="text-left space-y-2">
        <p>Powerful analytics help you identify struggling students and topics that need reteaching.</p>
        <DemoReportsPreview />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-settings"]',
    title: '🛡️ Bonus: AI Detection',
    content: (
      <div className="text-left space-y-2">
        <p>Maintain academic integrity with built-in AI detection and anti-copying features.</p>
        <DemoAIDetection />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-reports"]',
    title: '📲 Bonus: Student App Integration',
    content: (
      <div className="text-left space-y-2">
        <p>Push personalized remediation directly to students' phones via the <strong>NYCLogic Scholar</strong> companion app.</p>
        <DemoStudentApp />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: '🎯 You\'re All Set!',
    content: (
      <div className="text-left space-y-2">
        <p>Explore the demo at your own pace. Here's what we recommend trying first:</p>
        <DemoNextSteps />
        <p className="text-sm text-muted-foreground mt-3">
          Need help? Click the <strong>?</strong> button in the bottom-right corner anytime.
        </p>
      </div>
    ),
  },
];

export function DemoTour() {
  const { showDemoTour, demoTourReady, completeDemoTour, isDemoUser } = useDemoTour();

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      completeDemoTour();
    }
  };

  // Only render for demo users
  if (!isDemoUser || !demoTourReady) return null;

  return (
    <Joyride
      steps={demoTourSteps}
      run={showDemoTour}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: '#f59e0b', // Amber for demo theme
          backgroundColor: 'hsl(var(--card))',
          textColor: 'hsl(var(--card-foreground))',
          arrowColor: 'hsl(var(--card))',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
        tooltipTitle: {
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 12,
        },
        tooltipContent: {
          fontSize: 14,
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: '#f59e0b',
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 600,
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: 10,
          fontSize: 14,
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
          fontSize: 14,
        },
        buttonClose: {
          display: 'none',
        },
        spotlight: {
          borderRadius: 12,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Start Exploring!',
        next: 'Next →',
        skip: 'Skip Demo Tour',
      }}
    />
  );
}
