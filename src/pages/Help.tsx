import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { 
  Search, 
  BookOpen, 
  Video, 
  HelpCircle, 
  Users, 
  Camera, 
  FileText, 
  BarChart3, 
  Settings,
  Play,
  Clock,
  ExternalLink,
  Lightbulb,
  Zap,
  Shield,
  MessageSquare,
  Send,
  Loader2
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

interface VideoTutorial {
  title: string;
  description: string;
  duration: string;
  category: string;
  thumbnail: string;
  url: string;
}

interface DocArticle {
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  keywords: string[];
  content: string;
}

const faqItems: FAQItem[] = [
  {
    question: "How do I create my first class?",
    answer: "Navigate to Classes from the main menu, then click 'Create Class'. Enter your class name, period, and school year. You can then add students manually or import them via CSV file.",
    category: "Getting Started",
    keywords: ["class", "create", "new", "start", "begin"]
  },
  {
    question: "How do I import students from a CSV file?",
    answer: "Go to your class detail page and click 'Import CSV'. Your CSV should have columns for first_name, last_name, and optionally email and student_id. Download the template for the correct format.",
    category: "Classes",
    keywords: ["csv", "import", "students", "upload", "roster"]
  },
  {
    question: "How do QR codes work for student identification?",
    answer: "When you print worksheets, each student gets a unique QR code on their paper. When scanning, the app reads this QR code to automatically identify the student and link their work to their profile.",
    category: "Scanning",
    keywords: ["qr", "code", "scan", "identify", "student"]
  },
  {
    question: "What image formats are supported for scanning?",
    answer: "The scanner supports JPEG, PNG, and most common image formats. For best results, ensure good lighting and capture the entire worksheet in frame. You can also upload images directly.",
    category: "Scanning",
    keywords: ["image", "format", "photo", "upload", "jpeg", "png"]
  },
  {
    question: "How does AI grading work?",
    answer: "After scanning student work, our AI analyzes the handwritten responses against the rubric you've defined. It identifies correct steps, common misconceptions, and provides a suggested score that you can review and adjust.",
    category: "Grading",
    keywords: ["ai", "grading", "score", "automatic", "rubric"]
  },
  {
    question: "Can I override AI-suggested scores?",
    answer: "Yes! AI scores are suggestions. You can always adjust scores, add notes, and mark specific misconceptions. Your manual overrides are tracked separately for accuracy analysis.",
    category: "Grading",
    keywords: ["override", "manual", "adjust", "score", "change"]
  },
  {
    question: "What is AI detection and how does it work?",
    answer: "AI detection analyzes student work for patterns that suggest AI-generated content. You can set a confidence threshold in Settings. When work exceeds this threshold, it can be flagged or automatically rejected.",
    category: "AI Detection",
    keywords: ["ai", "detection", "cheating", "flag", "reject"]
  },
  {
    question: "How do I set up parent notifications?",
    answer: "Go to Settings > AI Detection Settings and enable 'Parent Notifications'. Make sure students have parent email addresses in their profiles. Parents will be notified when work is flagged for AI content.",
    category: "Notifications",
    keywords: ["parent", "email", "notification", "alert", "contact"]
  },
  {
    question: "How do I create differentiated worksheets?",
    answer: "In the Assessment section, use the Worksheet Builder. Select a topic and choose 'Differentiated' mode. The system will generate questions at multiple difficulty levels (A-F) for diagnostic assessment.",
    category: "Worksheets",
    keywords: ["differentiated", "worksheet", "levels", "difficulty", "diagnostic"]
  },
  {
    question: "How do I share a worksheet with other teachers?",
    answer: "Open your worksheet and click the 'Share' button. This generates a unique link that other teachers can use to view and use your worksheet. You can toggle sharing on/off at any time.",
    category: "Worksheets",
    keywords: ["share", "collaborate", "link", "other teachers"]
  },
  {
    question: "What reports are available?",
    answer: "Reports include: Mastery Heatmap (topic performance across students), Student Progress Tracker (individual growth), Differentiation Grouping (skill-level clusters), and Topic Strengths Chart (class-wide analysis).",
    category: "Reports",
    keywords: ["reports", "analytics", "data", "mastery", "progress"]
  },
  {
    question: "How do I export data for grades?",
    answer: "In the Reports section, you can export student scores and mastery data. Click the export button on any report to download as CSV for import into your gradebook or LMS.",
    category: "Reports",
    keywords: ["export", "csv", "gradebook", "download", "lms"]
  },
  {
    question: "Is student data secure and FERPA compliant?",
    answer: "Yes. Student data is encrypted and stored securely. We follow FERPA guidelines for educational records. You maintain full control over your data and can delete student information at any time.",
    category: "Privacy",
    keywords: ["ferpa", "privacy", "secure", "data", "compliance"]
  },
  {
    question: "Can I use the app on mobile devices?",
    answer: "Yes! The web app is fully responsive. You can also build native iOS/Android apps using our Capacitor configuration in Settings. The mobile camera integration makes scanning easy on the go.",
    category: "Mobile",
    keywords: ["mobile", "phone", "tablet", "ios", "android", "app"]
  }
];

const videoTutorials: VideoTutorial[] = [
  {
    title: "Getting Started with NYCLogic Ai",
    description: "A complete walkthrough of setting up your account, creating classes, and scanning your first worksheet.",
    duration: "5:30",
    category: "Getting Started",
    thumbnail: "📚",
    url: "#"
  },
  {
    title: "Creating Classes & Importing Students",
    description: "Learn how to create classes, add students manually, or import from CSV files.",
    duration: "3:45",
    category: "Classes",
    thumbnail: "👥",
    url: "#"
  },
  {
    title: "Building Your First Worksheet",
    description: "Step-by-step guide to creating questions, setting up rubrics, and generating printable worksheets with QR codes.",
    duration: "7:20",
    category: "Worksheets",
    thumbnail: "📝",
    url: "#"
  },
  {
    title: "Scanning & Grading Student Work",
    description: "Master the scanning workflow - from capturing images to reviewing AI-suggested scores.",
    duration: "6:15",
    category: "Scanning",
    thumbnail: "📷",
    url: "#"
  },
  {
    title: "Understanding AI Detection",
    description: "Configure AI detection settings and learn how to review flagged submissions.",
    duration: "4:00",
    category: "AI Detection",
    thumbnail: "🤖",
    url: "#"
  },
  {
    title: "Using Reports for Data-Driven Instruction",
    description: "Explore the mastery heatmap, student progress tracking, and differentiation grouping features.",
    duration: "8:30",
    category: "Reports",
    thumbnail: "📊",
    url: "#"
  },
  {
    title: "Differentiated Instruction Workflow",
    description: "Create diagnostic assessments and group students by skill level for targeted instruction.",
    duration: "6:45",
    category: "Worksheets",
    thumbnail: "🎯",
    url: "#"
  },
  {
    title: "Mobile App Setup",
    description: "Build and deploy the native mobile app for iOS and Android using Capacitor.",
    duration: "5:00",
    category: "Mobile",
    thumbnail: "📱",
    url: "#"
  }
];

const docArticles: DocArticle[] = [
  {
    title: "Class Management",
    description: "Create classes, manage rosters, and organize students by period.",
    category: "Core Features",
    icon: Users,
    keywords: ["class", "students", "roster", "period", "manage"],
    content: "Classes are the foundation of your NYCLogic Ai workflow. Each class contains students and can be associated with assessments. You can import students via CSV, add them manually, or scan roster images for automatic extraction."
  },
  {
    title: "Question Bank & Rubrics",
    description: "Build a library of questions with detailed scoring rubrics.",
    category: "Core Features",
    icon: FileText,
    keywords: ["question", "rubric", "scoring", "jmap", "bank"],
    content: "Create questions with text and/or images. Define step-by-step rubrics that the AI uses for scoring. Questions can be tagged with topics and difficulty levels for easy organization and worksheet generation."
  },
  {
    title: "Scanning Workflow",
    description: "Capture, process, and grade student work efficiently.",
    category: "Core Features",
    icon: Camera,
    keywords: ["scan", "camera", "grade", "capture", "workflow"],
    content: "Use your device camera or upload images to scan student work. The QR code identifies the student automatically. AI analyzes the work and suggests scores based on your rubric. Review and adjust scores as needed."
  },
  {
    title: "Analytics & Reports",
    description: "Track student progress and identify learning gaps.",
    category: "Core Features",
    icon: BarChart3,
    keywords: ["analytics", "reports", "progress", "mastery", "data"],
    content: "Access powerful analytics including mastery heatmaps, individual progress tracking, and class-wide topic analysis. Use differentiation grouping to identify students who need intervention or enrichment."
  },
  {
    title: "AI Detection System",
    description: "Identify potentially AI-generated student work.",
    category: "Advanced",
    icon: Shield,
    keywords: ["ai", "detection", "cheating", "integrity", "academic"],
    content: "Configure detection thresholds and automatic actions. When student work is flagged, you can review the confidence score and indicators. Optional parent notifications keep families informed."
  },
  {
    title: "Settings & Configuration",
    description: "Customize your NYCLogic Ai experience.",
    category: "Advanced",
    icon: Settings,
    keywords: ["settings", "configure", "customize", "preferences"],
    content: "Adjust AI detection thresholds, notification preferences, and grading scales. Configure parent notification templates and manage your mobile app settings."
  }
];

const categories = ["All", "Getting Started", "Classes", "Worksheets", "Scanning", "Grading", "AI Detection", "Reports", "Notifications", "Privacy", "Mobile"];

export default function Help() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactSubject, setContactSubject] = useState('');
  const [contactCategory, setContactCategory] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredFAQs = useMemo(() => {
    return faqItems.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const filteredVideos = useMemo(() => {
    return videoTutorials.filter(video => {
      const matchesSearch = searchQuery === '' ||
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || video.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const filteredDocs = useMemo(() => {
    return docArticles.filter(doc => {
      const matchesSearch = searchQuery === '' ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
  }, [searchQuery]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactName.trim() || !contactEmail.trim() || !contactSubject.trim() || !contactCategory || !contactMessage.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call - in production, this would send to your support system
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Your message has been sent! We\'ll get back to you within 24-48 hours.');
      
      // Reset form
      setContactName('');
      setContactEmail(user?.email || '');
      setContactSubject('');
      setContactCategory('');
      setContactMessage('');
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold">Help Center</h1>
          <p className="text-muted-foreground">
            Find answers, watch tutorials, and learn how to get the most out of NYCLogic Ai
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>

        {/* Quick Tips */}
        {searchQuery === '' && (
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Pro Tip</h3>
                  <p className="text-xs text-muted-foreground">Use batch scanning to grade multiple papers at once</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-accent/5 border-accent/20">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Quick Start</h3>
                  <p className="text-xs text-muted-foreground">Import students via CSV to save time</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary border-secondary">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Need More Help?</h3>
                  <p className="text-xs text-muted-foreground">Restart the guided tour in Settings</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="faq" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Contact</span>
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="text-xs"
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* FAQ Accordion */}
            {filteredFAQs.length > 0 ? (
              <Accordion type="single" collapsible className="space-y-2">
                {filteredFAQs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`faq-${index}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-start gap-3">
                        <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">{faq.question}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {faq.category}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-8 text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No FAQs found matching your search.</p>
                  <p className="text-sm">Try different keywords or clear the filter.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 8).map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="text-xs"
                >
                  {cat}
                </Button>
              ))}
            </div>

            {filteredVideos.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredVideos.map((video, index) => (
                  <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="aspect-video bg-muted flex items-center justify-center relative">
                      <span className="text-5xl">{video.thumbnail}</span>
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                        <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="h-6 w-6 text-primary-foreground ml-1" />
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">{video.category}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {video.duration}
                        </span>
                      </div>
                      <h3 className="font-medium mb-1">{video.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No videos found matching your search.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Docs Tab */}
          <TabsContent value="docs" className="space-y-4">
            {filteredDocs.length > 0 ? (
              <div className="grid gap-4">
                {filteredDocs.map((doc, index) => {
                  const Icon = doc.icon;
                  return (
                    <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{doc.title}</CardTitle>
                              <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                            </div>
                            <CardDescription>{doc.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pl-20">
                        <p className="text-sm text-muted-foreground">{doc.content}</p>
                        <Button variant="link" className="px-0 mt-2 text-primary">
                          Read more <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No documentation found matching your search.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Contact Support
                </CardTitle>
                <CardDescription>
                  Have a question or issue? Fill out the form below and our team will get back to you within 24-48 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Your Name *</Label>
                      <Input
                        id="contact-name"
                        placeholder="Enter your name"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        maxLength={100}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email Address *</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="Enter your email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        maxLength={255}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-category">Category *</Label>
                      <Select value={contactCategory} onValueChange={setContactCategory}>
                        <SelectTrigger id="contact-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="question">General Question</SelectItem>
                          <SelectItem value="bug">Bug Report</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                          <SelectItem value="account">Account Issue</SelectItem>
                          <SelectItem value="billing">Billing Question</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-subject">Subject *</Label>
                      <Input
                        id="contact-subject"
                        placeholder="Brief description of your issue"
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        maxLength={200}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Message *</Label>
                    <Textarea
                      id="contact-message"
                      placeholder="Please describe your question or issue in detail. Include any relevant information such as steps to reproduce, error messages, or screenshots."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      rows={6}
                      maxLength={2000}
                      required
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {contactMessage.length}/2000 characters
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      * Required fields
                    </p>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Additional Contact Info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Response Time</h3>
                    <p className="text-xs text-muted-foreground">
                      We typically respond within 24-48 business hours
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Lightbulb className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Check the FAQ First</h3>
                    <p className="text-xs text-muted-foreground">
                      Many common questions are answered in our FAQ section
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
