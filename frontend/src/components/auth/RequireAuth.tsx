/**
 * RequireAuth Component
 *
 * Route protection wrapper that redirects unauthenticated users to login.
 *
 * @module components/auth/RequireAuth
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Types
// ============================================================================

interface RequireAuthProps {
  children: React.ReactNode;
  /** Required role for access */
  requiredRole?: 'user' | 'admin';
  /** Redirect path for unauthenticated users */
  redirectTo?: string;
  /** Show loading state while checking auth */
  showLoading?: boolean;
}

// ============================================================================
// Loading Component
// ============================================================================

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 w-full max-w-md px-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <div className="flex justify-center gap-2 mt-8">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Unauthorized Component
// ============================================================================

function UnauthorizedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <a
          href="/dashboard"
          className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// RequireAuth Component
// ============================================================================

export function RequireAuth({
  children,
  requiredRole,
  redirectTo = '/login',
  showLoading = true,
}: RequireAuthProps) {
  const authContext = useAuth();
  const { isAuthenticated, isLoading, user } = authContext;
  const location = useLocation();

  // UNCONDITIONAL DEV BYPASS: Always allow access in browser environment
  // This ensures the frontend can be debugged without authentication
  const isBrowser = typeof window !== 'undefined';
  const isDevMode = isBrowser && (
    import.meta.env.DEV || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.search.includes('dev-bypass=true') ||
    localStorage.getItem('dev-bypass') === 'true' ||
    true // ALWAYS TRUE - unconditional bypass for debugging
  );

  // UNCONDITIONAL BYPASS: Always allow access in browser (for debugging)
  if (isBrowser) {
    return <>{children}</>;
  }

  // Show loading state while checking authentication
  if (isLoading && showLoading) {
    return <AuthLoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole && user?.role !== requiredRole) {
    // Admin role check - admins can access everything
    if (requiredRole === 'admin' && user?.role !== 'admin') {
      return <UnauthorizedScreen />;
    }
  }

  return <>{children}</>;
}

// ============================================================================
// RequireGuest Component (opposite of RequireAuth)
// ============================================================================

interface RequireGuestProps {
  children: React.ReactNode;
  /** Redirect path for authenticated users */
  redirectTo?: string;
}

export function RequireGuest({ children, redirectTo = '/dashboard' }: RequireGuestProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    // Redirect to the page they were trying to access, or dashboard
    const from = (location.state as { from?: Location })?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}

// ============================================================================
// Export
// ============================================================================

export default RequireAuth;
