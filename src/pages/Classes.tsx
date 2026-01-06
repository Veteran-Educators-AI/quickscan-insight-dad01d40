import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Copy, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { EditClassDialog } from '@/components/classes/EditClassDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClassWithStudentCount {
  id: string;
  name: string;
  join_code: string;
  school_year: string | null;
  class_period: string | null;
  created_at: string;
  student_count: number;
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassWithStudentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    try {
      const { data: classesData, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch student counts for each class
      const classesWithCounts = await Promise.all(
        (classesData || []).map(async (cls) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);
          return { ...cls, student_count: count || 0 };
        })
      );

      setClasses(classesWithCounts);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const copyJoinCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: 'Copied!',
      description: 'Join code copied to clipboard',
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Classes</h1>
            <p className="text-muted-foreground">Manage your classes and students</p>
          </div>
          <Link to="/classes/new">
            <Button variant="hero">
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          </Link>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium text-lg mb-2">No classes yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first class to get started
              </p>
              <Link to="/classes/new">
                <Button variant="hero">
                  <Plus className="h-4 w-4" />
                  Create Class
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Card key={cls.id} className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <Link to={`/classes/${cls.id}`} className="hover:underline flex-1">
                      {cls.name}
                    </Link>
                    <div className="flex items-center gap-1">
                      <EditClassDialog
                        classId={cls.id}
                        currentName={cls.name}
                        currentPeriod={cls.class_period}
                        currentYear={cls.school_year}
                        onUpdate={fetchClasses}
                      />
                      <Link to={`/classes/${cls.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </div>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {cls.school_year || 'No year set'}
                    {cls.class_period && (
                      <Badge variant="secondary" className="text-xs">
                        {cls.class_period}
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {cls.student_count} student{cls.student_count !== 1 ? 's' : ''}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        copyJoinCode(cls.join_code);
                      }}
                    >
                      {copiedCode === cls.join_code ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {cls.join_code}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
