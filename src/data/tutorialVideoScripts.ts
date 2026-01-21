// Video Scripts for AI Video Generation (Sora, Runway, etc.)
// Maximum duration: 20 seconds per video
// Format: Narration text with visual cues in brackets

export interface VideoScript {
  id: string;
  title: string;
  duration: string;
  narration: string;
  visualCues: string[];
  callToAction: string;
}

export const tutorialVideoScripts: Record<string, VideoScript[]> = {
  'getting-started': [
    {
      id: 'create-first-class',
      title: 'Create your first class',
      duration: '20 sec',
      narration: `Welcome to NYCLogic AI! Creating your first class takes just seconds. Click "Classes" in the menu, then "New Class." Enter your class name and period, then hit create. Your class is ready! Now you can add students and start scanning work.`,
      visualCues: [
        'Open with app dashboard view',
        'Cursor clicks Classes in navigation',
        'New Class button highlight with glow effect',
        'Form appears - type "Algebra 1 - Period 3"',
        'Create button click with success animation',
        'Class card appears with confetti burst'
      ],
      callToAction: 'Try it now - create your first class!'
    },
    {
      id: 'add-students',
      title: 'Add students to class',
      duration: '20 sec',
      narration: `Adding students is easy! Open your class and click "Add Students." Type each name manually, or save time by uploading a CSV file. Just drag and drop your roster file, and all students appear instantly. Each student gets a unique QR code for scanning.`,
      visualCues: [
        'Class detail page opens',
        'Add Students button glows',
        'Two options appear: Manual and CSV',
        'CSV file dragged and dropped',
        'Loading bar fills quickly',
        'Student list populates with QR badges'
      ],
      callToAction: 'Upload your roster now!'
    },
    {
      id: 'understanding-dashboard',
      title: 'Understanding the dashboard',
      duration: '20 sec',
      narration: `Your dashboard shows everything at a glance. See how many students need help, track recent scan activity, and view class performance trends. Click any widget to dive deeper. The color coding shows green for mastery, yellow for developing, and red for struggling.`,
      visualCues: [
        'Dashboard with animated widgets',
        'Students needing help widget pulses',
        'Performance chart with rising trend line',
        'Color legend appears briefly',
        'Mouse hovers over widgets showing tooltips',
        'Quick action buttons highlight'
      ],
      callToAction: 'Explore your dashboard now!'
    }
  ],

  'classes': [
    {
      id: 'import-csv',
      title: 'Import students via CSV',
      duration: '20 sec',
      narration: `Import your entire roster in seconds! Click "Add Students," then "Upload CSV." Your file needs first name and last name columns. Drag your file here, preview the data, and confirm. Done! All students are now in your class with QR codes ready to print.`,
      visualCues: [
        'Add Students modal opens',
        'CSV upload tab selected',
        'File drag animation',
        'Preview table with student names',
        'Confirm button with checkmark',
        'Success message with student count'
      ],
      callToAction: 'Import your class roster today!'
    },
    {
      id: 'generate-qr-codes',
      title: 'Generate student QR codes',
      duration: '20 sec',
      narration: `QR codes make scanning faster! In your class, click "Print QR Codes." Choose your layout - labels, cards, or a full poster. Each code contains the student's name. Print them out, and students place them on their work for instant identification.`,
      visualCues: [
        'Class page with Print QR button',
        'Layout options appear as cards',
        'Preview of QR code sheet',
        'Printer icon animation',
        'Student placing QR sticker on paper',
        'Camera recognizing QR code'
      ],
      callToAction: 'Print QR codes for faster scanning!'
    },
    {
      id: 'edit-class-settings',
      title: 'Edit class settings',
      duration: '20 sec',
      narration: `Need to update your class? Click the settings gear on any class card. Change the class name, period, or school year. You can also archive old classes to keep things organized. Changes save automatically - no extra clicks needed!`,
      visualCues: [
        'Class card with gear icon highlight',
        'Settings panel slides in',
        'Text field being edited',
        'Toggle switches for options',
        'Auto-save indicator appears',
        'Updated class card shown'
      ],
      callToAction: 'Customize your class settings!'
    }
  ],

  'worksheets': [
    {
      id: 'build-worksheet',
      title: 'Build a worksheet',
      duration: '20 sec',
      narration: `Create custom worksheets in minutes! Go to Questions, browse topics by standard, and click to add them to your worksheet. Set the number of questions and difficulty. Hit Compile, and AI generates fresh problems. Preview before printing!`,
      visualCues: [
        'Questions page with topic browser',
        'Topics being clicked and added',
        'Worksheet builder panel fills',
        'Difficulty toggles being adjusted',
        'Compile button with sparkle effect',
        'Preview showing generated questions'
      ],
      callToAction: 'Build your first worksheet now!'
    },
    {
      id: 'differentiated-questions',
      title: 'Create differentiated questions',
      duration: '20 sec',
      narration: `Meet every student where they are! The differentiated worksheet generator creates multiple versions. Choose your topic, then select difficulty levels from A to F. Each level adjusts complexity automatically. Print different versions for different groups.`,
      visualCues: [
        'Differentiated generator opens',
        'Topic selected from dropdown',
        'Level buttons A through F',
        'Preview showing easier vs harder versions',
        'Multiple worksheets stacking',
        'Group labels appearing'
      ],
      callToAction: 'Create personalized worksheets!'
    },
    {
      id: 'share-worksheets',
      title: 'Share worksheets with teachers',
      duration: '20 sec',
      narration: `Share your best worksheets with colleagues! Open any saved worksheet and click the share button. Toggle sharing on to generate a link. Copy it and send to any teacher. They can use your worksheet instantly - no account needed to view!`,
      visualCues: [
        'Saved worksheets library',
        'Share button highlighted',
        'Toggle switch animation',
        'Link generated with copy icon',
        'Link being pasted in email',
        'Another teacher viewing worksheet'
      ],
      callToAction: 'Share with your team today!'
    }
  ],

  'scanning': [
    {
      id: 'scan-with-camera',
      title: 'Scan with camera',
      duration: '20 sec',
      narration: `Scan student work instantly! Go to Scan, select your class and assignment. Point your camera at the student's paper. The AI reads the QR code, identifies the student, and analyzes their work. Review the suggested score and save!`,
      visualCues: [
        'Scan page with class selector',
        'Camera view activating',
        'Paper with QR code in frame',
        'Student name appearing',
        'AI analysis animation',
        'Score suggestion with approval button'
      ],
      callToAction: 'Start scanning now!'
    },
    {
      id: 'use-usb-scanner',
      title: 'Use USB scanner',
      duration: '20 sec',
      narration: `Got a document scanner? Connect it via USB and click Scanner Import. Select your scanner from the list. Place papers in the feeder and scan. Papers process automatically - student names are detected, and AI grades each one. Fast bulk grading!`,
      visualCues: [
        'Scanner Import button',
        'Device selection dropdown',
        'Papers feeding through scanner animation',
        'Multiple scans appearing in queue',
        'Batch processing indicator',
        'Completed results grid'
      ],
      callToAction: 'Connect your scanner!'
    },
    {
      id: 'batch-grade',
      title: 'Batch grade papers',
      duration: '20 sec',
      narration: `Grade a whole stack at once! Upload multiple images or use your scanner. All papers enter the batch queue. Click "Grade All" and watch AI analyze each one. Review any flagged items, then save everything with one click.`,
      visualCues: [
        'Multiple images being uploaded',
        'Batch queue filling up',
        'Grade All button with loading animation',
        'Progress bar moving through papers',
        'Some items highlighted for review',
        'Save All success animation'
      ],
      callToAction: 'Try batch grading today!'
    },
    {
      id: 'review-ai-suggestions',
      title: 'Review AI suggestions',
      duration: '20 sec',
      narration: `AI does the heavy lifting, you make the final call! Each scan shows the AI's suggested score with reasoning. Agree? Click approve. Disagree? Adjust the score - your feedback helps AI learn your preferences. You're always in control.`,
      visualCues: [
        'Graded paper with AI analysis',
        'Score breakdown panel',
        'Approve button highlighted',
        'Override slider being adjusted',
        'Learning indicator showing adaptation',
        'Confirmation checkmark'
      ],
      callToAction: 'Review and teach your AI!'
    }
  ],

  'reports': [
    {
      id: 'mastery-heatmap',
      title: 'View mastery heatmap',
      duration: '20 sec',
      narration: `See your whole class at a glance! The mastery heatmap shows every student and topic. Green means mastered, yellow is developing, red needs help. Click any cell to see that student's history on that topic. Spot patterns instantly!`,
      visualCues: [
        'Reports page opening',
        'Heatmap grid animating in',
        'Color legend appearing',
        'Mouse hovering over cells',
        'Cell click revealing detail panel',
        'Pattern highlight circling a column'
      ],
      callToAction: 'Check your class heatmap!'
    },
    {
      id: 'individual-progress',
      title: 'Track individual progress',
      duration: '20 sec',
      narration: `Dive deep into any student's journey! Click a student name to see their progress tracker. View grade trends over time, topic strengths and weaknesses, and recent activity. Use this data for parent conferences or intervention planning.`,
      visualCues: [
        'Student name being clicked',
        'Profile page opening',
        'Line chart showing improvement',
        'Strengths and weaknesses bars',
        'Activity timeline scrolling',
        'Print report button'
      ],
      callToAction: 'Explore student progress!'
    },
    {
      id: 'differentiation-grouping',
      title: 'Differentiation grouping',
      duration: '20 sec',
      narration: `Group students by skill level automatically! The differentiation report analyzes performance and creates suggested groups. See who needs remediation, who's ready for enrichment. Export groups to create targeted worksheets for each level.`,
      visualCues: [
        'Differentiation report loading',
        'Students sorting into groups',
        'Three tiers visualized',
        'Group labels appearing',
        'Export button highlighted',
        'Worksheet being generated for a group'
      ],
      callToAction: 'Create learning groups!'
    }
  ],

  'ai-detection': [
    {
      id: 'configure-detection',
      title: 'Configure detection settings',
      duration: '20 sec',
      narration: `Keep assessments honest with AI detection! Go to Settings, then AI Detection. Set your sensitivity threshold - higher catches more but may flag honest work. Enable auto-alerts for immediate notifications. Customize what triggers a flag.`,
      visualCues: [
        'Settings page navigation',
        'AI Detection section',
        'Sensitivity slider being adjusted',
        'Toggle switches for options',
        'Threshold explanation tooltip',
        'Save confirmation'
      ],
      callToAction: 'Set up AI detection now!'
    },
    {
      id: 'review-flagged-work',
      title: 'Review flagged work',
      duration: '20 sec',
      narration: `When AI flags suspicious work, you decide what happens. Open the flagged submission to see why it was flagged. Compare against the student's usual handwriting. Mark it as confirmed, false positive, or needs discussion. All decisions are logged.`,
      visualCues: [
        'Flagged work notification',
        'Side-by-side comparison view',
        'AI reasoning explanation',
        'Handwriting samples compared',
        'Decision buttons appearing',
        'Audit log entry created'
      ],
      callToAction: 'Review flagged submissions!'
    },
    {
      id: 'parent-alerts',
      title: 'Set up parent alerts',
      duration: '20 sec',
      narration: `Keep parents informed automatically! Enable parent alerts in settings. When work is flagged, parents receive an email with details. Customize the message template. Parents can acknowledge receipt, creating a communication record.`,
      visualCues: [
        'Settings parent alert toggle',
        'Email template preview',
        'Sample notification email',
        'Parent acknowledgment received',
        'Communication log entry',
        'Success checkmark'
      ],
      callToAction: 'Enable parent notifications!'
    }
  ],

  'advanced': [
    {
      id: 'custom-grading-scales',
      title: 'Custom grading scales',
      duration: '20 sec',
      narration: `Your grading, your rules! Go to Settings and find Grading Scale. Create custom scales with your own letter grades and percentages. Set a grade floor so struggling students stay motivated. Apply curves when needed. Save and all future grades use your scale.`,
      visualCues: [
        'Settings grading section',
        'Custom scale being created',
        'Percentage inputs being edited',
        'Grade floor slider',
        'Curve adjustment option',
        'Save and apply animation'
      ],
      callToAction: 'Customize your grading!'
    },
    {
      id: 'lesson-plan-generator',
      title: 'Lesson plan generator',
      duration: '20 sec',
      narration: `AI-powered lesson planning! Select your topic and class duration. AI generates a complete lesson plan with objectives, activities, and assessments. Link to recommended worksheets automatically. Edit any section, then save to your library.`,
      visualCues: [
        'Lesson Plan generator opening',
        'Topic and duration selected',
        'AI generating animation',
        'Lesson plan appearing section by section',
        'Worksheet links highlighted',
        'Save to library button'
      ],
      callToAction: 'Generate a lesson plan!'
    },
    {
      id: 'presentation-builder',
      title: 'Presentation builder',
      duration: '20 sec',
      narration: `Create engaging presentations! Open the Library and start a new presentation. Choose a topic and AI generates slides with visuals. Customize colors, add your own images, reorder slides. Export to PowerPoint or present directly from the app!`,
      visualCues: [
        'Library with presentation tab',
        'New presentation dialog',
        'Slides generating with animations',
        'Theme customization panel',
        'Drag and drop reordering',
        'Export options appearing'
      ],
      callToAction: 'Build your presentation!'
    }
  ]
};

// Helper to get all scripts flat
export function getAllVideoScripts(): VideoScript[] {
  return Object.values(tutorialVideoScripts).flat();
}

// Helper to get script by ID
export function getVideoScriptById(id: string): VideoScript | undefined {
  return getAllVideoScripts().find(script => script.id === id);
}

// Helper to get scripts for a category
export function getVideoScriptsForCategory(categoryId: string): VideoScript[] {
  return tutorialVideoScripts[categoryId] || [];
}
