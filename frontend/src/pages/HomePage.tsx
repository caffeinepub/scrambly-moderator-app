import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Shield, Users, AlertTriangle, CheckCircle, LogIn, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useIsCallerAdmin, useGetCallerUserRole, UserRole } from '../hooks/useQueries';
import ModeratorApplicationModal from '../components/ModeratorApplicationModal';

export default function HomePage() {
  const { identity, login, loginStatus } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: userRole } = useGetCallerUserRole();
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  // Show Apply Now only for authenticated non-admin regular users
  const isRegularUser = isAuthenticated && !isAdmin && userRole === UserRole.user;

  const features = [
    {
      icon: Shield,
      title: 'Moderator Dashboard',
      description: 'Issue warnings, ban users for misconduct, and instantly ban for pornographic content.',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: AlertTriangle,
      title: 'Report System',
      description: 'Users can report moderators for unfair warnings. Admin reviews and takes action.',
      color: 'text-warning-custom',
      bg: 'bg-warning/10',
    },
    {
      icon: CheckCircle,
      title: 'Appeal Process',
      description: 'Banned users can submit appeals. Admin reviews and approves or denies them.',
      color: 'text-positive',
      bg: 'bg-positive/10',
    },
    {
      icon: Users,
      title: 'Admin Control',
      description: 'Full oversight of moderators and users. Ban moderators who abuse their power.',
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16 animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img
              src="/assets/generated/scrambly-mod-logo.dim_256x256.png"
              alt="Scrambly Mod"
              className="w-24 h-24 rounded-2xl object-cover shadow-card"
            />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
          Scrambly{' '}
          <span className="text-primary">Moderation</span>{' '}
          Platform
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          A powerful, fair moderation system. Moderators keep communities safe.
          Users have rights. Admins ensure accountability.
        </p>

        {!isAuthenticated ? (
          <Button
            onClick={login}
            disabled={isLoggingIn}
            size="lg"
            className="gap-2 px-8"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {isLoggingIn ? 'Logging in...' : 'Login to Continue'}
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-3">
              {isAdmin && (
                <Button asChild size="lg" className="gap-2">
                  <Link to="/admin">
                    <Shield className="w-5 h-5" />
                    Admin Panel
                  </Link>
                </Button>
              )}
              {!isAdmin && (
                <>
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/moderator">
                      <Shield className="w-5 h-5" />
                      Mod Dashboard
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="gap-2">
                    <Link to="/status">
                      <Users className="w-5 h-5" />
                      My Status
                    </Link>
                  </Button>
                </>
              )}
            </div>

            {/* Apply Now section — only for regular users */}
            {isRegularUser && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 px-8 border border-primary/30 hover:border-primary/60 transition-colors"
                  onClick={() => setApplyModalOpen(true)}
                >
                  <UserPlus className="w-5 h-5" />
                  Apply Now
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map(({ icon: Icon, title, description, color, bg }) => (
          <Card key={title} className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role info */}
      <div className="mt-12 p-6 rounded-xl border border-border bg-card">
        <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">👤 Users</p>
            <p>View your status, warnings, and submit ban appeals. Report moderators for unfair treatment.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">🛡️ Moderators</p>
            <p>Issue warnings and bans for misconduct. Instant ban for pornographic content. Cannot act if banned.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">⚙️ Admin (Jourdain Rodriguez)</p>
            <p>Full oversight. Review appeals, resolve moderator reports, and ban moderators who abuse power.</p>
          </div>
        </div>
      </div>

      {/* Moderator Application Modal */}
      <ModeratorApplicationModal
        open={applyModalOpen}
        onOpenChange={setApplyModalOpen}
      />
    </div>
  );
}
