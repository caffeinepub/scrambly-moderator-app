import React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Shield, Heart, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useIsCallerAdmin, useGetCallerUserProfile } from '../hooks/useQueries';
import { Badge } from '@/components/ui/badge';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: userProfile } = useGetCallerUserProfile();
  const navigate = useNavigate();

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img
              src="/assets/generated/scrambly-mod-logo.dim_256x256.png"
              alt="Scrambly Mod Logo"
              className="h-9 w-9 rounded-lg object-cover"
            />
            <div>
              <span className="font-display font-bold text-lg text-foreground tracking-tight">
                Scrambly
              </span>
              <span className="ml-1.5 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">
                MOD
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {isAuthenticated && !isAdmin && (
              <>
                <Link to="/moderator">
                  {({ isActive }) => (
                    <Button variant={isActive ? 'secondary' : 'ghost'} size="sm" className="gap-1.5">
                      <Shield className="h-4 w-4" />
                      Mod Dashboard
                    </Button>
                  )}
                </Link>
                <Link to="/status">
                  {({ isActive }) => (
                    <Button variant={isActive ? 'secondary' : 'ghost'} size="sm">
                      My Status
                    </Button>
                  )}
                </Link>
              </>
            )}

            {isAdmin && (
              <>
                <Link to="/admin">
                  {({ isActive }) => (
                    <Button variant={isActive ? 'secondary' : 'ghost'} size="sm" className="gap-1.5">
                      <Shield className="h-4 w-4" />
                      Admin Panel
                    </Button>
                  )}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-warning-custom hover:text-warning-custom"
                  onClick={() => navigate({ to: '/admin', hash: 'reports' })}
                >
                  Reports
                </Button>
              </>
            )}

            {/* Settings link — authenticated users only */}
            {isAuthenticated && (
              <Link to="/settings">
                {({ isActive }) => (
                  <Button variant={isActive ? 'secondary' : 'ghost'} size="sm" className="gap-1.5">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                )}
              </Link>
            )}
          </nav>

          {/* Auth area */}
          <div className="flex items-center gap-3">
            {isAuthenticated && userProfile && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-foreground">{userProfile.name}</span>
                {isAdmin && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    Admin
                  </Badge>
                )}
              </div>
            )}
            <Button
              onClick={handleAuth}
              disabled={isLoggingIn}
              variant={isAuthenticated ? 'outline' : 'default'}
              size="sm"
              className="gap-2"
            >
              {isLoggingIn ? 'Logging in...' : isAuthenticated ? 'Logout' : 'Login'}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-border px-4 py-2 flex gap-1 overflow-x-auto">
          {isAuthenticated && !isAdmin && (
            <>
              <Link to="/moderator">
                {({ isActive }) => (
                  <Button variant={isActive ? 'secondary' : 'ghost'} size="sm" className="shrink-0 text-xs">
                    Mod Dashboard
                  </Button>
                )}
              </Link>
              <Link to="/status">
                {({ isActive }) => (
                  <Button variant={isActive ? 'secondary' : 'ghost'} size="sm" className="shrink-0 text-xs">
                    My Status
                  </Button>
                )}
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link to="/admin">
                {({ isActive }) => (
                  <Button variant={isActive ? 'secondary' : 'ghost'} size="sm" className="shrink-0 text-xs">
                    Admin Panel
                  </Button>
                )}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-xs text-warning-custom hover:text-warning-custom"
                onClick={() => navigate({ to: '/admin', hash: 'reports' })}
              >
                Reports
              </Button>
            </>
          )}
          {/* Settings link mobile — authenticated users only */}
          {isAuthenticated && (
            <Link to="/settings">
              {({ isActive }) => (
                <Button variant={isActive ? 'secondary' : 'ghost'} size="sm" className="shrink-0 text-xs gap-1">
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </Button>
              )}
            </Link>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-primary" />
              <span>Scrambly Moderation Platform</span>
              <span className="text-border">·</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Built with{' '}
              <Heart className="w-3.5 h-3.5 fill-destructive text-destructive" />{' '}
              using{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                  typeof window !== 'undefined' ? window.location.hostname : 'scrambly-mod'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
