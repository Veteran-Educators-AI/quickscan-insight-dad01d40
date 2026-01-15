import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
  Quote,
  Target,
  X,
  Lightbulb,
  FileSpreadsheet,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PrintRemediationQuestionsDialog } from '@/components/print/PrintRemediationQuestionsDialog';

interface ClassMisconceptionSummaryProps {
  classId?: string;
}

interface GradeWithStudent {
  id: string;
  topic_name: string;
  grade: number;
  grade_justification: string | null;
  nys_standard: string | null;
  created_at: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface ExtractedMisconception {
  title: string;
  category: string;
  whatStudentDid: string;
  whatWasExpected: string;
  exactQuote: string;
  severity: 'high' | 'medium' | 'low';
  studentName: string;
  studentId: string;
  topic: string;
  grade: number;
  date: string;
  standard?: string | null;
}

interface GroupedMisconception {
  category: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  studentCount: number;
  instances: ExtractedMisconception[];
  commonTopics: string[];
  suggestedRemedies: string[];
}

// Extract exact quote from justification
const extractExactQuote = (justification: string): string => {
  // Look for quoted text
  const quotePatterns = [
    /"([^"]{10,200})"/,
    /'([^']{10,200})'/,
    /student (?:wrote|answered|said|responded)(?:\s*:)?\s*["']?([^"'\n.]{10,150})["']?/i,
    /(?:their|the) (?:answer|response|work|solution)(?:\s*(?:was|is|reads?|stated?|showed?))?\s*[:"]?\s*["']?([^"'\n.]{10,150})["']?/i,
    /(?:wrote|stated|answered|responded)\s*[:"]?\s*["']?([^"'\n.]{10,150})["']?/i,
  ];
  
  for (const pattern of quotePatterns) {
    const match = justification.match(pattern);
    if (match && match[1]) {
      return `"${match[1].trim()}"`;
    }
  }
  
  // If no explicit quote, try to find the error description
  const errorDescPatterns = [
    /(?:error|mistake|incorrect)(?:\s*[:\-])?\s*(.{15,100}?)(?:\.|$)/i,
    /(?:student)?\s*(?:incorrectly|wrongly)\s+(.{15,100}?)(?:\.|$)/i,
  ];
  
  for (const pattern of errorDescPatterns) {
    const match = justification.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Extract a meaningful sentence that contains error indicators
  const sentences = justification.split(/[.!?]+/).filter(s => s.trim().length > 15);
  for (const sentence of sentences) {
    if (/error|mistake|incorrect|wrong|forgot|missed|omit/i.test(sentence)) {
      return sentence.trim().substring(0, 150);
    }
  }
  
  return justification.substring(0, 100).trim() + '...';
};

// Identify misconception category
const identifyMisconceptionCategory = (text: string): { category: string; title: string } => {
  const textLower = text.toLowerCase();
  
  if (/sign|negative|positive|minus|plus/.test(textLower)) {
    return { category: 'Sign Errors', title: 'Incorrect handling of positive/negative signs' };
  }
  if (/order.*operation|pemdas|bedmas/.test(textLower)) {
    return { category: 'Order of Operations', title: 'PEMDAS/order of operations confusion' };
  }
  if (/fraction|numerator|denominator|divide.*fraction/.test(textLower)) {
    return { category: 'Fraction Operations', title: 'Misunderstanding fraction operations' };
  }
  if (/decimal|place.*value|point/.test(textLower)) {
    return { category: 'Decimal Operations', title: 'Decimal place value errors' };
  }
  if (/variable|substitute|expression|algebraic/.test(textLower)) {
    return { category: 'Algebraic Expressions', title: 'Variable and expression errors' };
  }
  if (/equation|solve|isolate|both.*side/.test(textLower)) {
    return { category: 'Equation Solving', title: 'Equation solving procedural errors' };
  }
  if (/graph|coordinate|plot|slope|intercept/.test(textLower)) {
    return { category: 'Graphing', title: 'Graphing and coordinate errors' };
  }
  if (/exponent|power|base|squared|cubed/.test(textLower)) {
    return { category: 'Exponents', title: 'Exponent rule misconceptions' };
  }
  if (/area|perimeter|volume|surface/.test(textLower)) {
    return { category: 'Measurement', title: 'Area/perimeter/volume calculation errors' };
  }
  if (/angle|triangle|polygon|parallel|perpendicular/.test(textLower)) {
    return { category: 'Geometry Concepts', title: 'Geometric relationship misunderstandings' };
  }
  if (/proportion|ratio|percent|rate/.test(textLower)) {
    return { category: 'Ratios & Proportions', title: 'Ratio and proportion errors' };
  }
  if (/calculation|arithmetic|compute|multiply|divide|add|subtract/.test(textLower)) {
    return { category: 'Arithmetic', title: 'Basic calculation errors' };
  }
  if (/formula|apply|use.*wrong|incorrect.*formula/.test(textLower)) {
    return { category: 'Formula Application', title: 'Incorrect formula usage' };
  }
  if (/unit|convert|measurement/.test(textLower)) {
    return { category: 'Unit Conversion', title: 'Unit conversion errors' };
  }
  if (/incomplete|missing.*work|show.*work|justify/.test(textLower)) {
    return { category: 'Incomplete Work', title: 'Missing work or justification' };
  }
  if (/setup|translate|word.*problem|interpret/.test(textLower)) {
    return { category: 'Problem Setup', title: 'Incorrect problem interpretation' };
  }
  if (/concept|understand|misunderstand|confus/.test(textLower)) {
    return { category: 'Conceptual Understanding', title: 'Fundamental concept misunderstanding' };
  }
  
  return { category: 'Other Errors', title: 'Mathematical error' };
};

// Get remedies for category
const getRemediesForCategory = (category: string): string[] => {
  const remedies: Record<string, string[]> = {
    'Sign Errors': ['Number line practice with signed operations', 'Color-coded positive/negative exercises', 'Real-world temperature/elevation problems'],
    'Order of Operations': ['PEMDAS step-by-step practice', 'Expression evaluation with grouping symbols', 'Error analysis exercises'],
    'Fraction Operations': ['Visual fraction models', 'Fraction bar manipulatives', 'Cross-multiplication practice'],
    'Decimal Operations': ['Place value charts', 'Money-based decimal problems', 'Grid models for decimals'],
    'Algebraic Expressions': ['Variable substitution drills', 'Like terms sorting activities', 'Expression building exercises'],
    'Equation Solving': ['Balance method visualization', 'Inverse operation practice', 'Equation verification checks'],
    'Graphing': ['Coordinate plotting practice', 'Slope calculation from points', 'Interactive graphing tools'],
    'Exponents': ['Exponent rules flashcards', 'Pattern recognition with powers', 'Scientific notation practice'],
    'Measurement': ['Formula reference sheets', 'Unit analysis practice', 'Real-world measurement applications'],
    'Geometry Concepts': ['Geometric constructions', 'Angle relationship practice', 'Visual proofs'],
    'Ratios & Proportions': ['Proportion tables', 'Cross-multiplication practice', 'Real-world ratio problems'],
    'Arithmetic': ['Timed basic facts practice', 'Mental math strategies', 'Error checking techniques'],
    'Formula Application': ['Formula derivation activities', 'When-to-use decision trees', 'Formula matching exercises'],
    'Unit Conversion': ['Conversion factor practice', 'Dimensional analysis', 'Unit relationship charts'],
    'Incomplete Work': ['Structured solution templates', 'Justification sentence starters', 'Work verification checklists'],
    'Problem Setup': ['Problem translation exercises', 'Key word identification', 'Diagram drawing practice'],
    'Conceptual Understanding': ['Concept mapping', 'Explain-to-a-friend activities', 'Multiple representation tasks'],
    'Other Errors': ['Targeted practice problems', 'One-on-one review', 'Error analysis journals'],
  };
  
  return remedies[category] || remedies['Other Errors'];
};

// Extract structured misconception from justification with specific actionable details
const extractMisconceptionFromJustification = (
  justification: string,
  studentName: string,
  studentId: string,
  topic: string,
  grade: number,
  date: string,
  standard?: string | null
): ExtractedMisconception | null => {
  if (!justification || justification.length < 20) return null;
  
  // Clean the justification
  const cleaned = justification.replace(/\*\*/g, '').replace(/\*\s*/g, '').trim();
  
  // Check if there's an error indicator
  const hasError = /error|mistake|incorrect|wrong|missing|forgot|failed|did not|didn't|omitted|lost|deducted|issue|problem|misconception|confused/i.test(cleaned);
  if (!hasError) return null;
  
  const { category, title } = identifyMisconceptionCategory(cleaned);
  const exactQuote = extractExactQuote(cleaned);
  
  // Extract SPECIFIC what student did vs expected with detailed patterns
  let whatStudentDid = '';
  let whatWasExpected = '';
  
  // More specific extraction patterns for actionable data
  const specificPatterns = [
    // Pattern: "wrote X instead of Y"
    /(?:wrote|calculated|got|obtained|gave|answered|put|stated)\s+["']?([^"'\n,]{5,80})["']?\s+(?:instead of|rather than|but should (?:have )?(?:been|wrote|calculated))\s+["']?([^"'\n,]{5,80})["']?/i,
    // Pattern: "used X but should have used Y"
    /(?:used|applied|chose)\s+(.+?)\s+(?:but|when|instead of)\s+(?:should have|the correct|proper|needed to)\s+(?:used?|applied?|chosen?)?\s*(.+?)(?:\.|,|$)/i,
    // Pattern: "X is incorrect, correct answer is Y"
    /["']?([^"'\n]{5,60})["']?\s+(?:is|was)\s+(?:incorrect|wrong)\.?\s*(?:the )?correct\s+(?:answer|solution|value)?\s*(?:is|was|should be)\s*["']?([^"'\n]{5,60})["']?/i,
    // Pattern: "forgot to X"
    /(?:forgot|failed|neglected|omitted|missed)\s+(?:to\s+)?(.{10,80}?)(?:\.|,|$)/i,
    // Pattern: "did not X"
    /(?:did not|didn't|failed to)\s+(.{10,80}?)(?:\.|,|$)/i,
  ];
  
  for (const pattern of specificPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      if (match[2]) {
        whatStudentDid = match[1].trim();
        whatWasExpected = match[2].trim();
      } else if (match[1]) {
        // Single capture (forgot/failed patterns)
        whatStudentDid = `Did not ${match[1].trim().toLowerCase()}`;
        whatWasExpected = `Should have ${match[1].trim().toLowerCase()}`;
      }
      break;
    }
  }
  
  // Extract specific numbers/expressions if present
  const numberPattern = /(\d+(?:\.\d+)?|\-?\d+(?:\/\d+)?|[xyz]\s*[=<>]\s*\-?\d+)/g;
  const numbers = cleaned.match(numberPattern);
  
  // If no specific contrast found, build from context
  if (!whatStudentDid) {
    // Look for specific error descriptions
    const errorTypes: Record<string, { did: string; expected: string }> = {
      'sign': { 
        did: 'Made a sign error (positive/negative confusion)', 
        expected: 'Carefully track positive and negative signs through each step' 
      },
      'order.*operation|pemdas': { 
        did: 'Applied operations in wrong order', 
        expected: 'Follow PEMDAS: Parentheses, Exponents, Multiplication/Division, Addition/Subtraction' 
      },
      'distribut': { 
        did: 'Failed to distribute correctly across all terms', 
        expected: 'Multiply every term inside the parentheses by the outside factor' 
      },
      'cancel|simplif': { 
        did: 'Incorrectly simplified or cancelled terms', 
        expected: 'Only cancel common factors, not terms in a sum' 
      },
      'formula': { 
        did: 'Applied the wrong formula for this problem type', 
        expected: 'Identify the problem type first, then select the appropriate formula' 
      },
      'unit|conversion': { 
        did: 'Made a unit conversion error', 
        expected: 'Set up conversion factors with units that cancel properly' 
      },
      'fraction': { 
        did: 'Made an error with fraction operations', 
        expected: 'Find common denominators for addition/subtraction; multiply across for multiplication' 
      },
      'decimal|place': { 
        did: 'Misaligned decimal places', 
        expected: 'Line up decimal points vertically; count places when multiplying/dividing' 
      },
      'exponent|power': { 
        did: 'Misapplied exponent rules', 
        expected: 'Add exponents when multiplying same base; multiply exponents for power of power' 
      },
      'slope|intercept': { 
        did: 'Confused slope and y-intercept or calculated incorrectly', 
        expected: 'Slope = rise/run = (y₂-y₁)/(x₂-x₁); y-intercept is where x=0' 
      },
      'substitute|variable': { 
        did: 'Made a substitution error with variables', 
        expected: 'Replace the variable everywhere it appears; use parentheses around substituted values' 
      },
      'isolate|solve': { 
        did: 'Made an error isolating the variable', 
        expected: 'Perform the same operation on both sides; work to get variable alone' 
      },
    };
    
    for (const [pattern, messages] of Object.entries(errorTypes)) {
      if (new RegExp(pattern, 'i').test(cleaned)) {
        whatStudentDid = messages.did;
        whatWasExpected = messages.expected;
        break;
      }
    }
    
    // Still nothing? Use a more generic but still actionable message
    if (!whatStudentDid) {
      // Extract any number comparisons
      if (numbers && numbers.length >= 2) {
        whatStudentDid = `Calculated ${numbers[0]} instead of the correct value`;
        whatWasExpected = `The correct answer should be ${numbers[1]}`;
      } else {
        whatStudentDid = 'Made a procedural or calculation error';
        whatWasExpected = 'Review the problem-solving steps and verify each calculation';
      }
    }
  }
  
  // Determine severity based on grade and keywords
  let severity: 'high' | 'medium' | 'low' = 'medium';
  if (/fundamental|basic|completely|entirely|major|critical|no.*understanding|zero|failed|serious/i.test(cleaned) || grade < 50) {
    severity = 'high';
  } else if (/minor|small|slight|almost|nearly|rounding|notation|careless/i.test(cleaned) || grade >= 80) {
    severity = 'low';
  }
  
  return {
    title,
    category,
    whatStudentDid: whatStudentDid.charAt(0).toUpperCase() + whatStudentDid.slice(1),
    whatWasExpected: whatWasExpected.charAt(0).toUpperCase() + whatWasExpected.slice(1),
    exactQuote,
    severity,
    studentName,
    studentId,
    topic,
    grade,
    date,
    standard,
  };
};

export function ClassMisconceptionSummary({ classId }: ClassMisconceptionSummaryProps) {
  const { user } = useAuth();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isGeneratingWorksheet, setIsGeneratingWorksheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [worksheetQuestions, setWorksheetQuestions] = useState<any[]>([]);
  const [showWorksheetDialog, setShowWorksheetDialog] = useState(false);
  const [worksheetTopicName, setWorksheetTopicName] = useState<string>('Remediation');

  // Fetch grade history with student info for the class
  const { data: gradeData, isLoading } = useQuery({
    queryKey: ['class-misconceptions', classId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('grade_history')
        .select(`
          id,
          topic_name,
          grade,
          grade_justification,
          nys_standard,
          created_at,
          student:students!inner(id, first_name, last_name, class_id)
        `)
        .eq('teacher_id', user!.id)
        .not('grade_justification', 'is', null)
        .order('created_at', { ascending: false });
      
      if (classId) {
        query = query.eq('student.class_id', classId);
      }
      
      const { data, error } = await query.limit(500);
      
      if (error) throw error;
      return data as unknown as GradeWithStudent[];
    },
    enabled: !!user,
  });

  // Extract and group misconceptions
  const groupedMisconceptions = useMemo(() => {
    if (!gradeData) return [];
    
    const allMisconceptions: ExtractedMisconception[] = [];
    
    gradeData.forEach(entry => {
      if (entry.grade_justification && entry.student) {
        const misconception = extractMisconceptionFromJustification(
          entry.grade_justification,
          `${entry.student.first_name} ${entry.student.last_name}`,
          entry.student.id,
          entry.topic_name,
          entry.grade,
          entry.created_at,
          entry.nys_standard
        );
        
        if (misconception) {
          allMisconceptions.push(misconception);
        }
      }
    });
    
    // Group by category
    const categoryMap = new Map<string, ExtractedMisconception[]>();
    allMisconceptions.forEach(m => {
      const existing = categoryMap.get(m.category) || [];
      existing.push(m);
      categoryMap.set(m.category, existing);
    });
    
    // Convert to grouped format
    const grouped: GroupedMisconception[] = [];
    categoryMap.forEach((instances, category) => {
      // Count unique students
      const uniqueStudents = new Set(instances.map(i => i.studentId));
      
      // Get unique topics
      const uniqueTopics = [...new Set(instances.map(i => i.topic))];
      
      // Determine overall severity (most common)
      const severityCounts = { high: 0, medium: 0, low: 0 };
      instances.forEach(i => severityCounts[i.severity]++);
      const severity = severityCounts.high >= severityCounts.medium && severityCounts.high >= severityCounts.low
        ? 'high'
        : severityCounts.medium >= severityCounts.low
          ? 'medium'
          : 'low';
      
      grouped.push({
        category,
        title: instances[0].title,
        severity,
        studentCount: uniqueStudents.size,
        instances,
        commonTopics: uniqueTopics.slice(0, 3),
        suggestedRemedies: getRemediesForCategory(category),
      });
    });
    
    // Sort by student count (most common first)
    return grouped.sort((a, b) => b.studentCount - a.studentCount);
  }, [gradeData]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleGenerateGroupWorksheet = async (group: GroupedMisconception) => {
    setIsGeneratingWorksheet(true);
    setSelectedCategory(group.category);
    
    try {
      // Map topics to the correct format expected by the edge function
      const topics = group.commonTopics.map(t => {
        const instance = group.instances.find(i => i.topic === t);
        // Clean up topic name - remove any markdown or special chars
        const cleanTopicName = t.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        return {
          topicName: cleanTopicName,
          standard: instance?.standard || 'N/A',
          subject: 'Mathematics',
          category: group.category,
        };
      });
      
      // Ensure we have at least one topic
      if (topics.length === 0) {
        topics.push({
          topicName: group.category,
          standard: 'N/A',
          subject: 'Mathematics',
          category: group.category,
        });
      }
      
      console.log('Generating worksheet with topics:', topics);
      
      const response = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topics,
          questionCount: 8,
          difficultyLevels: group.severity === 'high' ? ['easy', 'medium'] : ['medium', 'hard'],
          includeHints: true,
          includeAnswerKey: true,
          worksheetMode: 'practice', // Use 'practice' mode - valid worksheet mode
        },
      });
      
      if (response.error) {
        console.error('Edge function error:', response.error);
        throw new Error(response.error.message || 'Failed to generate worksheet');
      }
      
      const questions = response.data?.questions || [];
      if (questions.length > 0) {
        setWorksheetQuestions(questions);
        setWorksheetTopicName(group.category);
        setShowWorksheetDialog(true);
        toast.success(`Generated ${questions.length} questions targeting ${group.category}`);
      } else {
        console.error('No questions in response:', response.data);
        throw new Error('No questions generated - please try again');
      }
    } catch (error: any) {
      console.error('Worksheet generation error:', error);
      toast.error(`Failed to generate worksheet: ${error.message}`);
    } finally {
      setIsGeneratingWorksheet(false);
      setSelectedCategory(null);
    }
  };

  const totalMisconceptions = groupedMisconceptions.reduce((sum, g) => sum + g.instances.length, 0);
  const totalStudentsAffected = new Set(
    groupedMisconceptions.flatMap(g => g.instances.map(i => i.studentId))
  ).size;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Class Misconception Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Class Misconception Summary
              </CardTitle>
              <CardDescription>
                Common errors across all students for targeted group instruction
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                <Users className="h-3 w-3 mr-1" />
                {totalStudentsAffected} students affected
              </Badge>
              <Badge variant="secondary" className="text-sm">
                {totalMisconceptions} misconceptions identified
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {groupedMisconceptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No misconceptions identified yet</p>
              <p className="text-sm">Scan and grade student work to identify common errors</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[800px]">
              <div className="space-y-4">
                {groupedMisconceptions.map((group) => (
                  <Collapsible
                    key={group.category}
                    open={expandedCategories.has(group.category)}
                    onOpenChange={() => toggleCategory(group.category)}
                  >
                    <Card className={cn(
                      "border-l-4",
                      group.severity === 'high' && 'border-l-red-500',
                      group.severity === 'medium' && 'border-l-yellow-500',
                      group.severity === 'low' && 'border-l-green-500'
                    )}>
                      <CollapsibleTrigger className="w-full">
                        <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              group.severity === 'high' && 'bg-red-100 dark:bg-red-950',
                              group.severity === 'medium' && 'bg-yellow-100 dark:bg-yellow-950',
                              group.severity === 'low' && 'bg-green-100 dark:bg-green-950'
                            )}>
                              <AlertTriangle className={cn(
                                "h-5 w-5",
                                group.severity === 'high' && 'text-red-600',
                                group.severity === 'medium' && 'text-yellow-600',
                                group.severity === 'low' && 'text-green-600'
                              )} />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold">{group.category}</p>
                              <p className="text-sm text-muted-foreground">{group.title}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">
                              <Users className="h-3 w-3 mr-1" />
                              {group.studentCount} students
                            </Badge>
                            <Badge 
                              className={cn(
                                'text-white',
                                group.severity === 'high' && 'bg-red-500',
                                group.severity === 'medium' && 'bg-yellow-500',
                                group.severity === 'low' && 'bg-green-500'
                              )}
                            >
                              {group.severity} priority
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateGroupWorksheet(group);
                              }}
                              disabled={isGeneratingWorksheet}
                            >
                              {isGeneratingWorksheet && selectedCategory === group.category ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <FileSpreadsheet className="h-3 w-3" />
                              )}
                              Group Worksheet
                            </Button>
                            {expandedCategories.has(group.category) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-4">
                          <Separator />
                          
                          {/* Remediation Strategies */}
                          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300 mb-2">
                              <Lightbulb className="h-4 w-4" />
                              Recommended Group Instruction Strategies
                            </div>
                            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {group.suggestedRemedies.map((remedy, idx) => (
                                <li key={idx} className="text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">•</span>
                                  {remedy}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {/* Common Topics */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">Common topics:</span>
                            {group.commonTopics.map((topic, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                          
                          {/* Student Instances */}
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">
                              Student-Specific Evidence ({group.instances.length} instances):
                            </p>
                            
                            {group.instances.slice(0, 10).map((instance, idx) => (
                              <div 
                                key={idx} 
                                className="p-3 border rounded-lg bg-muted/30 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{instance.studentName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {instance.topic}
                                    </Badge>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        'text-xs',
                                        instance.grade < 60 && 'border-red-300 text-red-600',
                                        instance.grade >= 60 && instance.grade < 80 && 'border-yellow-300 text-yellow-600',
                                        instance.grade >= 80 && 'border-green-300 text-green-600'
                                      )}
                                    >
                                      {instance.grade}%
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(instance.date), 'MMM d, yyyy')}
                                  </span>
                                </div>
                                
                                {/* What they did vs expected - actionable and specific */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="p-2 bg-red-50/70 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800">
                                    <div className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                                      <X className="h-3 w-3" />
                                      What Went Wrong
                                    </div>
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                      {instance.whatStudentDid}
                                    </p>
                                    {/* Show the quote inline as supporting evidence */}
                                    {instance.exactQuote && instance.exactQuote !== instance.whatStudentDid && (
                                      <p className="text-xs text-red-500/70 dark:text-red-400/70 italic mt-1 border-t border-red-200 dark:border-red-800 pt-1">
                                        Evidence: {instance.exactQuote.length > 80 ? instance.exactQuote.substring(0, 80) + '...' : instance.exactQuote}
                                      </p>
                                    )}
                                  </div>
                                  <div className="p-2 bg-emerald-50/70 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                                      <Target className="h-3 w-3" />
                                      Corrective Action
                                    </div>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                      {instance.whatWasExpected}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {group.instances.length > 10 && (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                + {group.instances.length - 10} more instances
                              </p>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Worksheet Dialog */}
      <PrintRemediationQuestionsDialog
        open={showWorksheetDialog}
        onOpenChange={setShowWorksheetDialog}
        questions={worksheetQuestions}
        studentName="Class Group"
        topicName={worksheetTopicName}
      />
    </>
  );
}
