import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Principal } from '@dfinity/principal';
import { Shield, Users, AlertTriangle, FileText, ChevronDown, ChevronUp, Loader2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useGetAllUsers,
  useGetAllModerators,
  useGetModeratorReports,
  useResolveModeratorReport,
  useReviewAppeal,
  useAddModerator,
  useAddUser,
  useGetModeratorApplications,
  useRespondToModeratorReport,
  useRespondToAppeal,
  useRespondToModeratorApplication,
  Variant_deny_approve,
} from '../hooks/useQueries';
import { Variant_active_banned_warned, Variant_pending_none_reviewed } from '../backend';

export default function AdminPanel() {
  const navigate = useNavigate();

  // Data queries
  const { data: users = [], isLoading: usersLoading } = useGetAllUsers();
  const { data: moderators = [], isLoading: moderatorsLoading } = useGetAllModerators();
  const { data: reports = [], isLoading: reportsLoading } = useGetModeratorReports();
  const { data: applications = [], isLoading: applicationsLoading } = useGetModeratorApplications();

  // Mutations
  const resolveReport = useResolveModeratorReport();
  const reviewAppeal = useReviewAppeal();
  const addModerator = useAddModerator();
  const addUser = useAddUser();
  const respondToReport = useRespondToModeratorReport();
  const respondToAppeal = useRespondToAppeal();
  const respondToApplication = useRespondToModeratorApplication();

  // Form state
  const [newModeratorPrincipal, setNewModeratorPrincipal] = useState('');
  const [newModeratorName, setNewModeratorName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newUsername, setNewUsername] = useState('');

  // Response form state - tracks which item has the response form open
  const [reportResponseOpen, setReportResponseOpen] = useState<string | null>(null);
  const [reportResponseText, setReportResponseText] = useState<Record<string, string>>({});

  const [appealResponseOpen, setAppealResponseOpen] = useState<string | null>(null);
  const [appealResponseText, setAppealResponseText] = useState<Record<string, string>>({});

  const [applicationResponseOpen, setApplicationResponseOpen] = useState<string | null>(null);
  const [applicationResponseText, setApplicationResponseText] = useState<Record<string, string>>({});

  // Pending appeals
  const pendingAppeals = users.filter(
    (u) => u.banAppealStatus === Variant_pending_none_reviewed.pending
  );

  const handleAddModerator = async () => {
    if (!newModeratorPrincipal || !newModeratorName) return;
    try {
      const principal = Principal.fromText(newModeratorPrincipal);
      await addModerator.mutateAsync({ principal, name: newModeratorName });
      setNewModeratorPrincipal('');
      setNewModeratorName('');
    } catch (e: any) {
      // toast handled in hook
    }
  };

  const handleAddUser = async () => {
    if (!newUserId || !newUsername) return;
    await addUser.mutateAsync({ userId: newUserId, username: newUsername });
    setNewUserId('');
    setNewUsername('');
  };

  const handleSubmitReportResponse = async (reportId: string) => {
    const text = reportResponseText[reportId] || '';
    if (!text.trim()) return;
    await respondToReport.mutateAsync({ reportId: BigInt(reportId), response: text });
    setReportResponseOpen(null);
    setReportResponseText((prev) => ({ ...prev, [reportId]: '' }));
  };

  const handleSubmitAppealResponse = async (userId: string) => {
    const text = appealResponseText[userId] || '';
    if (!text.trim()) return;
    try {
      const principal = Principal.fromText(userId);
      await respondToAppeal.mutateAsync({ userId: principal, response: text });
      setAppealResponseOpen(null);
      setAppealResponseText((prev) => ({ ...prev, [userId]: '' }));
    } catch (e: any) {
      // toast handled in hook
    }
  };

  const handleSubmitApplicationResponse = async (applicationId: string) => {
    const text = applicationResponseText[applicationId] || '';
    if (!text.trim()) return;
    await respondToApplication.mutateAsync({ applicationId: BigInt(applicationId), response: text });
    setApplicationResponseOpen(null);
    setApplicationResponseText((prev) => ({ ...prev, [applicationId]: '' }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, moderators, and platform safety</p>
        </div>
      </div>

      <Tabs defaultValue="moderators" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="moderators">
            <Shield className="h-4 w-4 mr-1" />
            Moderators
          </TabsTrigger>
          <TabsTrigger value="reports">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="appeals">
            <FileText className="h-4 w-4 mr-1" />
            Appeals
          </TabsTrigger>
          <TabsTrigger value="applications">
            <ClipboardList className="h-4 w-4 mr-1" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-1" />
            Users
          </TabsTrigger>
        </TabsList>

        {/* ── Moderators Tab ── */}
        <TabsContent value="moderators" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Moderator</CardTitle>
              <CardDescription>Grant moderator access to a principal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mod-principal">Principal ID</Label>
                  <Input
                    id="mod-principal"
                    placeholder="Enter principal ID"
                    value={newModeratorPrincipal}
                    onChange={(e) => setNewModeratorPrincipal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mod-name">Name</Label>
                  <Input
                    id="mod-name"
                    placeholder="Enter moderator name"
                    value={newModeratorName}
                    onChange={(e) => setNewModeratorName(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleAddModerator}
                disabled={addModerator.isPending || !newModeratorPrincipal || !newModeratorName}
              >
                {addModerator.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Moderator
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Moderators</CardTitle>
              <CardDescription>{moderators.length} moderator(s) registered</CardDescription>
            </CardHeader>
            <CardContent>
              {moderatorsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading moderators...
                </div>
              ) : moderators.length === 0 ? (
                <p className="text-muted-foreground">No moderators yet.</p>
              ) : (
                <div className="space-y-3">
                  {moderators.map((mod) => (
                    <div key={mod.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <div>
                        <p className="font-medium text-foreground">{mod.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{mod.id}</p>
                      </div>
                      <Badge variant={mod.status === 'active' ? 'default' : 'destructive'}>
                        {mod.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reports Tab ── */}
        <TabsContent value="reports" className="space-y-4" id="reports">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-foreground">Moderator Reports</h2>
            <Badge variant="outline">{reports.length} pending</Badge>
          </div>

          {reportsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending moderator reports.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="border-border">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">Report #{report.id}</Badge>
                          <Badge variant={report.status === 'pending' ? 'secondary' : 'default'}>
                            {report.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">
                          <span className="font-medium">Moderator:</span> {report.reportedModeratorId}
                        </p>
                        <p className="text-sm text-foreground">
                          <span className="font-medium">Reported by:</span> {report.reportedByUserId}
                        </p>
                        <p className="text-sm text-muted-foreground">{report.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(Number(report.timestamp) / 1_000_000).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => resolveReport.mutate({ reportId: report.id, banModerator: true })}
                          disabled={resolveReport.isPending}
                        >
                          {resolveReport.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          Ban Moderator
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveReport.mutate({ reportId: report.id, banModerator: false })}
                          disabled={resolveReport.isPending}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>

                    {/* Admin Response Display */}
                    {report.adminResponse && (
                      <div className="mt-2 p-3 rounded-md bg-muted border border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Admin Response:</p>
                        <p className="text-sm text-foreground">{report.adminResponse}</p>
                      </div>
                    )}

                    {/* Response Form Toggle */}
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1"
                        onClick={() =>
                          setReportResponseOpen(reportResponseOpen === report.id ? null : report.id)
                        }
                      >
                        {reportResponseOpen === report.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        Type your response
                      </Button>

                      {reportResponseOpen === report.id && (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            placeholder="Type your admin response here..."
                            value={reportResponseText[report.id] || ''}
                            onChange={(e) =>
                              setReportResponseText((prev) => ({ ...prev, [report.id]: e.target.value }))
                            }
                            rows={3}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitReportResponse(report.id)}
                              disabled={respondToReport.isPending || !reportResponseText[report.id]?.trim()}
                            >
                              {respondToReport.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              Submit Response
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setReportResponseOpen(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Appeals Tab ── */}
        <TabsContent value="appeals" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-foreground">Ban Appeals</h2>
            <Badge variant="outline">{pendingAppeals.length} pending</Badge>
          </div>

          {usersLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading appeals...
            </div>
          ) : pendingAppeals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending ban appeals.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingAppeals.map((user) => (
                <Card key={user.id} className="border-border">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{user.username}</p>
                          <Badge variant="destructive">Banned</Badge>
                          <Badge variant="secondary">Appeal Pending</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                        <p className="text-sm text-foreground">
                          <span className="font-medium">Ban reason:</span> {user.banReason}
                        </p>
                        {user.banAppealText && (
                          <div className="p-2 rounded bg-muted text-sm text-foreground">
                            <span className="font-medium">Appeal:</span> {user.banAppealText}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            reviewAppeal.mutate({ userId: user.id, decision: Variant_deny_approve.approve })
                          }
                          disabled={reviewAppeal.isPending}
                        >
                          {reviewAppeal.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            reviewAppeal.mutate({ userId: user.id, decision: Variant_deny_approve.deny })
                          }
                          disabled={reviewAppeal.isPending}
                        >
                          Deny
                        </Button>
                      </div>
                    </div>

                    {/* Admin Appeal Response Display */}
                    {user.adminAppealResponse && (
                      <div className="mt-2 p-3 rounded-md bg-muted border border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Admin Response:</p>
                        <p className="text-sm text-foreground">{user.adminAppealResponse}</p>
                      </div>
                    )}

                    {/* Response Form Toggle */}
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1"
                        onClick={() =>
                          setAppealResponseOpen(appealResponseOpen === user.id ? null : user.id)
                        }
                      >
                        {appealResponseOpen === user.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        Type your response
                      </Button>

                      {appealResponseOpen === user.id && (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            placeholder="Type your admin response to this appeal..."
                            value={appealResponseText[user.id] || ''}
                            onChange={(e) =>
                              setAppealResponseText((prev) => ({ ...prev, [user.id]: e.target.value }))
                            }
                            rows={3}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitAppealResponse(user.id)}
                              disabled={respondToAppeal.isPending || !appealResponseText[user.id]?.trim()}
                            >
                              {respondToAppeal.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              Submit Response
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAppealResponseOpen(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Moderator Applications Tab ── */}
        <TabsContent value="applications" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-foreground">Moderator Applications</h2>
            <Badge variant="outline">{applications.length} total</Badge>
          </div>

          {applicationsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No moderator applications yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <Card key={app.id} className="border-border">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">App #{app.id}</Badge>
                          <Badge
                            variant={
                              app.status === 'approved'
                                ? 'default'
                                : app.status === 'denied'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {app.status}
                          </Badge>
                          {app.wasWarned && (
                            <Badge variant="destructive" className="text-xs">
                              ⚠ Search Detected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground">
                          <span className="font-medium">Applicant:</span>{' '}
                          <span className="font-mono text-xs">{app.applicantPrincipal.toString()}</span>
                        </p>
                        {app.applicantUserId && (
                          <p className="text-sm text-foreground">
                            <span className="font-medium">User ID:</span> {app.applicantUserId}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(Number(app.timestamp) / 1_000_000).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Admin Application Response Display */}
                    {app.adminResponse && (
                      <div className="mt-2 p-3 rounded-md bg-muted border border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Admin Response:</p>
                        <p className="text-sm text-foreground">{app.adminResponse}</p>
                      </div>
                    )}

                    {/* Response Form Toggle */}
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1"
                        onClick={() =>
                          setApplicationResponseOpen(
                            applicationResponseOpen === app.id ? null : app.id
                          )
                        }
                      >
                        {applicationResponseOpen === app.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        Add a response
                      </Button>

                      {applicationResponseOpen === app.id && (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            placeholder="Type your admin response to this application..."
                            value={applicationResponseText[app.id] || ''}
                            onChange={(e) =>
                              setApplicationResponseText((prev) => ({
                                ...prev,
                                [app.id]: e.target.value,
                              }))
                            }
                            rows={3}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitApplicationResponse(app.id)}
                              disabled={
                                respondToApplication.isPending ||
                                !applicationResponseText[app.id]?.trim()
                              }
                            >
                              {respondToApplication.isPending && (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              )}
                              Submit Response
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setApplicationResponseOpen(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Users Tab ── */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New User</CardTitle>
              <CardDescription>Register a new user in the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-id">User ID (Principal)</Label>
                  <Input
                    id="user-id"
                    placeholder="Enter user principal ID"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleAddUser}
                disabled={addUser.isPending || !newUserId || !newUsername}
              >
                {addUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add User
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{users.length} user(s) registered</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground">No users yet.</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                    >
                      <div>
                        <p className="font-medium text-foreground">{user.username}</p>
                        <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                        <p className="text-xs text-muted-foreground">
                          Warnings: {user.warningCount.toString()}/{user.maxWarnings.toString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            user.status === Variant_active_banned_warned.banned
                              ? 'destructive'
                              : user.status === Variant_active_banned_warned.warned
                              ? 'secondary'
                              : 'default'
                          }
                        >
                          {user.status}
                        </Badge>
                        {user.banAppealStatus === Variant_pending_none_reviewed.pending && (
                          <Badge variant="outline" className="text-xs">
                            Appeal Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
