import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  X, 
  Users, 
  Camera, 
  FileText, 
  BarChart3, 
  BookOpen,
  Zap,
  Shield,
  Play,
  HelpCircle,
  ChevronRight,
  MessageCircle,
  Sparkles,
  Video,
  ArrowLeft,
  ExternalLink,
  ScrollText,
  Copy,
  Check,
  Film
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getVideoScriptById, type VideoScript } from '@/data/tutorialVideoScripts';

interface Tutorial {
  id?: string; // Script ID for matching with video scripts
  title: string;
  duration: string;
  path?: string;
  videoId?: string; // YouTube video ID
  description?: string;
}

interface TutorialCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tutorials: Tutorial[];
}

const tutorialCategories: TutorialCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'New here? Start with the basics',
    icon: Sparkles,
    color: 'text-primary',
    tutorials: [
      { 
        id: 'create-first-class',
        title: 'Create your first class', 
        duration: '2 min', 
        path: '/classes/new',
        videoId: 'dQw4w9WgXcQ', // Placeholder - replace with actual tutorial videos
        description: 'Learn how to set up your first class and configure basic settings.'
      },
      { 
        id: 'add-students',
        title: 'Add students to class', 
        duration: '3 min', 
        path: '/classes',
        videoId: 'dQw4w9WgXcQ',
        description: 'Add students manually or import them from a CSV file.'
      },
      { 
        id: 'understanding-dashboard',
        title: 'Understanding the dashboard', 
        duration: '2 min', 
        path: '/dashboard',
        videoId: 'dQw4w9WgXcQ',
        description: 'Navigate the dashboard and understand key metrics at a glance.'
      },
    ]
  },
  {
    id: 'classes',
    title: 'Class Management',
    description: 'Organize students and rosters',
    icon: Users,
    color: 'text-blue-500',
    tutorials: [
      { 
        id: 'import-csv',
        title: 'Import students via CSV', 
        duration: '2 min', 
        path: '/classes',
        videoId: 'dQw4w9WgXcQ',
        description: 'Bulk import your student roster using a CSV file.'
      },
      { 
        id: 'generate-qr-codes',
        title: 'Generate student QR codes', 
        duration: '1 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Create printable QR codes for each student for easy identification.'
      },
      { 
        id: 'edit-class-settings',
        title: 'Edit class settings', 
        duration: '1 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Modify class name, period, and other settings.'
      },
    ]
  },
  {
    id: 'worksheets',
    title: 'Worksheets & Assessments',
    description: 'Create and manage assessments',
    icon: FileText,
    color: 'text-green-500',
    tutorials: [
      { 
        id: 'build-worksheet',
        title: 'Build a worksheet', 
        duration: '4 min', 
        path: '/questions',
        videoId: 'dQw4w9WgXcQ',
        description: 'Create custom worksheets with questions and rubrics.'
      },
      { 
        id: 'differentiated-questions',
        title: 'Create differentiated questions', 
        duration: '3 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Generate questions at multiple difficulty levels.'
      },
      { 
        id: 'share-worksheets',
        title: 'Share worksheets with teachers', 
        duration: '2 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Share your worksheets with colleagues via link.'
      },
    ]
  },
  {
    id: 'scanning',
    title: 'Scanning & Grading',
    description: 'Capture and grade student work',
    icon: Camera,
    color: 'text-orange-500',
    tutorials: [
      { 
        id: 'scan-with-camera',
        title: 'Scan with camera', 
        duration: '2 min', 
        path: '/scan',
        videoId: 'dQw4w9WgXcQ',
        description: 'Use your device camera to capture student work.'
      },
      { 
        id: 'use-usb-scanner',
        title: 'Use USB scanner', 
        duration: '3 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Connect and use a USB document scanner.'
      },
      { 
        id: 'batch-grade',
        title: 'Batch grade papers', 
        duration: '4 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Grade multiple papers at once for efficiency.'
      },
      { 
        id: 'review-ai-suggestions',
        title: 'Review AI suggestions', 
        duration: '2 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Review and adjust AI-generated scores and feedback.'
      },
    ]
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'Track student progress',
    icon: BarChart3,
    color: 'text-purple-500',
    tutorials: [
      { 
        id: 'mastery-heatmap',
        title: 'View mastery heatmap', 
        duration: '2 min', 
        path: '/reports',
        videoId: 'dQw4w9WgXcQ',
        description: 'Visualize student performance across topics.'
      },
      { 
        id: 'individual-progress',
        title: 'Track individual progress', 
        duration: '3 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Monitor individual student growth over time.'
      },
      { 
        id: 'differentiation-grouping',
        title: 'Differentiation grouping', 
        duration: '3 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Group students by skill level for targeted instruction.'
      },
    ]
  },
  {
    id: 'ai-detection',
    title: 'AI Detection',
    description: 'Maintain academic integrity',
    icon: Shield,
    color: 'text-red-500',
    tutorials: [
      { 
        id: 'configure-detection',
        title: 'Configure detection settings', 
        duration: '2 min', 
        path: '/settings',
        videoId: 'dQw4w9WgXcQ',
        description: 'Set up AI detection thresholds and alerts.'
      },
      { 
        id: 'review-flagged-work',
        title: 'Review flagged work', 
        duration: '3 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Review submissions flagged for potential AI use.'
      },
      { 
        id: 'parent-alerts',
        title: 'Set up parent alerts', 
        duration: '2 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Configure automatic parent notifications.'
      },
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    description: 'Power user tips and tricks',
    icon: Zap,
    color: 'text-amber-500',
    tutorials: [
      { 
        id: 'custom-grading-scales',
        title: 'Custom grading scales', 
        duration: '3 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Create custom grading scales and curves.'
      },
      { 
        id: 'lesson-plan-generator',
        title: 'Lesson plan generator', 
        duration: '4 min',
        videoId: 'dQw4w9WgXcQ',
        description: 'Generate AI-powered lesson plans from topics.'
      },
      { 
        id: 'presentation-builder',
        title: 'Presentation builder', 
        duration: '5 min', 
        path: '/library',
        videoId: 'dQw4w9WgXcQ',
        description: 'Create interactive presentations for your lessons.'
      },
    ]
  },
];

const quickHelp = [
  {
    question: "I'm new, where do I start?",
    answer: "Start by creating a class and adding your students. Then create or import questions for assessments.",
    category: 'getting-started'
  },
  {
    question: "How do I scan student work?",
    answer: "Go to the Scan page, select your class and question, then use your camera or upload images. The AI will grade automatically!",
    category: 'scanning'
  },
  {
    question: "How do I see student progress?",
    answer: "Check the Reports page for mastery heatmaps, progress tracking, and differentiation grouping.",
    category: 'reports'
  },
  {
    question: "What does the AI grading do?",
    answer: "AI analyzes student handwriting, compares it to your rubric, and suggests scores. You can always review and adjust.",
    category: 'scanning'
  },
];

interface VideoPlayerProps {
  videoId: string;
  title: string;
}

function VideoPlayer({ videoId, title }: VideoPlayerProps) {
  return (
    <div className="rounded-lg overflow-hidden bg-black">
      <AspectRatio ratio={16 / 9}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </AspectRatio>
    </div>
  );
}

export function HelpBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TutorialCategory | null>(null);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [activeQuickHelp, setActiveQuickHelp] = useState<number | null>(null);

  const handleCategoryClick = (category: TutorialCategory) => {
    setSelectedCategory(category);
    setSelectedTutorial(null);
  };

  const handleTutorialClick = (tutorial: Tutorial) => {
    if (tutorial.videoId) {
      setSelectedTutorial(tutorial);
    } else if (tutorial.path) {
      navigate(tutorial.path);
      setIsOpen(false);
    }
  };

  const handleGoToPage = (path?: string) => {
    if (path) {
      navigate(path);
      setIsOpen(false);
    }
  };

  const handleBack = () => {
    if (selectedTutorial) {
      setSelectedTutorial(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  };

  const handleGoToHelp = () => {
    navigate('/help');
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 group"
            >
              <Bot className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </Button>
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] max-h-[650px] md:max-h-[75vh]"
            >
              <Card className="shadow-2xl border-2 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(selectedCategory || selectedTutorial) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleBack}
                          className="text-primary-foreground hover:bg-white/20 h-8 w-8"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                        {selectedTutorial ? <Video className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {selectedTutorial ? 'Video Tutorial' : 'Help Assistant'}
                        </CardTitle>
                        <p className="text-xs text-primary-foreground/80">
                          {selectedTutorial 
                            ? selectedTutorial.title 
                            : 'How can I help you today?'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="text-primary-foreground hover:bg-white/20"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px] md:h-[calc(75vh-140px)]">
                    <div className="p-4 space-y-4">
                      {/* Video Player View */}
                      {selectedTutorial && selectedTutorial.videoId && (() => {
                        const script = selectedTutorial.id ? getVideoScriptById(selectedTutorial.id) : undefined;
                        return (
                          <div className="space-y-4">
                            <Tabs defaultValue="video" className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="video" className="gap-1.5">
                                  <Play className="h-3.5 w-3.5" />
                                  Video
                                </TabsTrigger>
                                <TabsTrigger value="script" className="gap-1.5">
                                  <ScrollText className="h-3.5 w-3.5" />
                                  Script
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="video" className="mt-3">
                                <VideoPlayer 
                                  videoId={selectedTutorial.videoId} 
                                  title={selectedTutorial.title} 
                                />
                              </TabsContent>
                              <TabsContent value="script" className="mt-3">
                                {script ? (
                                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline" className="gap-1">
                                        <Film className="h-3 w-3" />
                                        AI Video Script
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">{script.duration}</span>
                                    </div>
                                    <div className="space-y-2">
                                      <h4 className="text-xs font-medium text-muted-foreground uppercase">Narration</h4>
                                      <p className="text-sm leading-relaxed">{script.narration}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <h4 className="text-xs font-medium text-muted-foreground uppercase">Visual Cues</h4>
                                      <ul className="text-xs space-y-1">
                                        {script.visualCues.map((cue, idx) => (
                                          <li key={idx} className="flex items-start gap-2">
                                            <span className="text-primary font-medium">{idx + 1}.</span>
                                            <span className="text-muted-foreground">{cue}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div className="pt-2 border-t">
                                      <p className="text-xs"><span className="font-medium">CTA:</span> {script.callToAction}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 text-center text-muted-foreground text-sm">
                                    No script available for this tutorial.
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                            
                            <div className="space-y-2">
                              <h3 className="font-medium">{selectedTutorial.title}</h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="gap-1">
                                  <Play className="h-3 w-3" />
                                  {selectedTutorial.duration}
                                </Badge>
                              </div>
                              {selectedTutorial.description && (
                                <p className="text-sm text-muted-foreground">
                                  {selectedTutorial.description}
                                </p>
                              )}
                            </div>

                            {selectedTutorial.path && (
                              <Button 
                                onClick={() => handleGoToPage(selectedTutorial.path)}
                                className="w-full gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Go to {selectedTutorial.title.split(' ')[0]}
                              </Button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Quick Help Section */}
                      {!selectedCategory && !selectedTutorial && (
                        <>
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              Quick Questions
                            </h3>
                            <div className="space-y-2">
                              {quickHelp.map((item, index) => (
                                <button
                                  key={index}
                                  onClick={() => setActiveQuickHelp(activeQuickHelp === index ? null : index)}
                                  className={cn(
                                    "w-full text-left p-3 rounded-lg border transition-all",
                                    activeQuickHelp === index 
                                      ? "bg-primary/5 border-primary/30" 
                                      : "bg-secondary/50 border-transparent hover:bg-secondary"
                                  )}
                                >
                                  <p className="text-sm font-medium">{item.question}</p>
                                  <AnimatePresence>
                                    {activeQuickHelp === index && (
                                      <motion.p
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="text-xs text-muted-foreground mt-2"
                                      >
                                        {item.answer}
                                      </motion.p>
                                    )}
                                  </AnimatePresence>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                              <Video className="h-4 w-4 text-muted-foreground" />
                              Video Tutorials
                            </h3>
                            <div className="grid gap-2">
                              {tutorialCategories.map((category) => {
                                const Icon = category.icon;
                                const videoCount = category.tutorials.filter(t => t.videoId).length;
                                return (
                                  <button
                                    key={category.id}
                                    onClick={() => handleCategoryClick(category)}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left group"
                                  >
                                    <div className={cn("h-8 w-8 rounded-full bg-background flex items-center justify-center", category.color)}>
                                      <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{category.title}</p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {videoCount} video{videoCount !== 1 ? 's' : ''} • {category.description}
                                      </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Category Detail View */}
                      {selectedCategory && !selectedTutorial && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-full bg-secondary flex items-center justify-center", selectedCategory.color)}>
                              <selectedCategory.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium">{selectedCategory.title}</h3>
                              <p className="text-xs text-muted-foreground">{selectedCategory.description}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {selectedCategory.tutorials.map((tutorial, index) => (
                              <button
                                key={index}
                                onClick={() => handleTutorialClick(tutorial)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left group"
                              >
                                <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center relative overflow-hidden">
                                  {tutorial.videoId ? (
                                    <>
                                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                                      <Play className="h-4 w-4 text-primary relative z-10" />
                                    </>
                                  ) : (
                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{tutorial.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">{tutorial.duration}</span>
                                    {tutorial.videoId && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                        <Video className="h-2.5 w-2.5 mr-0.5" />
                                        Video
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  {/* Footer */}
                  <div className="border-t p-3 bg-muted/30">
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={handleGoToHelp}
                    >
                      <HelpCircle className="h-4 w-4" />
                      Full Help Center
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}