import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Flag,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useGetUser,
  useGetUserWarnings,
  useSubmitAppeal,
  useReportModerator,
  useGetAllModerators,
} from '../hooks/useQueries';
import { toast } from 'sonner';

export default function UserStatus() {
  const { identity } = useInternetIdentity();
  const userId = identity?.getPrincipal().toString() ?? null;

  const { data: user, isLoading: userLoading, refetch: refetchUser } = useGetUser(userId);
  const { data: warnings = [], isLoading: warningsLoading } = useGetUserWarnings(userId);
  const { data: moderators = [] } = useGetAllModerators();

  const [appealText, setAppealText] = useState('');
  const [reportModeratorId, setReportModeratorId] = useState('');
  const [reportReason, setReportReason] = useState('');

  const submitAppeal = useSubmitAppeal();
  const reportModerator = useReportModerator();

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !appealText.trim()) return;
    if (appealText.trim().length < 20) {
      toast.error('Appeal must be at least 20 characters long.');
      return;
    }
    try {
      await submitAppeal.mutateAsync({ userId, appealText: appealText.trim() });
      toast.success('Appeal submitted successfully.');
      setAppealText('');
      refetchUser();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit appeal.');
    }
  };

  const handleReportModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModeratorId || !reportReason.trim()) return;
    if (reportReason.trim().length < 30) {
      toast.error('Report reason must be at least 30 characters long.');
      return;
    }
    try {
      await reportModerator.mutateAsync({ moderatorId: reportModeratorId, reason: reportReason.trim() });
      toast.success('Moderator reported. The admin will review your report.');
      setReportModeratorId('');
      setReportReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit report.');
    }
  };

  const appealStatusConfig = {
    none: { label: 'No Appeal', icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted/20' },
    pending: { label: 'Pending Review', icon: Clock, color: 'text-warning-custom', bg: 'bg-warning/10' },
    reviewed: { label: 'Reviewed', icon: CheckCircle, color: 'text-muted-foreground', bg: 'bg-muted/20' },
  };

  const hasWarnings = warnings.length > 0 || (user && Number(user.warningCount) > 0);
  const canSubmitAppeal = user?.isBanned && user?.banAppealStatus === 'none';
  const hasPendingAppeal = user?.banAppealStatus === 'pending';

  if (!userId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="font-display text-xl font-semibold text-foreground mb-2">Not Logged In</h2>
        <p className="text-muted-foreground">Please log in to view your status.</p>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="font-display text-xl font-semibold text-foreground mb-2">No Account Found</h2>
        <p className="text-muted-foreground text-sm">
          Your principal ID is not registered in the system. Contact a moderator or admin.
        </p>
        <p className="text-xs text-muted-foreground font-mono mt-3 bg-secondary/50 px-3 py-2 rounded-md inline-block">
          {userId}
        </p>
      </div>
    );
  }

  const appealStatus = appealStatusConfig[user.banAppealStatus as keyof typeof appealStatusConfig] || appealStatusConfig.none;
  const AppealIcon = appealStatus.icon;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Account: <span className="font-mono text-xs">{userId.slice(0, 30)}...</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetchUser()} className="gap-1.5 text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Account Status */}
      <Card className={`border ${user.isBanned ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            {user.isBanned ? (
              <XCircle className="w-5 h-5 text-destructive" />
            ) : (
              <CheckCircle className="w-5 h-5 text-positive" />
            )}
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              user.isBanned ? 'bg-destructive/20 text-destructive' : 'bg-positive/20 text-positive'
            }`}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-foreground">{user.username}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant={user.isBanned ? 'destructive' : 'default'}
                  className={`text-xs ${!user.isBanned ? 'bg-positive/20 text-positive border-positive/30' : ''}`}
                >
                  {user.isBanned ? 'Banned' : user.status === 'warned' ? 'Warned' : 'Active'}
                </Badge>
                {Number(user.warningCount) > 0 && (
                  <Badge variant="outline" className="text-xs border-warning/40 text-warning-custom">
                    {Number(user.warningCount)} warning{Number(user.warningCount) !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {user.isBanned && user.banReason && (
            <Alert variant="destructive" className="border-destructive/40">
              <XCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Ban Reason:</strong> {user.banReason}
              </AlertDescription>
            </Alert>
          )}

          {/* Appeal Status */}
          {user.isBanned && user.banAppealStatus !== 'none' && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${appealStatus.bg} border border-border`}>
              <AppealIcon className={`w-4 h-4 ${appealStatus.color}`} />
              <div>
                <p className={`text-sm font-medium ${appealStatus.color}`}>Appeal: {appealStatus.label}</p>
                {user.banAppealStatus === 'reviewed' && (
                  <p className="text-xs text-muted-foreground">Your appeal has been reviewed by the admin.</p>
                )}
              </div>
            </div>
          )}

          {/* Admin Appeal Response */}
          {user.adminAppealResponse && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Admin Response to your appeal:</p>
              <p className="text-sm text-foreground">{user.adminAppealResponse}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Appeal */}
      {canSubmitAppeal && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Submit Ban Appeal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Explain why you believe your ban was unfair. Be detailed and honest. Minimum 20 characters.
            </p>
            <form onSubmit={handleSubmitAppeal} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Appeal Message</Label>
                <Textarea
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="Explain your situation in detail (minimum 20 characters)..."
                  className="bg-input border-border min-h-[120px] resize-none text-sm"
                />
                <p className={`text-xs ${appealText.length < 20 ? 'text-muted-foreground' : 'text-positive'}`}>
                  {appealText.length}/20 minimum characters
                </p>
              </div>
              <Button
                type="submit"
                disabled={submitAppeal.isPending || appealText.trim().length < 20}
                className="gap-2"
              >
                {submitAppeal.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Submit Appeal
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {hasPendingAppeal && (
        <Alert className="border-warning/40 bg-warning/5">
          <Clock className="w-4 h-4 text-warning-custom" />
          <AlertDescription className="text-warning-custom">
            Your appeal is pending review by the admin. Please wait for a decision.
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings History */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-custom" />
            Warning History
            {warnings.length > 0 && (
              <Badge variant="outline" className="text-xs border-warning/40 text-warning-custom ml-1">
                {warnings.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warningsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : warnings.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="w-7 h-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No warnings on record</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2 pr-2">
                {warnings.map((warning) => {
                  const date = new Date(Number(warning.timestamp) / 1_000_000);
                  return (
                    <div key={warning.id} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-warning-custom shrink-0" />
                          <span className="text-xs font-medium text-warning-custom">Warning #{warning.id}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {date.toLocaleDateString()} {date.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{warning.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Issued by moderator: <span className="font-mono">{warning.issuedByModeratorId.slice(0, 20)}...</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Report a Moderator */}
      {hasWarnings && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Flag className="w-5 h-5 text-destructive" />
              Report a Moderator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 border-border bg-secondary/30">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <AlertDescription className="text-sm text-muted-foreground">
                Only report a moderator if you received an unfair warning. False reports may result in consequences.
                The admin will review your report. Minimum 30 characters required.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleReportModerator} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Select Moderator</Label>
                <Select value={reportModeratorId} onValueChange={setReportModeratorId}>
                  <SelectTrigger className="bg-input border-border text-sm h-9">
                    <SelectValue placeholder="Choose a moderator..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {moderators.filter((m) => m.status === 'active').map((mod) => (
                      <SelectItem key={mod.id} value={mod.id} className="text-sm">
                        {mod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Reason for Report</Label>
                <Textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe why the warning was unfair (minimum 30 characters)..."
                  className="bg-input border-border min-h-[100px] resize-none text-sm"
                />
                <p className={`text-xs ${reportReason.length < 30 ? 'text-muted-foreground' : 'text-positive'}`}>
                  {reportReason.length}/30 minimum characters
                </p>
              </div>

              <Button
                type="submit"
                variant="destructive"
                disabled={reportModerator.isPending || !reportModeratorId || reportReason.trim().length < 30}
                className="gap-2"
              >
                {reportModerator.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Flag className="w-4 h-4" />
                )}
                Submit Report
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
