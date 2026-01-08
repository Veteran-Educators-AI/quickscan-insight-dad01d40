import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

const tourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: '👋 Welcome to The Scan Genius!',
    content: (
      <div className="text-left space-y-2">
        <p>Let's take a quick tour to help you get started with grading student work efficiently.</p>
        <p className="text-sm text-muted-foreground">This will only take about a minute.</p>
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
          Example: Add "Period 1 Geometry" with 25 students. You can import students via CSV or add them manually.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-questions"]',
    title: '📝 Assessment',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Build questions and create worksheets.</strong></p>
        <p className="text-sm text-muted-foreground">
          Example: Add a JMAP question about triangle congruence, set up the rubric, and generate a printable worksheet with QR codes for each student.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-scan"]',
    title: '📷 Scan Student Work',
    content: (
      <div className="text-left space-y-2">
        <p><strong>This is where the magic happens!</strong></p>
        <p className="text-sm text-muted-foreground">
          Example: Snap a photo of student work → AI reads the QR code → instantly grades the work and identifies misconceptions.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-reports"]',
    title: '📊 Reports & Analytics',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Track student progress and identify patterns.</strong></p>
        <p className="text-sm text-muted-foreground">
          Example: See a mastery heatmap showing which topics need reteaching, or group students by skill level for differentiated instruction.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-settings"]',
    title: '⚙️ Settings',
    content: (
      <div className="text-left space-y-2">
        <p><strong>Configure AI detection and notifications.</strong></p>
        <p className="text-sm text-muted-foreground">
          Example: Set AI detection threshold to flag potentially AI-generated work, and enable parent notifications.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: '🎉 You\'re All Set!',
    content: (
      <div className="text-left space-y-3">
        <p><strong>Recommended first steps:</strong></p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Create your first class and add students</li>
          <li>Add a question with a rubric</li>
          <li>Print a worksheet with QR codes</li>
          <li>Scan student work to see instant results</li>
        </ol>
        <p className="text-sm text-muted-foreground mt-2">
          You can restart this tour anytime from Settings.
        </p>
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
