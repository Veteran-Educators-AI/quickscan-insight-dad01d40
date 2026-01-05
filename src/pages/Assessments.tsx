import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Assessments() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Assessments</h1>
            <p className="text-muted-foreground">Create and manage quick assessments</p>
          </div>
          <Button variant="hero"><Plus className="h-4 w-4" /> Create Assessment</Button>
        </div>
        <Card className="text-center py-12">
          <CardContent>
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium text-lg mb-2">No assessments yet</h3>
            <p className="text-muted-foreground mb-4">Create an assessment from your question bank</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
