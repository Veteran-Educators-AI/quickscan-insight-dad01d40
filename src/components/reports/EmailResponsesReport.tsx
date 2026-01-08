import { useState } from 'react';
import { Mail, CheckCircle, Clock, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useStudentNames } from '@/lib/StudentNameContext';

interface EmailResponsesReportProps {
  classId?: string;
}

interface EmailAttempt {
  id: string;
  status: string;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  };
  question: {
    id: string;
    jmap_id: string | null;
    prompt_text: string | null;
  };
}

export function EmailResponsesReport({ classId }: EmailResponsesReportProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const { getDisplayName } = useStudentNames();

  const { data: emailAttempts, isLoading } = useQuery({
    queryKey: ['email-responses', classId],
    queryFn: async () => {
      let query = supabase
        .from('attempts')
        .select(`
          id,
          status,
          qr_code,
          created_at,
          updated_at,
          student:students!inner(id, first_name, last_name, email, class_id),
          question:questions!inner(id, jmap_id, prompt_text)
        `)
        .like('qr_code', 'email_answer:%')
        .order('updated_at', { ascending: false });

      if (classId) {
        query = query.eq('student.class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EmailAttempt[];
    },
  });

  const { data: pendingAttempts } = useQuery({
    queryKey: ['pending-email-attempts', classId],
    queryFn: async () => {
      let query = supabase
        .from('attempts')
        .select(`
          id,
          status,
          qr_code,
          created_at,
          updated_at,
          student:students!inner(id, first_name, last_name, email, class_id),
          question:questions!inner(id, jmap_id, prompt_text)
        `)
        .eq('status', 'pending')
        .is('qr_code', null)
        .order('created_at', { ascending: false });

      if (classId) {
        query = query.eq('student.class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EmailAttempt[];
    },
  });

  // Group by question
  const groupedByQuestion = (emailAttempts || []).reduce((acc, attempt) => {
    const qId = attempt.question.id;
    if (!acc[qId]) {
      acc[qId] = {
        question: attempt.question,
        responses: [],
      };
    }
    acc[qId].responses.push(attempt);
    return acc;
  }, {} as Record<string, { question: EmailAttempt['question']; responses: EmailAttempt[] }>);

  const toggleQuestion = (qId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const extractAnswer = (qrCode: string | null): string => {
    if (!qrCode) return '-';
    const match = qrCode.match(/^email_answer:(.+)$/);
    return match ? match[1] : '-';
  };

  const totalResponses = emailAttempts?.length || 0;
  const pendingCount = pendingAttempts?.length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Responses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Responses
        </CardTitle>
        <CardDescription>
          Track student responses to emailed questions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{totalResponses}</p>
              <p className="text-sm text-muted-foreground">Responses</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Mail className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{Object.keys(groupedByQuestion).length}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </div>
          </div>
        </div>

        {totalResponses === 0 && pendingCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No emailed questions yet</p>
            <p className="text-sm">Send questions to students via email to see responses here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Responses by Question */}
            {Object.entries(groupedByQuestion).map(([qId, { question, responses }]) => (
              <Collapsible
                key={qId}
                open={expandedQuestions.has(qId)}
                onOpenChange={() => toggleQuestion(qId)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 text-left">
                      {expandedQuestions.has(qId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div>
                        <p className="font-medium">
                          {question.jmap_id || question.prompt_text?.slice(0, 40) || 'Question'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {responses.length} response{responses.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{responses.length}</Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-8 mt-2 space-y-2">
                    {responses.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <div>
                            <p className="font-medium text-sm">
                              {getDisplayName(attempt.student.id, attempt.student.first_name, attempt.student.last_name)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="font-mono text-lg px-3">
                            {extractAnswer(attempt.qr_code)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(attempt.updated_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

            {/* Pending Section */}
            {pendingCount > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Awaiting Response ({pendingCount})
                </h4>
                <div className="space-y-2">
                  {pendingAttempts?.slice(0, 5).map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <div>
                          <p className="font-medium text-sm">
                            {getDisplayName(attempt.student.id, attempt.student.first_name, attempt.student.last_name)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {attempt.question.jmap_id || 'Question'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Sent {format(new Date(attempt.created_at), 'MMM d')}
                      </span>
                    </div>
                  ))}
                  {pendingCount > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{pendingCount - 5} more pending
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
