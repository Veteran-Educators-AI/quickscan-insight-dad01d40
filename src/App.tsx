import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { WhatsNewDialog } from "@/components/WhatsNewDialog";

import { useDeepLinks } from "./hooks/useDeepLinks";
import Login from "./pages/Login";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import ClassNew from "./pages/ClassNew";
import ClassDetail from "./pages/ClassDetail";
import Questions from "./pages/Questions";
import QuestionNew from "./pages/QuestionNew";
import Scan from "./pages/Scan";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import ResetPassword from "./pages/ResetPassword";
import SharedWorksheet from "./pages/SharedWorksheet";
import StudentResults from "./pages/StudentResults";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  
  // Handle deep links from Capacitor native wrapper
  useDeepLinks();

  // Handle SPA redirect from 404.html fallback
  React.useEffect(() => {
    const redirectPath = sessionStorage.getItem('redirect_path');
    if (redirectPath && redirectPath !== '/') {
      sessionStorage.removeItem('redirect_path');
      window.history.replaceState(null, '', redirectPath);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
      <Route path="/classes/new" element={<ProtectedRoute><ClassNew /></ProtectedRoute>} />
      <Route path="/classes/:id" element={<ProtectedRoute><ClassDetail /></ProtectedRoute>} />
      <Route path="/questions" element={<ProtectedRoute><Questions /></ProtectedRoute>} />
      <Route path="/questions/new" element={<ProtectedRoute><QuestionNew /></ProtectedRoute>} />
      <Route path="/assessments" element={<Navigate to="/questions" replace />} />
      <Route path="/assessments/*" element={<Navigate to="/questions" replace />} />
      <Route path="/assessment" element={<Navigate to="/questions" replace />} />
      <Route path="/assessment/*" element={<Navigate to="/questions" replace />} />
      <Route path="/scan" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/worksheet/:shareCode" element={<SharedWorksheet />} />
      <Route path="/results/:studentId/:questionId" element={<StudentResults />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <OnboardingTour />
          <WhatsNewDialog />
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
