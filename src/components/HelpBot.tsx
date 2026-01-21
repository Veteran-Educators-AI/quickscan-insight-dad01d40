import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  X, 
  Users, 
  Camera, 
  FileText, 
  BarChart3, 
  Zap,
  Shield,
  HelpCircle,
  ChevronRight,
  MessageCircle,
  Sparkles,
  ArrowLeft,
  Send,
  Loader2,
  BookOpen,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerOnboardingTour } from '@/hooks/useOnboardingTour';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TutorialCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const tutorialCategories: TutorialCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Create classes, add students, navigate dashboard',
    icon: Sparkles,
    color: 'text-primary',
  },
  {
    id: 'classes',
    title: 'Class Management',
    description: 'Import CSV, generate QR codes, edit settings',
    icon: Users,
    color: 'text-blue-500',
  },
  {
    id: 'worksheets',
    title: 'Worksheets & Assessments',
    description: 'Build worksheets, differentiated questions',
    icon: FileText,
    color: 'text-green-500',
  },
  {
    id: 'scanning',
    title: 'Scanning & Grading',
    description: 'Scan work, batch grade, review AI suggestions',
    icon: Camera,
    color: 'text-orange-500',
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'Mastery heatmaps, progress tracking',
    icon: BarChart3,
    color: 'text-purple-500',
  },
  {
    id: 'ai-detection',
    title: 'AI Detection',
    description: 'Configure detection, review flagged work',
    icon: Shield,
    color: 'text-red-500',
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    description: 'Custom grading, lesson plans, presentations',
    icon: Zap,
    color: 'text-amber-500',
  },
];

// Knowledge base for the AI assistant
const knowledgeBase = `
NYCLogic AI is an AI-powered grading and assessment platform for teachers. Here's how the software works:

## Getting Started
1. **Create a Class**: Go to Classes page → Click "New Class" → Enter class name and period → Add students manually or import via CSV
2. **Add Students**: In your class, click "Add Student" or use "Import CSV" for bulk upload. Each student gets a unique QR code for identification.
3. **Dashboard**: Shows overview of classes, recent scans, student performance metrics, and quick actions.

## Classes & Students
- **Class Management**: Create multiple classes, each with its own roster and settings
- **Student QR Codes**: Print QR codes for each student - they attach these to their work for automatic identification
- **CSV Import**: Upload a CSV file with columns: First Name, Last Name, Student ID (optional), Email (optional)
- **Class Periods**: Organize by period (e.g., "Period 1", "Period 2")

## Worksheets & Assessments
- **Create Worksheets**: Select topics from the NY curriculum, choose difficulty level, generate AI-powered questions
- **Differentiated Worksheets**: Generate multiple versions (Form A, B, C, etc.) with different questions covering same concepts - prevents copying
- **Diagnostic Forms**: Create up to 10 unique forms (A-J) for diagnostic assessments
- **Print Worksheets**: Each worksheet includes student QR code space and question areas
- **Share Worksheets**: Share with other teachers via link

## Scanning & Grading
- **Scan Student Work**: Use your phone/tablet camera or document scanner to capture student work
- **QR Code Detection**: The AI automatically reads the student's QR code to identify them
- **AI Grading**: The AI analyzes handwritten work, compares to rubric, and suggests scores
- **Misconception Detection**: AI identifies common errors and misconceptions
- **Teacher Review**: You can always adjust AI-suggested scores before saving
- **Batch Grading**: Grade multiple papers at once for efficiency

## Reports & Analytics
- **Mastery Heatmap**: Visual grid showing student performance across topics (green = mastered, red = needs work)
- **Student Progress**: Track individual student growth over time
- **Differentiation Grouping**: Automatically group students by skill level for targeted instruction
- **Regents Score Prediction**: Predict likely Regents exam scores based on performance
- **Class Overview**: See averages, trends, and identify struggling students

## AI Detection
- **Configure Detection**: Set sensitivity threshold for flagging potentially AI-generated work
- **Review Flagged Work**: Examine submissions flagged for potential AI use
- **Parent Notifications**: Automatically notify parents when AI use is detected
- **Handwriting Analysis**: Compare handwriting samples to detect inconsistencies

## Lesson Plans & Presentations
- **AI Lesson Plans**: Generate complete lesson plans aligned to NY standards
- **Presentation Builder**: Create interactive presentations with speaker notes
- **PowerPoint Export**: Export presentations to PowerPoint format

## Settings & Configuration
- **Grading Scales**: Customize grading scales and grade floors
- **Notifications**: Configure email and push notifications
- **Integration**: Connect with Google Classroom, sync grades
- **API Keys**: Manage API access for integrations

## Tips
- Print QR codes on adhesive labels for students to stick on their work
- Use batch scanning for faster grading
- Review the mastery heatmap weekly to identify topics needing reteaching
- Create differentiated worksheets to prevent copying during assessments
`;

const suggestedQuestions = [
  "How do I create my first class?",
  "How does AI grading work?",
  "What are differentiated worksheets?",
  "How do I scan student work?",
  "How do I track student progress?",
];

export function HelpBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartTour = () => {
    setIsOpen(false);
    triggerOnboardingTour();
  };

  const handleCategoryClick = (category: TutorialCategory) => {
    // Start the onboarding tour when clicking any category
    setIsOpen(false);
    triggerOnboardingTour();
  };

  const handleSendMessage = async (question?: string) => {
    const messageText = question || inputValue.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowCategories(false);

    try {
      // Use AI to answer the question based on knowledge base
      const { data, error } = await supabase.functions.invoke('answer-help-question', {
        body: { 
          question: messageText,
          knowledgeBase: knowledgeBase,
          conversationHistory: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        }
      });

      let responseText: string;
      
      if (error || !data?.answer) {
        // Fallback to simple pattern matching if edge function fails
        responseText = generateFallbackResponse(messageText);
      } else {
        responseText = data.answer;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      // Fallback response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateFallbackResponse(messageText),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (question: string): string => {
    const q = question.toLowerCase();
    
    if (q.includes('class') && (q.includes('create') || q.includes('new') || q.includes('first'))) {
      return "To create your first class:\n\n1. Go to **Classes** from the navigation\n2. Click **\"New Class\"**\n3. Enter your class name (e.g., \"Period 1 Geometry\")\n4. Add the class period\n5. Click **Create**\n\nThen add students manually or import via CSV. Would you like me to start the interactive tour to show you?";
    }
    
    if (q.includes('scan') || q.includes('grade') && q.includes('work')) {
      return "To scan and grade student work:\n\n1. Go to **Scan** from the navigation\n2. Select the class and worksheet\n3. Use your camera to capture the student's paper\n4. The AI automatically reads the QR code and grades the work\n5. Review and adjust scores if needed\n6. Save the results\n\nTip: For faster grading, use batch mode to grade multiple papers at once!";
    }
    
    if (q.includes('worksheet') && (q.includes('create') || q.includes('build'))) {
      return "To create a worksheet:\n\n1. Go to **Assessment** from the navigation\n2. Click **\"Build Worksheet\"**\n3. Select topics from the NY curriculum\n4. Choose difficulty level\n5. The AI generates questions for you\n6. Review and edit as needed\n7. Print with student QR code spaces\n\nYou can also create differentiated versions to prevent copying!";
    }
    
    if (q.includes('differentiat') || q.includes('form') && (q.includes('a') || q.includes('b'))) {
      return "**Differentiated Worksheets** prevent copying by giving different students different versions:\n\n1. When building a worksheet, select **\"Generate Differentiated Worksheets\"**\n2. Choose how many forms (2-10, labeled A-J)\n3. Each form has unique questions covering the same concepts\n4. Assign forms to students sitting near each other\n5. Everyone gets assessed fairly without copying!\n\nGreat for diagnostic assessments.";
    }
    
    if (q.includes('progress') || q.includes('track') || q.includes('report')) {
      return "To track student progress:\n\n1. Go to **Reports** from the navigation\n2. View the **Mastery Heatmap** - green means mastered, red needs work\n3. Click on any student for detailed progress\n4. Use **Differentiation Grouping** to group students by skill level\n5. Check **Regents Score Prediction** for exam readiness\n\nTip: Review the heatmap weekly to identify topics needing reteaching!";
    }
    
    if (q.includes('ai') && (q.includes('detect') || q.includes('cheat'))) {
      return "**AI Detection** helps maintain academic integrity:\n\n1. Go to **Settings** → **AI Detection**\n2. Enable AI detection and set sensitivity threshold\n3. When grading, the system flags potentially AI-generated work\n4. Review flagged submissions manually\n5. Optionally enable parent notifications\n\nThe system also compares handwriting samples to detect inconsistencies.";
    }
    
    if (q.includes('qr') || q.includes('code')) {
      return "**Student QR Codes** enable automatic identification:\n\n1. Go to your class page\n2. Click **\"Print QR Codes\"**\n3. Print on adhesive labels or regular paper\n4. Students attach their QR code to their work\n5. When scanning, the AI reads the code automatically\n\nTip: Print on adhesive labels so students can stick them on worksheets!";
    }
    
    if (q.includes('tour') || q.includes('tutorial') || q.includes('guide')) {
      return "I can start an interactive tour that walks you through all the features with examples! The tour covers:\n\n• Creating classes and adding students\n• Building worksheets\n• Scanning and grading\n• Viewing reports\n• And more!\n\nWould you like me to start the tour now? Just click **\"Take the Tour\"** below!";
    }
    
    // Default response
    return "I can help you with:\n\n• **Creating classes** and adding students\n• **Building worksheets** with AI-generated questions\n• **Scanning and grading** student work\n• **Viewing reports** and tracking progress\n• **AI detection** for academic integrity\n• **Lesson plans** and presentations\n\nWhat would you like to know more about? Or click **\"Take the Tour\"** for an interactive walkthrough!";
  };

  const handleBack = () => {
    setShowCategories(true);
    setMessages([]);
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
                      {!showCategories && (
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
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Help Assistant</CardTitle>
                        <p className="text-xs text-primary-foreground/80">
                          Ask me anything about the app
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
                  <ScrollArea className="h-[400px] md:h-[calc(75vh-200px)]">
                    <div ref={scrollRef} className="p-4 space-y-4">
                      {/* Main View with Categories */}
                      {showCategories && messages.length === 0 && (
                        <>
                          {/* Take the Tour Button */}
                          <Button
                            onClick={handleStartTour}
                            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80"
                            size="lg"
                          >
                            <Play className="h-4 w-4" />
                            Take the Interactive Tour
                          </Button>

                          {/* Quick Questions */}
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              Common Questions
                            </h3>
                            <div className="space-y-1.5">
                              {suggestedQuestions.map((question, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSendMessage(question)}
                                  className="w-full text-left px-3 py-2 text-sm rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                                >
                                  {question}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              Browse by Topic
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
                                      <p className="text-xs text-muted-foreground truncate">
                                        {category.description}
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

                      {/* Chat Messages */}
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary'
                            )}
                          >
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          </div>
                        </div>
                      ))}

                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-secondary rounded-lg px-3 py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      )}

                      {/* Tour Button after conversation */}
                      {messages.length > 0 && !isLoading && (
                        <Button
                          onClick={handleStartTour}
                          variant="outline"
                          className="w-full gap-2"
                          size="sm"
                        >
                          <Play className="h-4 w-4" />
                          Take the Tour
                        </Button>
                      )}
                    </div>
                  </ScrollArea>
                  
                  {/* Input Area */}
                  <div className="border-t p-3 space-y-2">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask a question..."
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                    <Button 
                      variant="ghost" 
                      className="w-full gap-2 text-xs h-8"
                      onClick={handleGoToHelp}
                    >
                      <HelpCircle className="h-3 w-3" />
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
