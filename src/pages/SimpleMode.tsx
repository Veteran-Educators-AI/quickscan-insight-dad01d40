import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Mail, Check, X, RefreshCw, BookOpen, FileText, TrendingDown } from "lucide-react";

interface Suggestion {
  id: string;
  topic: string;
  standard: string | null;
  reason: string;
  avgGrade: number;
  attemptCount: number;
  approvalToken: string;
  otherOptions: {
    topic_name: string;
    standard: string | null;
    avg_grade: number;
    attempt_count: number;
  }[];
}

interface ClassOption {
  id: string;
  name: string;
}

export default function SimpleMode() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [excludeTopics, setExcludeTopics] = useState<string[]>([]);

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", user.id)
      .order("name");
    setClasses(data || []);
  };

  const generateSuggestion = async () => {
    setLoading(true);
    setEmailSent(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-simple-mode-suggestion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            classId: selectedClass || null,
            excludeTopics,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      if (result.suggestion) {
        setSuggestion(result.suggestion);
        toast({
          title: "Suggestion Ready",
          description: `Based on student data, we recommend: ${result.suggestion.topic}`,
        });
      } else {
        setSuggestion(null);
        toast({
          title: "No Struggling Topics",
          description: result.message || "Your students are doing great!",
        });
      }
    } catch (error) {
      console.error("Error generating suggestion:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate suggestion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendEmailSuggestion = async () => {
    if (!suggestion) return;
    setSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-simple-mode-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            suggestionId: suggestion.id,
            approvalToken: suggestion.approvalToken,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setEmailSent(true);
      toast({
        title: "Email Sent!",
        description: "Check your inbox. Click approve/reject directly from the email.",
      });
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleApprove = async () => {
    if (!suggestion) return;
    setGenerating(true);
    try {
      // Update status to approved
      await supabase
        .from("simple_mode_suggestions")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", suggestion.id);

      toast({
        title: "Generating Materials...",
        description: "Creating your lesson plan and worksheet",
      });

      // Navigate to questions page with the topic pre-selected
      navigate(`/questions?simpleMode=true&topic=${encodeURIComponent(suggestion.topic)}&standard=${encodeURIComponent(suggestion.standard || "")}`);
    } catch (error) {
      console.error("Error approving:", error);
      toast({
        title: "Error",
        description: "Failed to approve suggestion",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleReject = async () => {
    if (!suggestion) return;
    
    // Add to exclude list
    setExcludeTopics(prev => [...prev, suggestion.topic]);
    
    // Update status
    await supabase
      .from("simple_mode_suggestions")
      .update({ status: "rejected" })
      .eq("id", suggestion.id);

    toast({
      title: "Generating New Suggestion",
      description: "Finding another topic for you...",
    });

    // Generate new suggestion
    setSuggestion(null);
    generateSuggestion();
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Simple Mode</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            AI-powered lesson suggestions based on your students' performance
          </p>
        </div>

        {/* Class Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Select Class (Optional)</CardTitle>
            <CardDescription>
              Choose a specific class or leave empty to analyze all students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={generateSuggestion} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Get Today's Suggestion
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suggestion Display */}
        {suggestion && (
          <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    {suggestion.topic}
                  </CardTitle>
                  {suggestion.standard && (
                    <Badge variant="secondary" className="mt-2">
                      {suggestion.standard}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-destructive">
                    <TrendingDown className="h-5 w-5" />
                    <span className="text-2xl font-bold">{suggestion.avgGrade}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {suggestion.attemptCount} attempts
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">{suggestion.reason}</p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Button onClick={handleApprove} disabled={generating} className="bg-green-600 hover:bg-green-700">
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Approve & Generate
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={loading}>
                  <X className="h-4 w-4 mr-2" />
                  Try Another Topic
                </Button>
                <Button
                  variant="outline"
                  onClick={sendEmailSuggestion}
                  disabled={sendingEmail || emailSent}
                >
                  {sendingEmail ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : emailSent ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {emailSent ? "Email Sent" : "Email Me This"}
                </Button>
              </div>

              {/* Other Options */}
              {suggestion.otherOptions.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                    Other topics needing attention:
                  </h4>
                  <div className="grid gap-2">
                    {suggestion.otherOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <span className="font-medium">{opt.topic_name}</span>
                          {opt.standard && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {opt.standard}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {opt.avg_grade}% avg
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* What happens next */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              What happens when you approve?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Lesson Plan Generated</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete slides with examples and speaker notes
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Practice Worksheet Created</h4>
                  <p className="text-sm text-muted-foreground">
                    Targeted questions for student practice
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
