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

const SampleTopicSelection = () => (
  <div className="mt-3 p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg border border-cyan-200 dark:border-cyan-800 text-left">
    <div className="font-semibold text-cyan-700 dark:text-cyan-300 mb-2">📘 Choose Your Topic</div>
    <div className="space-y-2 text-xs">
      <div className="p-2 bg-white dark:bg-gray-800 rounded border flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-cyan-500 flex items-center justify-center text-white text-[10px]">✓</div>
        <div>
          <div className="font-medium">Triangle Congruence (G.CO.B.8)</div>
          <div className="text-muted-foreground">SAS, ASA, SSS, AAS proofs</div>
        </div>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 rounded border flex items-center gap-2 opacity-60">
        <div className="w-5 h-5 rounded border flex items-center justify-center"></div>
        <div>
          <div className="font-medium">Parallel Lines & Transversals</div>
          <div className="text-muted-foreground">Alternate, corresponding angles</div>
        </div>
      </div>
    </div>
    <div className="mt-2 text-xs text-cyan-600 dark:text-cyan-400">
      💡 Select topic(s) to build your lesson around
    </div>
  </div>
);

const SampleDiagnostic = () => (
  <div className="mt-3 p-3 bg-violet-50 dark:bg-violet-950/30 rounded-lg border border-violet-200 dark:border-violet-800 text-left">
    <div className="font-semibold text-violet-700 dark:text-violet-300 mb-2">🎯 Quickstart Diagnostic</div>
    <div className="text-xs space-y-2">
      <p className="text-muted-foreground">Assess student readiness with a leveled diagnostic:</p>
      <div className="grid grid-cols-3 gap-1">
        <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded text-center">
          <div className="font-medium text-green-700 dark:text-green-300">Level A</div>
          <div className="text-[10px] text-green-600">Basic</div>
        </div>
        <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/50 rounded text-center">
          <div className="font-medium text-yellow-700 dark:text-yellow-300">Level C</div>
          <div className="text-[10px] text-yellow-600">Standard</div>
        </div>
        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded text-center">
          <div className="font-medium text-purple-700 dark:text-purple-300">Level F</div>
          <div className="text-[10px] text-purple-600">Advanced</div>
        </div>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 rounded border">
        <div className="flex justify-between text-[11px]">
          <span>Sofia Rodriguez</span>
          <span className="text-orange-600">→ Recommended: Level B</span>
        </div>
      </div>
    </div>
  </div>
);

const SampleLessonPlan = () => (
  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-left">
    <div className="font-semibold text-amber-700 dark:text-amber-300 mb-2">📊 AI Lesson Plan</div>
    <div className="text-xs space-y-2">
      <div className="p-2 bg-white dark:bg-gray-800 rounded border">
        <div className="font-medium">Triangle Congruence Lesson</div>
        <div className="text-muted-foreground">45 min • G.CO.B.8</div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-amber-500 text-white text-[10px] flex items-center justify-center">1</span>
          <span>Warm-up: Review triangle properties</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-amber-500 text-white text-[10px] flex items-center justify-center">2</span>
          <span>Direct instruction: SAS theorem</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-amber-500 text-white text-[10px] flex items-center justify-center">3</span>
          <span>Guided practice & exit ticket</span>
        </div>
      </div>
    </div>
    <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
      ✨ Includes slides, speaker notes & worksheets
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

const SampleSisterAppPush = () => (
  <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800 text-left">
    <div className="flex items-center justify-between mb-2">
      <span className="font-semibold text-indigo-700 dark:text-indigo-300">📲 Push to NYCLogic Scholar</span>
      <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">3 students</span>
    </div>
    <div className="text-xs space-y-2">
      <div className="p-2 bg-white dark:bg-gray-800 rounded border flex justify-between items-center">
        <div>
          <div className="font-medium">Sofia Rodriguez</div>
          <div className="text-muted-foreground">Struggling with G.CO.B.8</div>
        </div>
        <span className="text-green-500 text-lg">✓</span>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 rounded border flex justify-between items-center">
        <div>
          <div className="font-medium">Marcus Chen</div>
          <div className="text-muted-foreground">Needs practice: SAS proofs</div>
        </div>
        <span className="text-green-500 text-lg">✓</span>
      </div>
    </div>
    <div className="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-800 text-xs text-indigo-600 dark:text-indigo-400">
      🎮 Students receive personalized practice on their phones!
    </div>
  </div>
);

const tourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: '👋 Welcome to Your Teaching Workflow!',
    content: (
      <div className="text-left space-y-2">
        <p>Let's walk through a <strong>typical lesson workflow</strong> from start to finish.</p>
        <p className="text-sm text-muted-foreground">This will only take about 2 minutes and includes real examples.</p>
        <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="text-xs font-medium text-primary mb-1">Your Lesson Workflow:</div>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>1️⃣ Choose a topic to teach</li>
            <li>2️⃣ Run a Quickstart Diagnostic</li>
            <li>3️⃣ Create an AI Lesson Plan</li>
            <li>4️⃣ Scan & grade student work</li>
            <li>5️⃣ Push remediation to students</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    target: '[data-tour="nav-classes"]',
    title: '📚 Step 1: Set Up Your Class',
    content: (
      <div className="text-left space-y-2">
        <p><strong>First, create your class and add students.</strong></p>
        <p className="text-sm text-muted-foreground">
          Import via CSV, scan a roster screenshot, or let students self-enroll with a code.
        </p>
        <SampleClassCard />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-questions"]',
    title: '📘 Step 2: Choose Your Topic',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Browse the curriculum and select your lesson topic.</strong></p>
        <p className="text-sm text-muted-foreground">
          Standards-aligned topics organized by subject and unit. Pick one to build your lesson around.
        </p>
        <SampleTopicSelection />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-questions"]',
    title: '🎯 Step 3: Quickstart Diagnostic',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Assess where each student stands before teaching.</strong></p>
        <p className="text-sm text-muted-foreground">
          Generate a multi-level diagnostic that tests prerequisite skills (Levels A-F). Identify who needs scaffolding and who's ready for extension.
        </p>
        <SampleDiagnostic />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="create-lesson"]',
    title: '📊 Step 4: Create Your Lesson Plan',
    content: (
      <div className="text-left space-y-2">
        <p><strong>AI generates a complete lesson with slides!</strong></p>
        <p className="text-sm text-muted-foreground">
          Based on your topic, get a full lesson plan with objectives, slides, speaker notes, and recommended practice worksheets.
        </p>
        <SampleLessonPlan />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-questions"]',
    title: '🔀 Step 5: Differentiated Worksheets',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Generate practice worksheets at multiple levels.</strong></p>
        <p className="text-sm text-muted-foreground">
          Based on diagnostic results, give each student work at their level. Prevent copying with unique forms!
        </p>
        <SampleDifferentiation />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-scan"]',
    title: '📷 Step 6: Scan & Grade Work',
    content: (
      <div className="text-left space-y-2">
        <p><strong>This is where the magic happens!</strong></p>
        <p className="text-sm text-muted-foreground">
          Scan using your scanner → AI reads the QR code → Grades the work → Identifies misconceptions.
        </p>
        <SampleScanResult />
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-reports"]',
    title: '📊 Step 7: Track Progress',
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
    target: '[data-tour="nav-reports"]',
    title: '📲 Step 8: Push Remediation to Students',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Close the loop with personalized practice!</strong></p>
        <p className="text-sm text-muted-foreground">
          Based on grading results, push targeted remediation to the <strong>NYCLogic Scholar</strong> app. Students practice on their own devices.
        </p>
        <SampleSisterAppPush />
        <div className="mt-2 p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded text-xs">
          <strong>The cycle continues:</strong> Diagnostic → Teach → Assess → Remediate → Repeat!
        </div>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: '🎉 You\'re Ready to Start Teaching!',
    content: (
      <div className="text-left space-y-3">
        <p><strong>Your complete workflow:</strong></p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li><strong>Create a class</strong> and add students</li>
          <li><strong>Pick a topic</strong> → Run a diagnostic</li>
          <li><strong>Generate a lesson plan</strong> with AI</li>
          <li><strong>Create worksheets</strong> → Teach → Grade</li>
          <li><strong>Push remediation</strong> for struggling students</li>
        </ol>
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            💡 <strong>Pro tip:</strong> Start with "Worksheets" → pick a topic → "Quickstart Diagnostic" to assess your class today!
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
