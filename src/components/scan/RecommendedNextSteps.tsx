import { useState } from 'react';
import { BookOpen, Sparkles, Send, ExternalLink, Loader2, ArrowRight, Target, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';
import { toast } from 'sonner';
import { GEOMETRY_TOPICS, ALGEBRA1_TOPICS, ALGEBRA2_TOPICS } from '@/data/nysTopics';
import { useNavigate } from 'react-router-dom';

interface RecommendedNextStepsProps {
  misconceptions: string[];
  problemContext?: string;
  nysStandard?: string;
  topicName?: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  grade?: number;
  regentsScore?: number;
}

interface TopicRecommendation {
  name: string;
  standard: string;
  url: string;
  relevance: 'high' | 'medium';
  reason: string;
}

interface WorksheetRecommendation {
  title: string;
  topicName: string;
  standard: string;
  difficulty: 'scaffolded' | 'practice' | 'challenge';
}

// Match misconceptions to relevant topics
function findRelevantTopics(
  misconceptions: string[],
  problemContext?: string,
  nysStandard?: string
): TopicRecommendation[] {
  const allTopics = [
    ...GEOMETRY_TOPICS.flatMap(cat => cat.topics),
    ...ALGEBRA1_TOPICS.flatMap(cat => cat.topics),
    ...ALGEBRA2_TOPICS.flatMap(cat => cat.topics),
  ];

  const recommendations: TopicRecommendation[] = [];
  const addedTopics = new Set<string>();

  // First priority: Match by NYS standard
  if (nysStandard) {
    const standardTopics = allTopics.filter(t => 
      t.standard.toLowerCase() === nysStandard.toLowerCase()
    );
    standardTopics.forEach(topic => {
      if (!addedTopics.has(topic.name)) {
        recommendations.push({
          ...topic,
          relevance: 'high',
          reason: `Matches assigned standard ${nysStandard}`,
        });
        addedTopics.add(topic.name);
      }
    });
  }

  // Second priority: Match misconceptions to topic names
  const misconceptionKeywords = misconceptions
    .flatMap(m => m.toLowerCase().split(/\s+/))
    .filter(word => word.length > 3);

  allTopics.forEach(topic => {
    if (addedTopics.has(topic.name)) return;
    
    const topicLower = topic.name.toLowerCase();
    const matchedKeywords = misconceptionKeywords.filter(keyword =>
      topicLower.includes(keyword)
    );

    if (matchedKeywords.length > 0) {
      recommendations.push({
        ...topic,
        relevance: matchedKeywords.length > 1 ? 'high' : 'medium',
        reason: `Addresses: ${matchedKeywords.slice(0, 2).join(', ')}`,
      });
      addedTopics.add(topic.name);
    }
  });

  // Third priority: Match problem context
  if (problemContext) {
    const contextWords = problemContext.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    allTopics.forEach(topic => {
      if (addedTopics.has(topic.name)) return;
      
      const topicLower = topic.name.toLowerCase();
      if (contextWords.some(word => topicLower.includes(word))) {
        recommendations.push({
          ...topic,
          relevance: 'medium',
          reason: 'Related to problem topic',
        });
        addedTopics.add(topic.name);
      }
    });
  }

  // Limit to top 5 recommendations
  return recommendations.slice(0, 5);
}

// Generate worksheet recommendations based on misconceptions
function generateWorksheetRecommendations(
  misconceptions: string[],
  topicName?: string,
  nysStandard?: string,
  regentsScore?: number
): WorksheetRecommendation[] {
  const recommendations: WorksheetRecommendation[] = [];
  
  // Determine difficulty based on regents score
  const primaryDifficulty: 'scaffolded' | 'practice' | 'challenge' = 
    regentsScore !== undefined 
      ? regentsScore <= 2 ? 'scaffolded' : regentsScore <= 3 ? 'practice' : 'challenge'
      : 'practice';

  // Create worksheet for each misconception (up to 3)
  misconceptions.slice(0, 3).forEach((misconception, index) => {
    recommendations.push({
      title: `${topicName || 'Math'} Practice: ${misconception.slice(0, 50)}${misconception.length > 50 ? '...' : ''}`,
      topicName: topicName || 'General Practice',
      standard: nysStandard || 'N/A',
      difficulty: index === 0 ? primaryDifficulty : 'practice',
    });
  });

  // Add a challenge worksheet if student did well
  if (regentsScore && regentsScore >= 3 && recommendations.length > 0) {
    recommendations.push({
      title: `Challenge: Advanced ${topicName || 'Math'} Problems`,
      topicName: topicName || 'Challenge Practice',
      standard: nysStandard || 'N/A',
      difficulty: 'challenge',
    });
  }

  return recommendations;
}

export function RecommendedNextSteps({
  misconceptions,
  problemContext,
  nysStandard,
  topicName,
  studentId,
  studentName,
  classId,
  grade,
  regentsScore,
}: RecommendedNextStepsProps) {
  const [isPushingToApp, setIsPushingToApp] = useState(false);
  const [pushedItems, setPushedItems] = useState<Set<string>>(new Set());
  const { pushToSisterApp } = usePushToSisterApp();
  const navigate = useNavigate();

  const topicRecommendations = findRelevantTopics(misconceptions, problemContext, nysStandard);
  const worksheetRecommendations = generateWorksheetRecommendations(
    misconceptions,
    topicName,
    nysStandard,
    regentsScore
  );

  const handlePushToApp = async (worksheet: WorksheetRecommendation) => {
    if (!classId) {
      toast.error('Class ID required to push to student app');
      return;
    }

    setIsPushingToApp(true);

    try {
      const xpReward = worksheet.difficulty === 'challenge' ? 50 : worksheet.difficulty === 'practice' ? 30 : 20;
      const coinReward = worksheet.difficulty === 'challenge' ? 25 : worksheet.difficulty === 'practice' ? 15 : 10;

      const result = await pushToSisterApp({
        class_id: classId,
        title: worksheet.title,
        description: `Practice worksheet for ${worksheet.topicName} (${worksheet.standard})`,
        student_id: studentId,
        student_name: studentName,
        topic_name: worksheet.topicName,
        standard_code: worksheet.standard,
        xp_reward: xpReward,
        coin_reward: coinReward,
        grade,
      });

      if (result.success) {
        toast.success(`"${worksheet.title}" sent to student app for gamification!`);
        setPushedItems(prev => new Set([...prev, worksheet.title]));
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error pushing to app:', err);
      const message = err instanceof Error ? err.message : 'Failed to push to app';
      if (message.includes('API key not configured') || message.includes('endpoint URL not configured')) {
        toast.error('Sister app integration not configured. Please set up the connection in Settings.');
      } else {
        toast.error(message);
      }
    } finally {
      setIsPushingToApp(false);
    }
  };

  const handleCreateWorksheet = (worksheet: WorksheetRecommendation) => {
    // Navigate to worksheet builder with pre-filled data
    navigate('/questions', { 
      state: { 
        createWorksheet: true,
        suggestedTopic: worksheet.topicName,
        suggestedStandard: worksheet.standard,
        suggestedTitle: worksheet.title,
      } 
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'scaffolded': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'practice': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'challenge': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Only show if there are recommendations
  if (topicRecommendations.length === 0 && worksheetRecommendations.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Recommended Next Steps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Worksheet Recommendations */}
        {worksheetRecommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              Suggested Worksheets
            </div>
            <div className="space-y-2">
              {worksheetRecommendations.map((worksheet, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={getDifficultyColor(worksheet.difficulty)}>
                        {worksheet.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {worksheet.standard}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{worksheet.title}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCreateWorksheet(worksheet)}
                      className="h-8"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Create
                    </Button>
                    {studentId && classId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePushToApp(worksheet)}
                        disabled={isPushingToApp || pushedItems.has(worksheet.title)}
                        className="h-8"
                      >
                        {pushedItems.has(worksheet.title) ? (
                          <>✓ Sent</>
                        ) : isPushingToApp ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            App
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic Recommendations */}
        {topicRecommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              Related Topics to Review
            </div>
            <div className="flex flex-wrap gap-2">
              {topicRecommendations.map((topic, index) => (
                <a
                  key={index}
                  href={topic.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <Badge 
                    variant={topic.relevance === 'high' ? 'default' : 'secondary'}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {topic.name}
                    <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Badge>
                </a>
              ))}
            </div>
            {topicRecommendations.some(t => t.relevance === 'high') && (
              <p className="text-xs text-muted-foreground">
                Click any topic to view JMAP practice problems
              </p>
            )}
          </div>
        )}

        {/* Gamification Info */}
        {studentId && classId && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-dashed">
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <p className="text-sm font-medium">Push to Student App</p>
                <p className="text-xs text-muted-foreground">
                  Send worksheets to the sister app for gamification. 
                  Students earn XP and coins for completing practice.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
