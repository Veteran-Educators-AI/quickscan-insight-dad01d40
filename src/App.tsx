import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { StudentNameProvider } from "@/lib/StudentNameContext";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { DemoTour } from "@/components/onboarding/DemoTour";
import { WhatsNewDialog } from "@/components/WhatsNewDialog";
import { useMfaStatus } from "@/hooks/useMfaStatus";
import { shouldShowSchoolSelector } from "@/lib/schoolBranding";

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
import FeatureDocumentation from "./pages/FeatureDocumentation";
import ResetPassword from "./pages/ResetPassword";
import SharedWorksheet from "./pages/SharedWorksheet";
import StudentResults from "./pages/StudentResults";
import MfaChallenge from "./pages/MfaChallenge";
import MfaEnroll from "./pages/MfaEnroll";
import NotFound from "./pages/NotFound";
import StudentLogin from "./pages/StudentLogin";
import StudentJoinClass from "./pages/StudentJoinClass";
import StudentQuickJoin from "./pages/StudentQuickJoin";
import StudentMagicCallback from "./pages/StudentMagicCallback";
import StudentDashboard from "./pages/StudentDashboard";
import StudentLiveSession from "./pages/StudentLiveSession";
import PresentationView from "./pages/PresentationView";
import PresentationLibrary from "./pages/PresentationLibrary";
import TeacherLibrary from "./pages/TeacherLibrary";
import SchoolSelector from "./pages/SchoolSelector";
import SimpleMode from "./pages/SimpleMode";
import SimpleModeResponse from "./pages/SimpleModeResponse";
import { BetaFeedbackButton } from "./components/BetaFeedbackButton";

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-600 mb-4">{this.state.error?.message}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.history.back();
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Go Back
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { status: mfaStatus, isLoading: mfaLoading } = useMfaStatus();

  if (loading || mfaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only require MFA verification if user has already enrolled
  // 2FA is now optional - users won't be forced to enroll
  if (mfaStatus === 'needs_verification') {
    return <Navigate to="/mfa-challenge" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  useDeepLinks();

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

  // Check if school selector should be shown for new visitors
  const showSchoolSelector = !user && shouldShowSchoolSelector();

  return (
    <Routes>
      <Route path="/select-school" element={<SchoolSelector />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/mfa-challenge" element={user ? <MfaChallenge /> : <Navigate to="/login" replace />} />
      <Route path="/mfa-enroll" element={user ? <MfaEnroll /> : <Navigate to="/login" replace />} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : (showSchoolSelector ? "/select-school" : "/login")} replace />} />
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
      <Route path="/documentation" element={<ProtectedRoute><FeatureDocumentation /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/worksheet/:shareCode" element={<SharedWorksheet />} />
      <Route path="/results/:studentId/:questionId" element={<StudentResults />} />
      {/* Student routes */}
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student/join" element={<StudentJoinClass />} />
      <Route path="/student/quick-join" element={<StudentQuickJoin />} />
      <Route path="/student/magic-callback" element={<StudentMagicCallback />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/live" element={<StudentLiveSession />} />
      {/* Presentation routes */}
      <Route path="/presentation" element={<PresentationView />} />
      <Route path="/presentation/library" element={<ProtectedRoute><PresentationLibrary /></ProtectedRoute>} />
      {/* Teacher Library */}
      <Route path="/library" element={<ProtectedRoute><TeacherLibrary /></ProtectedRoute>} />
      {/* Simple Mode */}
      <Route path="/simple-mode" element={<ProtectedRoute><SimpleMode /></ProtectedRoute>} />
      <Route path="/simple-mode/respond" element={<SimpleModeResponse />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StudentNameProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <OnboardingTour />
              <DemoTour />
              <WhatsNewDialog />
              <BetaFeedbackButton />
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </StudentNameProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
