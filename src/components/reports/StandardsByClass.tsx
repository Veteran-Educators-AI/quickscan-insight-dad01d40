import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, ChevronRight, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StandardsByClassProps {
  classId?: string;
}

interface StandardEntry {
  standard: string;
  cleanStandard: string;
  topicName: string;
  cleanTopic: string;
  count: number;
  avgGrade: number;
  className: string;
  classId: string;
}

interface ClassGroup {
  classId: string;
  className: string;
  standards: StandardEntry[];
  avgGrade: number;
  totalEntries: number;
}

// Extract clean standard code from verbose text
function extractStandardCode(text: string): string {
  if (!text) return 'N/A';
  
  // Look for common standard patterns
  const patterns = [
    /\b([A-Z]-[A-Z]{2,4}\.[A-Z]\.\d+)\b/i,           // G-GMD.B.4
    /\b([A-Z]\.[A-Z]{2,4}\.[A-Z]\.\d+)\b/i,          // G.GMD.B.4
    /\b(CCSS\.MATH\.CONTENT\.[^,\s]+)/i,             // CCSS.MATH.CONTENT.xxx
    /\b(\d+\.[A-Z]{1,3}\.[A-Z]?\.\d+)\b/i,           // 8.SP.A.1
    /\b(NGPF\.\d+\.\d+)\b/i,                          // NGPF.3.16
    /\b([A-Z]{1,2}\.[A-Z]{1,4}\.\d+)\b/i,            // MP.4 or A.CED.1
    /\b([A-Z]-[A-Z]+\.\d+)\b/i,                      // G-CO.9
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  // Check for financial literacy keywords
  if (text.toLowerCase().includes('financial')) {
    if (text.toLowerCase().includes('interest')) return 'FIN.INT';
    if (text.toLowerCase().includes('credit')) return 'FIN.CRE';
    if (text.toLowerCase().includes('payment')) return 'FIN.PAY';
    return 'FIN.LIT';
  }

  return 'N/A';
}

// Extract clean topic name from verbose text
function extractTopicName(text: string, className?: string): string {
  if (!text) return 'Unknown Topic';

  // Check for specific topic keywords
  const topicKeywords: Record<string, string> = {
    'credit card': 'Credit Card Basics',
    'interest charge': 'Interest Charges',
    'minimum payment': 'Minimum Payments',
    'apr': 'Annual Percentage Rate (APR)',
    'annual fee': 'Annual Fees',
    'finance charge': 'Finance Charges',
    'composite figure': 'Area of Composite Figures',
    'composite area': 'Area of Composite Figures',
    'triangle area': 'Triangle Area',
    'circle area': 'Circle Area',
    'rectangle area': 'Rectangle Area',
    'volume': 'Volume',
    'surface area': 'Surface Area',
    'geometric': 'Geometric Concepts',
    'proof': 'Geometric Proofs',
    'congruent': 'Congruence',
    'similar': 'Similarity',
    'parallel lines': 'Parallel Lines',
    'perpendicular': 'Perpendicular Lines',
    'angle': 'Angles',
    'coordinate': 'Coordinate Geometry',
    'transformation': 'Transformations',
    'debt': 'Debt Management',
    'payoff': 'Loan Payoff',
    'balance': 'Account Balance',
  };

  const lowerText = text.toLowerCase();
  
  for (const [keyword, topic] of Object.entries(topicKeywords)) {
    if (lowerText.includes(keyword)) {
      return topic;
    }
  }

  // Try to extract from diagnostic worksheet pattern
  const worksheetMatch = text.match(/diagnostic worksheet[:\s]+["']?([^"'\n]+)["']?/i);
  if (worksheetMatch) {
    return worksheetMatch[1].trim().replace(/[*]+/g, '').trim();
  }

  // Get first meaningful sentence
  const sentences = text.split(/[.\n]/);
  if (sentences.length > 0) {
    const firstSentence = sentences[0].replace(/[*]+/g, '').trim();
    if (firstSentence.length > 10 && firstSentence.length < 60) {
      return firstSentence;
    }
  }

  return 'General Topic';
}

export function StandardsByClass({ classId }: StandardsByClassProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: classGroups, isLoading } = useQuery({
    queryKey: ['standards-by-class', user?.id, classId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('grade_history')
        .select(`
          id,
          topic_name,
          nys_standard,
          grade,
          student_id,
          students!inner(
            id,
            class_id,
            classes!inner(id, name, teacher_id)
          )
        `)
        .eq('students.classes.teacher_id', user.id);

      if (classId) {
        query = query.eq('students.class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by class and standard
      const classMap = new Map<string, ClassGroup>();

      data?.forEach((entry: any) => {
        const className = entry.students?.classes?.name || 'Unknown Class';
        const clsId = entry.students?.classes?.id || 'unknown';
        
        if (!classMap.has(clsId)) {
          classMap.set(clsId, {
            classId: clsId,
            className,
            standards: [],
            avgGrade: 0,
            totalEntries: 0,
          });
        }

        const classGroup = classMap.get(clsId)!;
        const cleanStandard = extractStandardCode(entry.nys_standard || '');
        const cleanTopic = extractTopicName(entry.topic_name || '', className);

        // Find existing standard entry or create new one
        let standardEntry = classGroup.standards.find(
          s => s.cleanStandard === cleanStandard && s.cleanTopic === cleanTopic
        );

        if (!standardEntry) {
          standardEntry = {
            standard: entry.nys_standard || '',
            cleanStandard,
            topicName: entry.topic_name || '',
            cleanTopic,
            count: 0,
            avgGrade: 0,
            className,
            classId: clsId,
          };
          classGroup.standards.push(standardEntry);
        }

        standardEntry.count += 1;
        standardEntry.avgGrade = (
          (standardEntry.avgGrade * (standardEntry.count - 1) + (entry.grade || 0)) / 
          standardEntry.count
        );
        classGroup.totalEntries += 1;
      });

      // Calculate class averages
      classMap.forEach(classGroup => {
        if (classGroup.standards.length > 0) {
          classGroup.avgGrade = Math.round(
            classGroup.standards.reduce((sum, s) => sum + s.avgGrade, 0) / classGroup.standards.length
          );
        }
      });

      return Array.from(classMap.values()).sort((a, b) => 
        a.className.localeCompare(b.className)
      );
    },
    enabled: !!user,
  });

  const handleViewTopicWork = (topicCleanName: string, standardCode: string) => {
    // Navigate to the same page with search params for the gradebook to filter
    const params = new URLSearchParams();
    params.set('topic', topicCleanName);
    params.set('search', standardCode !== 'N/A' ? standardCode : topicCleanName);
    navigate(`/reports?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standards by Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!classGroups || classGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Standards by Class
          </CardTitle>
          <CardDescription>View analyzed work organized by class and standard</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No analyzed work found. Scan student work to see standards breakdown.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Standards by Class
        </CardTitle>
        <CardDescription>
          Click on a topic to view all analyzed work for that standard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {classGroups.map((classGroup) => (
            <AccordionItem key={classGroup.classId} value={classGroup.classId}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{classGroup.className}</span>
                    <Badge variant="secondary">
                      {classGroup.standards.length} topics
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      classGroup.avgGrade >= 70 ? "text-emerald-600" : "text-orange-600"
                    )}>
                      {Math.round(classGroup.avgGrade)}% avg
                    </span>
                    {classGroup.avgGrade >= 70 ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pl-4">
                  {classGroup.standards
                    .sort((a, b) => b.count - a.count)
                    .map((standard, idx) => (
                      <Button
                        key={`${standard.cleanStandard}-${idx}`}
                        variant="ghost"
                        className="w-full justify-between h-auto py-3 px-4 hover:bg-muted/50"
                        onClick={() => handleViewTopicWork(
                          standard.cleanTopic, 
                          standard.cleanStandard
                        )}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {standard.cleanStandard}
                            </Badge>
                            <span className="font-medium text-sm">
                              {standard.cleanTopic}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {standard.count} {standard.count === 1 ? 'entry' : 'entries'} · 
                            {' '}{Math.round(standard.avgGrade)}% average
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Button>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
