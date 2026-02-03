import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { IssueProvider } from "@/contexts/FeedbackContext"; // Changed from FeedbackProvider
import { TrainingProvider } from "@/contexts/TrainingContext";

import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import ReportIssue from "./pages/ReportIssue";
import History from "./pages/History";
import IssueDetail from "./pages/FeedbackDetail"; // Changed from FeedbackDetail
import Settings from "./pages/Settings";
import Training from "./pages/Training";
import TrainingDetail from "./pages/TrainingDetail";
import EditProfile from "./pages/EditProfile";
import Tutorial from "./pages/Tutorial";
import NotFound from "./pages/NotFound";
import TrainingPlayer from './pages/TrainingPlayer';
import TrainingFeedback from './pages/TrainingFeedback';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && hasCompletedOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (hasCompletedOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <Onboarding />
          </OnboardingRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <ReportIssue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      
      {/* NEW: Main issue detail route */}
      <Route
        path="/issues/:id"
        element={
          <ProtectedRoute>
            <IssueDetail />
          </ProtectedRoute>
        }
      />
      
      {/* BACKWARD COMPATIBILITY: Keep old /feedback/:id route redirecting to new path */}
      <Route
        path="/feedback/:id"
        element={<Navigate to="/issues/:id" replace />}
      />
      
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <Training />
          </ProtectedRoute>
        }
      />

      {/* Route for the Demo Player */}
      <Route
        path="/training/demo-module"
        element={
          <ProtectedRoute>
            <TrainingPlayer />
          </ProtectedRoute>
        }
      />

      {/* ✅ MOVE THIS BEFORE /training/:id */}
      <Route
        path="/training/:id/feedback"
        element={
          <ProtectedRoute>
            <TrainingFeedback />
          </ProtectedRoute>
        }
      />

      {/* ✅ This should come LAST among training routes */}
      <Route
        path="/training/:id"
        element={
          <ProtectedRoute>
            <TrainingDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/edit-profile"
        element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tutorial"
        element={
          <ProtectedRoute>
            <Tutorial />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <IssueProvider> {/* Changed from FeedbackProvider */}
            <TrainingProvider>
              <AppRoutes />
            </TrainingProvider>
          </IssueProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
