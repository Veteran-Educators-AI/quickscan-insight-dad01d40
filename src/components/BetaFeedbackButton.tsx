import { useState } from "react";
import { MessageSquarePlus, Bug, Lightbulb, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function BetaFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackType || !title.trim() || !description.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("beta_feedback").insert({
        user_id: user?.id || null,
        email: email.trim() || user?.email || null,
        feedback_type: feedbackType,
        title: title.trim(),
        description: description.trim(),
        page_url: window.location.href,
      });

      if (error) throw error;

      toast({
        title: "Feedback submitted!",
        description: "Thank you for helping us improve NYClogic Ai.",
      });

      // Reset form
      setFeedbackType("");
      setTitle("");
      setDescription("");
      setEmail("");
      setOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 gap-2 shadow-lg bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="hidden sm:inline">Beta Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Beta Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve NYClogic Ai! Share your feature requests, report bugs, or send general feedback.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Type of Feedback *</Label>
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger id="feedback-type">
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feature_request">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Feature Request
                  </div>
                </SelectItem>
                <SelectItem value="bug_report">
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-red-500" />
                    Bug Report
                  </div>
                </SelectItem>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <MessageSquarePlus className="h-4 w-4 text-primary" />
                    General Feedback
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief summary of your feedback"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder={
                feedbackType === "bug_report"
                  ? "Please describe the bug, steps to reproduce, and what you expected to happen..."
                  : feedbackType === "feature_request"
                  ? "Describe the feature you'd like and how it would help you..."
                  : "Share your thoughts with us..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/2000
            </p>
          </div>

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Provide your email if you'd like us to follow up with you.
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
