import { useState } from 'react';
import { Calendar, ChevronDown, ChevronRight, BookOpen, Target, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GEOMETRY_PACING_CALENDAR, type PacingUnit } from '@/data/geometryPacingCalendar';

interface GeometryPacingCalendarProps {
  onSelectUnit?: (unit: PacingUnit) => void;
}

export function GeometryPacingCalendar({ onSelectUnit }: GeometryPacingCalendarProps) {
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set());
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);

  const toggleUnit = (unitNumber: number) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitNumber)) {
        next.delete(unitNumber);
      } else {
        next.add(unitNumber);
      }
      return next;
    });
  };

  // Filter out omitted units for display
  const activeUnits = GEOMETRY_PACING_CALENDAR.filter(u => u.dateRange !== "Omitted");

  return (
    <Card className="border-2 border-indigo-200 dark:border-indigo-800 mb-4">
      <Collapsible open={isCalendarExpanded} onOpenChange={setIsCalendarExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 bg-indigo-50 dark:bg-indigo-950/30 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-lg">2025-2026 Geometry Pacing Calendar</CardTitle>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                  MGS21/MGS22
                </Badge>
              </div>
              {isCalendarExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-4">
            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-2">
                {activeUnits.map((unit) => {
                  const isExpanded = expandedUnits.has(unit.unitNumber);

                  return (
                    <Collapsible
                      key={unit.unitNumber}
                      open={isExpanded}
                      onOpenChange={() => toggleUnit(unit.unitNumber)}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-3 rounded-lg border bg-card hover:bg-muted/50 transition-all text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                                {unit.unitNumber}
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{unit.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                    {unit.dateRange}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {unit.lessons.length} lessons
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-2 ml-11 space-y-3">
                        {/* Lessons */}
                        <div className="p-3 rounded-md border bg-muted/30">
                          <h5 className="font-medium text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            Lessons
                          </h5>
                          <ul className="space-y-1">
                            {unit.lessons.map((lesson, idx) => (
                              <li key={idx} className="text-xs text-foreground/80 pl-2 border-l-2 border-indigo-200 dark:border-indigo-700">
                                {lesson}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Standards */}
                        {unit.standards.length > 0 && (
                          <div className="p-3 rounded-md border bg-muted/30">
                            <h5 className="font-medium text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Standards
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {unit.standards.map((std, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs font-mono">
                                  {std}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* JMAP Topics */}
                        {unit.jmapTopics && unit.jmapTopics.length > 0 && (
                          <div className="p-3 rounded-md border bg-muted/30">
                            <h5 className="font-medium text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              JMAP Regents Topics
                            </h5>
                            <div className="space-y-1">
                              {unit.jmapTopics.map((topic, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-foreground/80">{topic.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    pp. {topic.pages}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {unit.notes && (
                          <p className="text-xs text-muted-foreground italic px-3">
                            📝 {unit.notes}
                          </p>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => onSelectUnit?.(unit)}
                        >
                          Generate Worksheets for Unit {unit.unitNumber}
                        </Button>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Resources: Big Ideas Math (NY Edition) & JMAP Regents
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
