import React, { useState } from 'react';
import { Shield, Search, AlertTriangle, Ban, Zap, Loader2, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useGetAllUsers,
  useIssueWarning,
  useBanUser,
  useInstantBanUser,
} from '../hooks/useQueries';
import { type User } from '../backend';
import { toast } from 'sonner';

type ActionType = 'warn' | 'ban' | null;

interface UserActionFormProps {
  user: User;
  action: ActionType;
  onClose: () => void;
  disabled: boolean;
}

function UserActionForm({ user, action, onClose, disabled }: UserActionFormProps) {
  const [reason, setReason] = useState('');
  const issueWarning = useIssueWarning();
  const banUser = useBanUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      if (action === 'warn') {
        await issueWarning.mutateAsync({ userId: user.id, reason: reason.trim() });
        toast.success(`Warning issued to ${user.username}.`);
      } else if (action === 'ban') {
        await banUser.mutateAsync({ userId: user.id, reason: reason.trim() });
        toast.success(`${user.username} has been banned.`);
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.');
    }
  };

  const isPending = issueWarning.isPending || banUser.isPending;
  const isWarn = action === 'warn';

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 p-3 rounded-lg bg-background/50 border border-border">
      <Label className="text-xs font-medium">
        {isWarn ? 'Warning reason' : 'Ban reason'} <span className="text-destructive">*</span>
      </Label>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={isWarn ? 'Describe the inappropriate behavior...' : 'Reason for ban...'}
        className="bg-input border-border text-sm min-h-[80px] resize-none"
        disabled={disabled || isPending}
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          variant={isWarn ? 'outline' : 'destructive'}
          disabled={disabled || isPending || !reason.trim()}
          className={`gap-1.5 ${isWarn ? 'border-warning/50 text-warning-custom hover:bg-warning/10' : ''}`}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isWarn ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : (
            <Ban className="w-3.5 h-3.5" />
          )}
          {isWarn ? 'Issue Warning' : 'Confirm Ban'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface UserRowProps {
  user: User;
  moderatorBanned: boolean;
}

function UserRow({ user, moderatorBanned }: UserRowProps) {
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const instantBan = useInstantBanUser();

  const handleInstantBan = async () => {
    try {
      await instantBan.mutateAsync(user.id);
      toast.success(`${user.username} has been instantly banned for pornographic content.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Instant ban failed.');
    }
  };

  const toggleAction = (action: ActionType) => {
    setActiveAction((prev) => (prev === action ? null : action));
  };

  const statusConfig = {
    active: { label: 'Active', variant: 'default' as const, className: 'bg-positive/20 text-positive border-positive/30' },
    warned: { label: 'Warned', variant: 'outline' as const, className: 'border-warning/50 text-warning-custom' },
    banned: { label: 'Banned', variant: 'destructive' as const, className: '' },
  };

  const status = statusConfig[user.status as keyof typeof statusConfig] || statusConfig.active;
  const isBanned = user.isBanned;

  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      isBanned ? 'bg-destructive/5 border-destructive/20' : 'bg-secondary/30 border-border hover:border-border/80'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
            isBanned ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
          }`}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-foreground text-sm">{user.username}</p>
              <Badge variant={status.variant} className={`text-xs ${status.className}`}>
                {status.label}
              </Badge>
              {Number(user.warningCount) > 0 && (
                <Badge variant="outline" className="text-xs border-warning/40 text-warning-custom">
                  {Number(user.warningCount)} warning{Number(user.warningCount) !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate">{user.id.slice(0, 30)}...</p>
            {isBanned && user.banReason && (
              <p className="text-xs text-destructive mt-0.5">Banned: {user.banReason}</p>
            )}
          </div>
        </div>

        {!isBanned && (
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleAction('warn')}
              disabled={moderatorBanned}
              className={`gap-1.5 text-xs h-8 ${
                activeAction === 'warn'
                  ? 'border-warning/70 bg-warning/10 text-warning-custom'
                  : 'border-warning/40 text-warning-custom hover:bg-warning/10'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Warn
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleAction('ban')}
              disabled={moderatorBanned}
              className={`gap-1.5 text-xs h-8 ${
                activeAction === 'ban'
                  ? 'border-destructive/70 bg-destructive/10 text-destructive'
                  : 'border-destructive/40 text-destructive hover:bg-destructive/10'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              Ban
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleInstantBan}
              disabled={moderatorBanned || instantBan.isPending}
              className="gap-1.5 text-xs h-8 glow-destructive"
            >
              {instantBan.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Instant Ban
            </Button>
          </div>
        )}
      </div>

      {activeAction && !isBanned && (
        <UserActionForm
          user={user}
          action={activeAction}
          onClose={() => setActiveAction(null)}
          disabled={moderatorBanned}
        />
      )}
    </div>
  );
}

export default function ModeratorDashboard() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'warned' | 'banned'>('all');
  const { data: users = [], isLoading, refetch } = useGetAllUsers();

  // Note: moderator banned status is checked via the backend when actions are called
  // We show the dashboard but actions will fail if moderator is banned
  const moderatorBanned = false; // Backend enforces this; UI shows warning if needed

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || u.status === filter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: users.length,
    active: users.filter((u) => u.status === 'active').length,
    warned: users.filter((u) => u.status === 'warned').length,
    banned: users.filter((u) => u.isBanned).length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Moderator Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage users and enforce community guidelines</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { label: 'Total Users', value: counts.all, color: 'text-foreground' },
            { label: 'Active', value: counts.active, color: 'text-positive' },
            { label: 'Warned', value: counts.warned, color: 'text-warning-custom' },
            { label: 'Banned', value: counts.banned, color: 'text-destructive' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Suspended notice */}
      {moderatorBanned && (
        <Alert variant="destructive" className="mb-6">
          <Ban className="w-4 h-4" />
          <AlertDescription>
            Your moderator account has been suspended. You cannot perform any moderation actions.
          </AlertDescription>
        </Alert>
      )}

      {/* Guidelines */}
      <Alert className="mb-6 border-primary/30 bg-primary/5">
        <Shield className="w-4 h-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong className="text-foreground">Moderation Guidelines:</strong>{' '}
          <span className="text-muted-foreground">
            Issue warnings for disrespectful or unkind behavior. Ban users for repeated violations.
            Use <strong className="text-destructive">Instant Ban</strong> only for pornographic content — this takes effect immediately.
          </span>
        </AlertDescription>
      </Alert>

      {/* User List */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              User List
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-muted-foreground self-start sm:self-auto">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username or ID..."
                className="pl-9 bg-input border-border text-sm h-9"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'active', 'warned', 'banned'] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                  className={`text-xs h-9 capitalize ${
                    filter !== f ? 'border-border text-muted-foreground' : ''
                  }`}
                >
                  {f} ({counts[f]})
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{search ? 'No users match your search' : 'No users found'}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-2 pr-2">
                {filteredUsers.map((user) => (
                  <UserRow key={user.id} user={user} moderatorBanned={moderatorBanned} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
