import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  X, 
  Users, 
  Camera, 
  FileText, 
  BarChart3, 
  Settings as SettingsIcon,
  BookOpen,
  Lightbulb,
  Zap,
  Shield,
  Play,
  HelpCircle,
  ChevronRight,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tutorials: {
    title: string;
    duration: string;
    path?: string;
  }[];
}

const tutorialCategories: TutorialCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'New here? Start with the basics',
    icon: Sparkles,
    color: 'text-primary',
    tutorials: [
      { title: 'Create your first class', duration: '2 min', path: '/classes/new' },
      { title: 'Add students to class', duration: '3 min', path: '/classes' },
      { title: 'Understanding the dashboard', duration: '2 min', path: '/dashboard' },
    ]
  },
  {
    id: 'classes',
    title: 'Class Management',
    description: 'Organize students and rosters',
    icon: Users,
    color: 'text-blue-500',
    tutorials: [
      { title: 'Import students via CSV', duration: '2 min', path: '/classes' },
      { title: 'Generate student QR codes', duration: '1 min' },
      { title: 'Edit class settings', duration: '1 min' },
    ]
  },
  {
    id: 'worksheets',
    title: 'Worksheets & Assessments',
    description: 'Create and manage assessments',
    icon: FileText,
    color: 'text-green-500',
    tutorials: [
      { title: 'Build a worksheet', duration: '4 min', path: '/questions' },
      { title: 'Create differentiated questions', duration: '3 min' },
      { title: 'Share worksheets with teachers', duration: '2 min' },
    ]
  },
  {
    id: 'scanning',
    title: 'Scanning & Grading',
    description: 'Capture and grade student work',
    icon: Camera,
    color: 'text-orange-500',
    tutorials: [
      { title: 'Scan with camera', duration: '2 min', path: '/scan' },
      { title: 'Use USB scanner', duration: '3 min' },
      { title: 'Batch grade papers', duration: '4 min' },
      { title: 'Review AI suggestions', duration: '2 min' },
    ]
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'Track student progress',
    icon: BarChart3,
    color: 'text-purple-500',
    tutorials: [
      { title: 'View mastery heatmap', duration: '2 min', path: '/reports' },
      { title: 'Track individual progress', duration: '3 min' },
      { title: 'Differentiation grouping', duration: '3 min' },
    ]
  },
  {
    id: 'ai-detection',
    title: 'AI Detection',
    description: 'Maintain academic integrity',
    icon: Shield,
    color: 'text-red-500',
    tutorials: [
      { title: 'Configure detection settings', duration: '2 min', path: '/settings' },
      { title: 'Review flagged work', duration: '3 min' },
      { title: 'Set up parent alerts', duration: '2 min' },
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    description: 'Power user tips and tricks',
    icon: Zap,
    color: 'text-amber-500',
    tutorials: [
      { title: 'Custom grading scales', duration: '3 min' },
      { title: 'Lesson plan generator', duration: '4 min' },
      { title: 'Presentation builder', duration: '5 min', path: '/library' },
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

export function HelpBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TutorialCategory | null>(null);
  const [activeQuickHelp, setActiveQuickHelp] = useState<number | null>(null);

  const handleCategoryClick = (category: TutorialCategory) => {
    setSelectedCategory(category);
  };

  const handleTutorialClick = (path?: string) => {
    if (path) {
      navigate(path);
      setIsOpen(false);
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
              className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] max-h-[600px] md:max-h-[70vh]"
            >
              <Card className="shadow-2xl border-2 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Help Assistant</CardTitle>
                        <p className="text-xs text-primary-foreground/80">How can I help you today?</p>
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
                  <ScrollArea className="h-[450px] md:h-[calc(70vh-140px)]">
                    <div className="p-4 space-y-4">
                      {/* Quick Help Section */}
                      {!selectedCategory && (
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
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              Tutorial Categories
                            </h3>
                            <div className="grid gap-2">
                              {tutorialCategories.map((category) => {
                                const Icon = category.icon;
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
                                      <p className="text-xs text-muted-foreground truncate">{category.description}</p>
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
                      {selectedCategory && (
                        <div className="space-y-4">
                          <button
                            onClick={() => setSelectedCategory(null)}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" />
                            Back to categories
                          </button>
                          
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
                                onClick={() => handleTutorialClick(tutorial.path)}
                                className={cn(
                                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                                  tutorial.path 
                                    ? "bg-secondary/50 hover:bg-secondary cursor-pointer" 
                                    : "bg-secondary/30 cursor-default"
                                )}
                              >
                                <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center">
                                  <Play className="h-3 w-3 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{tutorial.title}</p>
                                  <p className="text-xs text-muted-foreground">{tutorial.duration}</p>
                                </div>
                                {tutorial.path && (
                                  <Badge variant="outline" className="text-xs">
                                    Go
                                  </Badge>
                                )}
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