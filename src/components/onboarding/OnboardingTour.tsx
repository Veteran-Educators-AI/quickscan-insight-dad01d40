import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

// Sample data components for rich examples
const SampleClassCard = () => (
  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-left">
    <div className="flex items-center justify-between mb-2">
      <span className="font-semibold text-blue-700 dark:text-blue-300">Period 1 Geometry</span>
      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">25 students</span>
    </div>
    <div className="text-xs text-muted-foreground space-y-1">
      <div className="flex justify-between"><span>Emma Johnson</span><span className="text-green-600">92%</span></div>
      <div className="flex justify-between"><span>Marcus Chen</span><span className="text-yellow-600">78%</span></div>
      <div className="flex justify-between"><span>Sofia Rodriguez</span><span className="text-red-600">65%</span></div>
    </div>
  </div>
);

const SampleWorksheetCard = () => (
  <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 text-left">
    <div className="font-semibold text-green-700 dark:text-green-300 mb-2">Triangle Congruence Assessment</div>
    <div className="text-xs space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-green-500 text-white text-[10px] flex items-center justify-center">1</span>
        <span>Prove △ABC ≅ △DEF using SAS...</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-green-500 text-white text-[10px] flex items-center justify-center">2</span>
        <span>Given: AB = 5, BC = 7, ∠B = 60°...</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-green-500 text-white text-[10px] flex items-center justify-center">3</span>
        <span>Which theorem proves congruence?</span>
      </div>
    </div>
    <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800 flex gap-2">
      <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">G.CO.B.8</span>
      <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">Medium</span>
    </div>
  </div>
);

const SampleScanResult = () => (
  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800 text-left">
    <div className="flex items-center justify-between mb-2">
      <div>
        <span className="font-semibold text-orange-700 dark:text-orange-300">Marcus Chen</span>
        <span className="text-xs text-muted-foreground ml-2">via QR Code</span>
      </div>
      <span className="text-lg font-bold text-orange-600">85%</span>
    </div>
    <div className="text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-green-500">✓</span>
        <span>Correctly identified SAS theorem</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-500">✓</span>
        <span>Proper notation for congruence</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-red-500">✗</span>
        <span className="text-red-600 dark:text-red-400">Missing: Statement of given info</span>
      </div>
    </div>
    <div className="mt-2 pt-2 border-t border-orange-200 dark:border-orange-800 text-xs text-orange-600 dark:text-orange-400">
      💡 Misconception: Skipping the "Given" step in proofs
    </div>
  </div>
);

const SampleHeatmap = () => (
  <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 text-left">
    <div className="font-semibold text-purple-700 dark:text-purple-300 mb-2">Mastery Heatmap</div>
    <div className="grid grid-cols-4 gap-1 text-[10px]">
      <div className="text-center text-muted-foreground">Student</div>
      <div className="text-center text-muted-foreground">SAS</div>
      <div className="text-center text-muted-foreground">ASA</div>
      <div className="text-center text-muted-foreground">SSS</div>
      
      <div>Emma</div>
      <div className="bg-green-500 text-white text-center rounded">92</div>
      <div className="bg-green-500 text-white text-center rounded">88</div>
      <div className="bg-green-400 text-white text-center rounded">85</div>
      
      <div>Marcus</div>
      <div className="bg-yellow-500 text-white text-center rounded">78</div>
      <div className="bg-green-400 text-white text-center rounded">82</div>
      <div className="bg-yellow-500 text-white text-center rounded">75</div>
      
      <div>Sofia</div>
      <div className="bg-red-500 text-white text-center rounded">58</div>
      <div className="bg-yellow-500 text-white text-center rounded">72</div>
      <div className="bg-red-400 text-white text-center rounded">62</div>
    </div>
    <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
      🎯 Sofia needs help with SAS and SSS proofs
    </div>
  </div>
);

const SampleDifferentiation = () => (
  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-left">
    <div className="font-semibold text-amber-700 dark:text-amber-300 mb-2">Differentiated Forms</div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="p-2 bg-white dark:bg-gray-800 rounded border">
        <div className="font-medium text-amber-600">Form A</div>
        <div className="text-muted-foreground">Emma, Liam, Ava</div>
        <div className="text-[10px] text-green-600">Advanced level</div>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 rounded border">
        <div className="font-medium text-amber-600">Form B</div>
        <div className="text-muted-foreground">Marcus, Noah</div>
        <div className="text-[10px] text-yellow-600">Standard level</div>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 rounded border">
        <div className="font-medium text-amber-600">Form C</div>
        <div className="text-muted-foreground">Sofia, Mia</div>
        <div className="text-[10px] text-orange-600">Foundational level</div>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 rounded border text-center text-muted-foreground">
        <div className="text-lg">+7</div>
        <div className="text-[10px]">more forms</div>
      </div>
    </div>
  </div>
);

const SampleAIDetection = () => (
  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800 text-left">
    <div className="flex items-center justify-between mb-2">
      <span className="font-semibold text-red-700 dark:text-red-300">⚠️ Flagged Submission</span>
      <span className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">87% AI probability</span>
    </div>
    <div className="text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-red-500">!</span>
        <span>Unusual vocabulary for grade level</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-red-500">!</span>
        <span>Perfect formatting throughout</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-red-500">!</span>
        <span>Inconsistent with prior handwriting</span>
      </div>
    </div>
    <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800 text-xs">
      <span className="text-red-600 dark:text-red-400">Action:</span> Review submission manually
    </div>
  </div>
);

const tourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: '👋 Welcome to NYCLogic Ai!',
    content: (
      <div className="text-left space-y-2">
        <p>Let's take a quick tour to help you get started with grading student work efficiently.</p>
        <p className="text-sm text-muted-foreground">This will only take about 2 minutes and includes real examples.</p>
        <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="text-xs font-medium text-primary mb-1">What you'll learn:</div>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>✓ Create classes and add students</li>
            <li>✓ Build AI-powered worksheets</li>
            <li>✓ Scan and grade work instantly</li>
            <li>✓ Track progress with reports</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    target: '[data-tour="nav-classes"]',
    title: '📚 Classes',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Create and manage your classes here.</strong></p>
        <p className="text-sm text-muted-foreground">
          Add students manually or import via CSV. Each student gets a unique QR code.
        </p>
        <SampleClassCard />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-questions"]',
    title: '📝 Build Worksheets',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Create standards-aligned assessments.</strong></p>
        <p className="text-sm text-muted-foreground">
          Select topics, choose difficulty, and let AI generate questions with rubrics.
        </p>
        <SampleWorksheetCard />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-questions"]',
    title: '🔀 Differentiated Forms (Anti-Copy)',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Prevent copying with unique versions!</strong></p>
        <p className="text-sm text-muted-foreground">
          Generate up to 10 different forms covering the same concepts. Students sitting together get different questions.
        </p>
        <SampleDifferentiation />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-scan"]',
    title: '📷 Scan & Grade Instantly',
    content: (
      <div className="text-left space-y-2">
        <p><strong>This is where the magic happens!</strong></p>
        <p className="text-sm text-muted-foreground">
          Snap a photo → AI reads the QR code → Grades the work → Identifies misconceptions.
        </p>
        <SampleScanResult />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-reports"]',
    title: '📊 Track Progress',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Visualize student mastery at a glance.</strong></p>
        <p className="text-sm text-muted-foreground">
          See heatmaps, track individual progress, and identify topics needing reteaching.
        </p>
        <SampleHeatmap />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-settings"]',
    title: '🛡️ AI Detection',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Maintain academic integrity.</strong></p>
        <p className="text-sm text-muted-foreground">
          The system flags potentially AI-generated work for your review.
        </p>
        <SampleAIDetection />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: '🎉 You\'re Ready to Go!',
    content: (
      <div className="text-left space-y-3">
        <p><strong>Your first steps:</strong></p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li><strong>Create a class</strong> with a few test students</li>
          <li><strong>Build a worksheet</strong> on any topic</li>
          <li><strong>Print it</strong> (includes QR codes)</li>
          <li><strong>Scan</strong> a completed paper to see instant results</li>
        </ol>
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            💡 <strong>Pro tip:</strong> Click the help button (bottom right) anytime to ask questions or restart this tour!
          </p>
        </div>
      </div>
    ),
  },
];

export function OnboardingTour() {
  const { showTour, tourReady, completeTour } = useOnboardingTour();

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      completeTour();
    }
  };

  if (!tourReady) return null;

  return (
    <Joyride
      steps={tourSteps}
      run={showTour}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--card))',
          textColor: 'hsl(var(--card-foreground))',
          arrowColor: 'hsl(var(--card))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        tooltipTitle: {
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 8,
        },
        tooltipContent: {
          fontSize: 14,
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 500,
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: 8,
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
          borderRadius: 8,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Get Started!',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}
