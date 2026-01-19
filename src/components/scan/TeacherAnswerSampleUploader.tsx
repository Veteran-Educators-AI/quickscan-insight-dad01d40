import { useState, useRef } from 'react';
import { Camera, Upload, X, Save, Loader2, BookOpen, Target, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { GEOMETRY_TOPICS, ALGEBRA1_TOPICS, ALGEBRA2_TOPICS, type TopicCategory } from '@/data/nysTopics';

interface TeacherAnswerSampleUploaderProps {
  onSampleSaved?: () => void;
}

export function TeacherAnswerSampleUploader({ onSampleSaved }: TeacherAnswerSampleUploaderProps) {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [topicName, setTopicName] = useState('');
  const [nysStandard, setNysStandard] = useState('');
  const [questionContext, setQuestionContext] = useState('');
  const [gradingEmphasis, setGradingEmphasis] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!image || !imageFile || !topicName) {
      toast.error('Please provide an image and topic name');
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save answer samples');
        return;
      }

      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('teacher-answers')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('teacher-answers')
        .getPublicUrl(fileName);

      // Analyze the image to extract OCR text and key steps
      setIsAnalyzing(true);
      let ocrText = '';
      let keySteps: string[] = [];

      try {
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-student-work', {
          body: {
            imageBase64: image.split(',')[1],
            extractOnly: true, // Just extract text, don't grade
          }
        });

        if (!analysisError && analysisData) {
          ocrText = analysisData.ocrText || '';
          keySteps = analysisData.keySteps || [];
        }
      } catch (e) {
        console.log('OCR extraction skipped:', e);
      }

      setIsAnalyzing(false);

      // Save to database
      const { error: dbError } = await supabase
        .from('teacher_answer_samples')
        .insert({
          teacher_id: user.id,
          topic_name: topicName,
          nys_standard: nysStandard || null,
          question_context: questionContext || null,
          image_url: publicUrl,
          ocr_text: ocrText || null,
          key_steps: keySteps.length > 0 ? keySteps : null,
          grading_emphasis: gradingEmphasis || null,
          notes: notes || null,
        });

      if (dbError) throw dbError;

      toast.success('Answer sample saved! AI will now learn from your approach.');
      
      // Reset form
      clearImage();
      setTopicName('');
      setNysStandard('');
      setQuestionContext('');
      setGradingEmphasis('');
      setNotes('');
      
      onSampleSaved?.();
    } catch (error) {
      console.error('Error saving answer sample:', error);
      toast.error('Failed to save answer sample');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  // Flatten topics for selection - combine all subjects
  const allTopicCategories: TopicCategory[] = [...GEOMETRY_TOPICS, ...ALGEBRA1_TOPICS, ...ALGEBRA2_TOPICS];
  const allTopics = allTopicCategories.flatMap(category => 
    category.topics.map(topic => ({
      standard: topic.standard,
      name: topic.name,
      display: `${topic.standard} - ${topic.name}`
    }))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Teacher Answer Sample
        </CardTitle>
        <CardDescription>
          Upload your own solutions to train the AI to grade like you. The AI will compare student work to your approach.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Upload Area */}
        <div className="space-y-2">
          <Label>Your Solution Image</Label>
          {!image ? (
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Click to upload your handwritten solution
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative">
              <img 
                src={image} 
                alt="Your solution" 
                className="w-full rounded-lg border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Topic Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Topic / Standard
          </Label>
          <Select value={topicName} onValueChange={(value) => {
            setTopicName(value);
            const topic = allTopics.find(t => t.name === value);
            if (topic) setNysStandard(topic.standard);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a topic..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {allTopics.map((topic, idx) => (
                <SelectItem key={idx} value={topic.name}>
                  {topic.display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Question Context */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Question/Problem Description
          </Label>
          <Textarea
            placeholder="Describe the problem you solved (optional but helpful for context)"
            value={questionContext}
            onChange={(e) => setQuestionContext(e.target.value)}
            rows={2}
          />
        </div>

        {/* Grading Emphasis */}
        <div className="space-y-2">
          <Label>What Should AI Focus On When Grading?</Label>
          <Textarea
            placeholder="e.g., 'Must show work for full credit', 'Correct formula is essential', 'Accept any valid method'..."
            value={gradingEmphasis}
            onChange={(e) => setGradingEmphasis(e.target.value)}
            rows={2}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Additional Notes (Optional)</Label>
          <Input
            placeholder="Any other context for this sample..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave}
          disabled={!image || !topicName || isUploading}
          className="w-full"
          variant="hero"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isAnalyzing ? 'Analyzing...' : 'Saving...'}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Answer Sample for AI Training
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}