import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FeedbackProvider } from "@/contexts/FeedbackContext";
import { TrainingProvider } from "@/contexts/TrainingContext";

import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import ReportIssue from "./pages/ReportIssue";
import History from "./pages/History";
import FeedbackDetail from "./pages/FeedbackDetail";
import Settings from "./pages/Settings";
import Training from "./pages/Training";
import TrainingDetail from "./pages/TrainingDetail";
import EditProfile from "./pages/EditProfile";
import Tutorial from "./pages/Tutorial";
import NotFound from "./pages/NotFound";
import TrainingPlayer from './pages/TrainingPlayer';
import TrainingFeedback from './pages/TrainingFeedback'; // ✅ Import Added

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
      <Route
        path="/feedback/:id"
        element={
          <ProtectedRoute>
            <FeedbackDetail />
          </ProtectedRoute>
        }
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

      {/* ✅ NEW ROUTE: Training Feedback / Rating Page */}
      <Route
        path="/training/feedback/:id"
        element={
          <ProtectedRoute>
            <TrainingFeedback />
          </ProtectedRoute>
        }
      />

      {/* Existing Training Detail Route */}
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
          <FeedbackProvider>
            <TrainingProvider>
              <AppRoutes />
            </TrainingProvider>
          </FeedbackProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;