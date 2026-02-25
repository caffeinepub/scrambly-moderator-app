import React from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import Layout from './components/Layout';
import ProfileSetupModal from './components/ProfileSetupModal';
import FloatingMusicPlayer from './components/FloatingMusicPlayer';
import HomePage from './pages/HomePage';
import AdminPanel from './pages/AdminPanel';
import ModeratorDashboard from './pages/ModeratorDashboard';
import UserStatus from './pages/UserStatus';
import SettingsPage from './pages/SettingsPage';
import AccessDenied from './pages/AccessDenied';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useIsCallerAdmin } from './hooks/useQueries';
import { useGetCallerUserProfile } from './hooks/useQueries';

// Root layout component
function RootLayout() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  return (
    <Layout>
      <ProfileSetupModal open={showProfileSetup} />
      <FloatingMusicPlayer />
      <Outlet />
    </Layout>
  );
}

// Admin guard component
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { identity } = useInternetIdentity();
  const { data: isAdmin, isLoading } = useIsCallerAdmin();

  if (!identity) return <AccessDenied />;
  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAdmin) return <AccessDenied />;
  return <>{children}</>;
}

// Moderator guard component
function ModeratorGuard({ children }: { children: React.ReactNode }) {
  const { identity } = useInternetIdentity();

  if (!identity) return <AccessDenied />;
  return <>{children}</>;
}

// Auth guard component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { identity } = useInternetIdentity();
  if (!identity) return <AccessDenied />;
  return <>{children}</>;
}

// Routes
const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => (
    <AdminGuard>
      <AdminPanel />
    </AdminGuard>
  ),
});

const moderatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moderator',
  component: () => (
    <ModeratorGuard>
      <ModeratorDashboard />
    </ModeratorGuard>
  ),
});

const statusRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/status',
  component: () => (
    <AuthGuard>
      <UserStatus />
    </AuthGuard>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: () => (
    <AuthGuard>
      <SettingsPage />
    </AuthGuard>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  adminRoute,
  moderatorRoute,
  statusRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
