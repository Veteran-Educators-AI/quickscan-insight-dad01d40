import { useState, useCallback } from 'react';
import type { Annotation } from '@/components/scan/AnnotationCanvas';
import type { AnnotationTool, AnnotationColor } from '@/components/scan/AnnotationToolbar';

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('circle');
  const [activeColor, setActiveColor] = useState<AnnotationColor>('red');

  const addAnnotation = useCallback((annotation: Annotation) => {
    setHistory(prev => [...prev, annotations]);
    setAnnotations(prev => [...prev, annotation]);
    setSelectedId(annotation.id);
  }, [annotations]);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setHistory(prev => [...prev, annotations]);
    setAnnotations(prev => 
      prev.map(a => a.id === id ? { ...a, ...updates } : a)
    );
  }, [annotations]);

  const deleteAnnotation = useCallback((id: string) => {
    setHistory(prev => [...prev, annotations]);
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  }, [annotations, selectedId]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setAnnotations(lastState);
    setSelectedId(null);
  }, [history]);

  const clearAll = useCallback(() => {
    if (annotations.length === 0) return;
    setHistory(prev => [...prev, annotations]);
    setAnnotations([]);
    setSelectedId(null);
  }, [annotations]);

  const resetAnnotations = useCallback(() => {
    setAnnotations([]);
    setHistory([]);
    setSelectedId(null);
  }, []);

  const loadAnnotations = useCallback((loaded: Annotation[]) => {
    setAnnotations(loaded);
    setHistory([]);
    setSelectedId(null);
  }, []);

  return {
    annotations,
    selectedId,
    activeTool,
    activeColor,
    canUndo: history.length > 0,
    setSelectedId,
    setActiveTool,
    setActiveColor,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    undo,
    clearAll,
    resetAnnotations,
    loadAnnotations,
  };
}
