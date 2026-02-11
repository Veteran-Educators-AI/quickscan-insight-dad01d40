import React from 'react';

// Centralized lazy-loading barrel for heavy scan components.
// Every cross-component import should go through this file
// to eliminate circular dependency TDZ crashes in production builds.

export const AnalysisResults = React.lazy(() => import('./AnalysisResults').then(m => ({ default: m.AnalysisResults })));
export const BatchImageZoomDialog = React.lazy(() => import('./BatchImageZoomDialog'));
export const StudentWorkDetailDialog = React.lazy(() => import('./StudentWorkDetailDialog'));
export const GradedPapersGallery = React.lazy(() => import('./GradedPapersGallery'));
export const MisconceptionComparison = React.lazy(() => import('./MisconceptionComparison'));
export const AIAnalysisCritiqueDialog = React.lazy(() => import('./AIAnalysisCritiqueDialog'));
export const AnnotationCanvas = React.lazy(() => import('./AnnotationCanvas'));
export const AnnotationToolbar = React.lazy(() => import('./AnnotationToolbar'));
export const HandwritingComparisonDialog = React.lazy(() => import('./HandwritingComparisonDialog'));
