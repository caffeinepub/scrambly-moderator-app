import React, { useState } from 'react';
import { Shield, Users, AlertTriangle, CheckCircle, XCircle, Ban, UserPlus, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useGetAllModerators,
  useGetModeratorReports,
  useGetPendingAppeals,
  useResolveModeratorReport,
  useReviewAppeal,
  useAddModerator,
  useAddUser,
} from '../hooks/useQueries';
import { Variant_deny_approve, type Moderator, type ModeratorReport, type User } from '../backend';
import { toast } from 'sonner';

function ModeratorCard({ moderator }: { moderator: Moderator }) {
  const [banning, setBanning] = useState(false);
  const addModerator = useAddModerator();

  const isBanned = moderator.status === 'banned';

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
          isBanned ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
        }`}>
          {moderator.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">{moderator.name}</p>
          <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{moderator.id}</p>
          {isBanned && moderator.banReason && (
            <p className="text-xs text-destructive mt-0.5">Reason: {moderator.banReason}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={isBanned ? 'destructive' : 'default'} className="text-xs">
          {isBanned ? 'Banned' : 'Active'}
        </Badge>
      </div>
    </div>
  );
}

function ReportCard({ report, moderatorName }: { report: ModeratorReport; moderatorName: string }) {
  const resolve = useResolveModeratorReport();

  const handleResolve = async (banModerator: boolean) => {
    try {
      await resolve.mutateAsync({ reportId: report.id, banModerator });
      toast.success(banModerator ? 'Moderator banned and report resolved.' : 'Report dismissed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve report.');
    }
  };

  const date = new Date(Number(report.timestamp) / 1_000_000);

  return (
    <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            Report against: <span className="text-primary">{moderatorName}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            By user: <span className="font-mono">{report.reportedByUserId.slice(0, 20)}...</span>
          </p>
          <p className="text-xs text-muted-foreground">{date.toLocaleDateString()} {date.toLocaleTimeString()}</p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">Pending</Badge>
      </div>
      <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded-md border border-border">
        {report.reason}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleResolve(true)}
          disabled={resolve.isPending}
          className="gap-1.5"
        >
          {resolve.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
          Ban Moderator
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleResolve(false)}
          disabled={resolve.isPending}
          className="gap-1.5 border-positive/50 text-positive hover:bg-positive/10"
        >
          {resolve.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function AppealCard({ user }: { user: User }) {
  const reviewAppeal = useReviewAppeal();

  const handleReview = async (decision: Variant_deny_approve) => {
    try {
      await reviewAppeal.mutateAsync({ userId: user.id, decision });
      toast.success(decision === Variant_deny_approve.approve ? 'Appeal approved. User unbanned.' : 'Appeal denied.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to review appeal.');
    }
  };

  return (
    <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            User: <span className="text-primary">{user.username}</span>
          </p>
          <p className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 30)}...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ban reason: <span className="text-destructive">{user.banReason}</span>
          </p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0 border-warning/50 text-warning-custom">
          Pending Appeal
        </Badge>
      </div>
      <div className="bg-background/50 p-3 rounded-md border border-border">
        <p className="text-xs text-muted-foreground mb-1 font-medium">Appeal text:</p>
        <p className="text-sm text-foreground">{user.banAppealText}</p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => handleReview(Variant_deny_approve.approve)}
          disabled={reviewAppeal.isPending}
          className="gap-1.5 bg-positive/20 text-positive hover:bg-positive/30 border border-positive/30"
          variant="outline"
        >
          {reviewAppeal.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleReview(Variant_deny_approve.deny)}
          disabled={reviewAppeal.isPending}
          className="gap-1.5"
        >
          {reviewAppeal.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
          Deny
        </Button>
      </div>
    </div>
  );
}

function AddModeratorForm() {
  const [principal, setPrincipal] = useState('');
  const [name, setName] = useState('');
  const addModerator = useAddModerator();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principal.trim() || !name.trim()) return;
    try {
      await addModerator.mutateAsync({ principal: principal.trim(), name: name.trim() });
      toast.success(`Moderator "${name}" added successfully.`);
      setPrincipal('');
      setName('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add moderator.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-border">
      <p className="text-sm font-medium text-foreground flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-primary" />
        Add New Moderator
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Principal ID</Label>
          <Input
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="aaaaa-bbbbb-..."
            className="bg-input border-border text-sm h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Moderator name"
            className="bg-input border-border text-sm h-9"
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={addModerator.isPending || !principal.trim() || !name.trim()} className="gap-2">
        {addModerator.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
        Add Moderator
      </Button>
    </form>
  );
}

function AddUserForm() {
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const addUser = useAddUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !username.trim()) return;
    try {
      await addUser.mutateAsync({ userId: userId.trim(), username: username.trim() });
      toast.success(`User "${username}" added successfully.`);
      setUserId('');
      setUsername('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add user.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-border">
      <p className="text-sm font-medium text-foreground flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-primary" />
        Add New User
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">User ID (Principal)</Label>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="aaaaa-bbbbb-..."
            className="bg-input border-border text-sm h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Username</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="bg-input border-border text-sm h-9"
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={addUser.isPending || !userId.trim() || !username.trim()} className="gap-2">
        {addUser.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
        Add User
      </Button>
    </form>
  );
}

export default function AdminPanel() {
  const { data: moderators = [], isLoading: modsLoading, refetch: refetchMods } = useGetAllModerators();
  const { data: reports = [], isLoading: reportsLoading, refetch: refetchReports } = useGetModeratorReports();
  const { data: appeals = [], isLoading: appealsLoading, refetch: refetchAppeals } = useGetPendingAppeals();

  const moderatorMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    moderators.forEach((m) => { map[m.id] = m.name; });
    return map;
  }, [moderators]);

  const activeMods = moderators.filter((m) => m.status === 'active');
  const bannedMods = moderators.filter((m) => m.status === 'banned');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Full moderation oversight — Jourdain Rodriguez</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { label: 'Total Moderators', value: moderators.length, color: 'text-primary', icon: Shield },
            { label: 'Active Mods', value: activeMods.length, color: 'text-positive', icon: CheckCircle },
            { label: 'Pending Reports', value: reports.length, color: 'text-warning-custom', icon: AlertTriangle },
            { label: 'Pending Appeals', value: appeals.length, color: 'text-destructive', icon: Users },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Tabs defaultValue="moderators" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="moderators" className="gap-2 data-[state=active]:bg-card">
            <Shield className="w-4 h-4" />
            Moderators
            {moderators.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{moderators.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-card">
            <AlertTriangle className="w-4 h-4" />
            Reports
            {reports.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">{reports.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="appeals" className="gap-2 data-[state=active]:bg-card">
            <CheckCircle className="w-4 h-4" />
            Appeals
            {appeals.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0 border-warning/50 text-warning-custom">{appeals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2 data-[state=active]:bg-card">
            <UserPlus className="w-4 h-4" />
            Manage
          </TabsTrigger>
        </TabsList>

        {/* Moderators Tab */}
        <TabsContent value="moderators" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base">All Moderators</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => refetchMods()} className="gap-1.5 text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {modsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : moderators.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No moderators yet</p>
                </div>
              ) : (
                <>
                  {activeMods.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Active ({activeMods.length})</p>
                      <div className="space-y-2">
                        {activeMods.map((mod) => <ModeratorCard key={mod.id} moderator={mod} />)}
                      </div>
                    </div>
                  )}
                  {bannedMods.length > 0 && (
                    <div>
                      <Separator className="my-3" />
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Banned ({bannedMods.length})</p>
                      <div className="space-y-2">
                        {bannedMods.map((mod) => <ModeratorCard key={mod.id} moderator={mod} />)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base">Pending Moderator Reports</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => refetchReports()} className="gap-1.5 text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No pending reports</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-3 pr-2">
                    {reports.map((report) => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        moderatorName={moderatorMap[report.reportedModeratorId] || report.reportedModeratorId}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appeals Tab */}
        <TabsContent value="appeals" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base">Pending Ban Appeals</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => refetchAppeals()} className="gap-1.5 text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {appealsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : appeals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No pending appeals</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-3 pr-2">
                    {appeals.map((user) => (
                      <AppealCard key={user.id} user={user} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Manage Users & Moderators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddModeratorForm />
              <Separator />
              <AddUserForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
