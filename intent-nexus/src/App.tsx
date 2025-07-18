
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DjangoAuthProvider, useDjangoAuth } from "@/contexts/DjangoAuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        if (error?.message?.includes('Authentication required')) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Loading component
const LoadingScreen = ({ message }: { message?: string }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="text-white text-xl mb-4">
        {message || "Loading..."}
      </div>
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
    </div>
  </div>
);

// Error component
const ErrorScreen = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="text-red-400 text-xl mb-4">Connection Error</div>
      <div className="text-white text-sm mb-6">{error}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Retry Connection
        </button>
      )}
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, error } = useDjangoAuth();

  console.log('ProtectedRoute - user:', user, 'loading:', loading, 'error:', error);

  if (loading) {
    return <LoadingScreen message="Authenticating..." />;
  }

  if (error && !user) {
    return <ErrorScreen error={error} onRetry={() => window.location.reload()} />;
  }

  if (!user) {
    console.log('No user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Public Route Component
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, error } = useDjangoAuth();

  console.log('PublicRoute - user:', user, 'loading:', loading, 'error:', error);

  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  if (user) {
    console.log('User exists, redirecting to /');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DjangoAuthProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route
                  path="/auth"
                  element={
                    <PublicRoute>
                      <Auth />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
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
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </DjangoAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
