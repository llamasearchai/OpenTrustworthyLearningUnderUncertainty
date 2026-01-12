/**
 * Main Application Component
 *
 * Root component that sets up routing, global layout, and providers.
 *
 * @module App
 */

import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import {
  LayoutDashboard,
  FolderKanban,
  Box,
  Shield,
  BrainCircuit,
  Settings as SettingsIcon,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { AuthProvider } from '@/contexts/AuthContext';
import { RequireAuth, RequireGuest } from '@/components/auth/RequireAuth';
import { UserMenu } from '@/components/layout/UserMenu';
import { MobileSidebar, MobileMenuButton } from '@/components/layout/MobileSidebar';
import { CommandPalette } from '@/components/common/CommandPalette';
import { RootErrorBoundary } from '@/components/error-boundaries';

// Lazy load pages for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Scenarios = React.lazy(() => import('./pages/Scenarios'));
const ScenarioDetail = React.lazy(() => import('./pages/ScenarioDetail'));
const Viewer = React.lazy(() => import('./pages/Viewer'));
const Safety = React.lazy(() => import('./pages/Safety'));
const ActiveLearning = React.lazy(() => import('./pages/ActiveLearning'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Login = React.lazy(() => import('./pages/Login'));
const Profile = React.lazy(() => import('./pages/Profile'));

// ============================================================================
// Navigation Items
// ============================================================================

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Scenarios', href: '/scenarios', icon: <FolderKanban className="h-5 w-5" /> },
  { label: '3D Viewer', href: '/viewer', icon: <Box className="h-5 w-5" /> },
  { label: 'Safety', href: '/safety', icon: <Shield className="h-5 w-5" /> },
  { label: 'Active Learning', href: '/active-learning', icon: <BrainCircuit className="h-5 w-5" /> },
];

const bottomNavItems = [
  { label: 'Settings', href: '/settings', icon: <SettingsIcon className="h-5 w-5" /> },
];

// ============================================================================
// Loading Fallback
// ============================================================================

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// ============================================================================
// 404 Page
// ============================================================================

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-24 h-24 mb-6 rounded-full bg-muted flex items-center justify-center">
        <span className="text-4xl font-bold text-muted-foreground">404</span>
      </div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <RouterNavLink
          to="/dashboard"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </RouterNavLink>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

function NotFoundRouteWrapper() {
  return <NotFoundPage />;
}



// ============================================================================
// Sidebar Component
// ============================================================================

function Sidebar() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300 hidden lg:block',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
      data-testid="sidebar"
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-4">
          <RouterNavLink to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
              <span className="text-sm font-bold">TLU</span>
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-semibold whitespace-nowrap">OpenTLU</span>
            )}
          </RouterNavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-2">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  collapsed
}: {
  item: { label: string; href: string; icon: React.ReactNode };
  collapsed: boolean;
}) {
  return (
    <RouterNavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )
      }
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </RouterNavLink>
  );
}

// ============================================================================
// Header Component
// ============================================================================

function Header() {
  const location = useLocation();

  // Get page title from current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/scenarios/')) return 'Scenario Details';
    if (path.startsWith('/viewer/')) return '3D Viewer';

    const item = [...navItems, ...bottomNavItems].find((i) => i.href === path);
    return item?.label || 'OpenTLU';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <MobileMenuButton />
        <h1 className="text-lg font-semibold lg:hidden">{getPageTitle()}</h1>
      </div>
      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
}

// ============================================================================
// Main Layout
// ============================================================================

function MainLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, resolvedTheme, setTheme, theme } = useUIStore();

  // Apply theme on mount and changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // Initialize theme from system preference if set to 'system'
  useEffect(() => {
    if (theme === 'system') {
      setTheme('system');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileSidebar items={[...navItems, ...bottomNavItems]} />

      <div
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        <Header />
        <main className="container py-6 px-4 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// Protected Route Wrapper
// ============================================================================

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <MainLayout>
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </MainLayout>
    </RequireAuth>
  );
}

// ============================================================================
// App Component
// ============================================================================

export default function App() {
  return (
    <RootErrorBoundary>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <CommandPalette />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <RequireGuest>
                  <Login />
                </RequireGuest>
              }
            />

            {/* Protected routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/scenarios"
              element={
                <ProtectedRoute>
                  <Scenarios />
                </ProtectedRoute>
              }
            />

            <Route
              path="/scenarios/:id"
              element={
                <ProtectedRoute>
                  <ScenarioDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/viewer"
              element={
                <ProtectedRoute>
                  <Viewer />
                </ProtectedRoute>
              }
            />

            <Route
              path="/viewer/:id"
              element={
                <ProtectedRoute>
                  <Viewer />
                </ProtectedRoute>
              }
            />

            <Route
              path="/safety"
              element={
                <ProtectedRoute>
                  <Safety />
                </ProtectedRoute>
              }
            />

            <Route
              path="/active-learning"
              element={
                <ProtectedRoute>
                  <ActiveLearning />
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
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* 404 Not Found */}
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <NotFoundRouteWrapper />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </RootErrorBoundary>
  );
}
