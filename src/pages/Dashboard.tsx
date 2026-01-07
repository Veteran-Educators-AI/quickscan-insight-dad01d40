import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  ClipboardList, 
  Camera, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Plus,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface DashboardStats {
  classCount: number;
  studentCount: number;
  questionCount: number;
  recentAttempts: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    classCount: 0,
    studentCount: 0,
    questionCount: 0,
    recentAttempts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      try {
        // Fetch class count
        const { count: classCount } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true });

        // Fetch question count
        const { count: questionCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true });

        // Fetch student count across all classes
        const { data: classes } = await supabase
          .from('classes')
          .select('id');

        let studentCount = 0;
        if (classes && classes.length > 0) {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .in('class_id', classes.map(c => c.id));
          studentCount = count || 0;
        }

        setStats({
          classCount: classCount || 0,
          studentCount,
          questionCount: questionCount || 0,
          recentAttempts: 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user]);

  const quickActions = [
    { label: 'Create Class', href: '/classes/new', icon: Users, color: 'bg-primary/10 text-primary' },
    { label: 'New Assessment', href: '/questions', icon: ClipboardList, color: 'bg-accent/10 text-accent' },
    { label: 'Start Scanning', href: '/scan', icon: Camera, color: 'bg-warning/10 text-warning' },
    { label: 'View Reports', href: '/reports', icon: BarChart3, color: 'bg-success/10 text-success' },
  ];

  const statCards = [
    { label: 'Classes', value: stats.classCount, icon: Users, href: '/classes' },
    { label: 'Students', value: stats.studentCount, icon: Users, href: '/classes' },
    { label: 'Questions', value: stats.questionCount, icon: ClipboardList, href: '/questions' },
    { label: 'Scans Today', value: stats.recentAttempts, icon: Camera, href: '/reports' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome back!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your geometry assessments.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href}>
                <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    <div className={`p-3 rounded-xl ${action.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="font-medium text-sm">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} to={stat.href}>
                <Card 
                  className="hover:shadow-md transition-all duration-200 cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {loading ? '—' : stat.value}
                        </p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </div>
                      <Icon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest scans and assessments</CardDescription>
              </div>
              <Link to="/reports">
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recentAttempts === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No scans yet</p>
                  <p className="text-sm">Start by scanning student work</p>
                  <Link to="/scan" className="mt-4 inline-block">
                    <Button variant="outline" size="sm">
                      <Camera className="h-4 w-4 mr-2" />
                      Start Scanning
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground">Recent scans will appear here</p>
              )}
            </CardContent>
          </Card>

          {/* Topic Mastery Overview */}
          <Card className="animate-slide-up" style={{ animationDelay: '150ms' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Topic Mastery</CardTitle>
                <CardDescription>Class performance by topic</CardDescription>
              </div>
              <Link to="/reports">
                <Button variant="ghost" size="sm">
                  Details <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats.classCount === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No data yet</p>
                  <p className="text-sm">Create a class and add students to see mastery data</p>
                  <Link to="/classes/new" className="mt-4 inline-block">
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Class
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground">Mastery data will appear here</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        {stats.classCount === 0 && (
          <Card className="border-primary/20 bg-primary/5 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
                  <span><strong>Create a class</strong> and add your students (manual or CSV import)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
                  <span><strong>Add JMAP questions</strong> to your question bank with rubrics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">3</span>
                  <span><strong>Create an assessment</strong> and generate printable packets with QR codes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">4</span>
                  <span><strong>Scan student work</strong> to get instant diagnostics and misconception tags</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
