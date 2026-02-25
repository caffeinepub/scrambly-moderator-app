import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { toast } from 'sonner';
import type {
  UserProfile,
  User,
  Moderator,
  Warning,
  ModeratorReport,
  ModeratorApplication,
  UserId,
  ModeratorId,
  ReportId,
} from '../backend';
import { Variant_deny_approve, UserRole } from '../backend';
import { Principal } from '@dfinity/principal';

export { Variant_deny_approve, UserRole };

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Role / Admin ─────────────────────────────────────────────────────────────

export function useGetCallerUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserRole | null>({
    queryKey: ['callerUserRole'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !actorFetching,
  });
}

/** Convenience alias — returns true when the caller's role is admin */
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Admin: Users ─────────────────────────────────────────────────────────────

export function useGetAllUsers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAddUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, username }: { userId: UserId; username: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addUser(userId, username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User added successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add user: ${error.message}`);
    },
  });
}

// ─── Admin: Moderators ────────────────────────────────────────────────────────

export function useGetAllModerators() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Moderator[]>({
    queryKey: ['moderators'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllModerators();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAddModerator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ principal, name }: { principal: Principal; name: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addModerator(principal, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderators'] });
      toast.success('Moderator added successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add moderator: ${error.message}`);
    },
  });
}

// ─── Admin: Moderator Reports ─────────────────────────────────────────────────

export function useGetModeratorReports() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ModeratorReport[]>({
    queryKey: ['moderatorReports'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getModeratorReports();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useResolveModeratorReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, banModerator }: { reportId: ReportId; banModerator: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.resolveModeratorReport(reportId, banModerator);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderatorReports'] });
      queryClient.invalidateQueries({ queryKey: ['moderators'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve report: ${error.message}`);
    },
  });
}

export function useRespondToModeratorReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, response }: { reportId: bigint; response: string }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.respondToModeratorReport(reportId, response);
      if (result.__kind__ === 'err') throw new Error(result.err);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderatorReports'] });
      toast.success('Response added to report!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add response: ${error.message}`);
    },
  });
}

// ─── Admin: Appeals ───────────────────────────────────────────────────────────

export function useReviewAppeal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, decision }: { userId: UserId; decision: Variant_deny_approve }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.reviewAppeal(userId, decision);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to review appeal: ${error.message}`);
    },
  });
}

export function useGetPendingAppeals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<User[]>({
    queryKey: ['pendingAppeals'],
    queryFn: async () => {
      if (!actor) return [];
      const users = await actor.getAllUsers();
      return users.filter((u) => u.isBanned && u.banAppealStatus === 'pending');
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useRespondToAppeal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, response }: { userId: Principal; response: string }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.respondToAppeal(userId, response);
      if (result.__kind__ === 'err') throw new Error(result.err);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['pendingAppeals'] });
      toast.success('Response added to appeal!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add response: ${error.message}`);
    },
  });
}

// ─── Admin: Moderator Applications ───────────────────────────────────────────

export function useGetModeratorApplications() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ModeratorApplication[]>({
    queryKey: ['moderatorApplications'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getModeratorApplications();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useRespondToModeratorApplication() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, response }: { applicationId: bigint; response: string }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.respondToModeratorApplication(applicationId, response);
      if (result.__kind__ === 'err') throw new Error(result.err);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderatorApplications'] });
      toast.success('Response added to application!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add response: ${error.message}`);
    },
  });
}

// ─── Moderator Actions ────────────────────────────────────────────────────────

export function useIssueWarning() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: UserId; reason: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.issueWarning(userId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsersForModerator'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to issue warning: ${error.message}`);
    },
  });
}

export function useBanUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: UserId; reason: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.banUser(userId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsersForModerator'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to ban user: ${error.message}`);
    },
  });
}

export function useInstantBanUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: UserId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.instantBanUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsersForModerator'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to instant ban user: ${error.message}`);
    },
  });
}

export function useGetAllUsersForModerator() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<User[]>({
    queryKey: ['allUsersForModerator'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !actorFetching,
  });
}

// ─── User Status ──────────────────────────────────────────────────────────────

export function useGetUserWarnings(userId: UserId | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Warning[]>({
    queryKey: ['userWarnings', userId],
    queryFn: async () => {
      if (!actor || !userId) return [];
      return actor.getUserWarnings(userId);
    },
    enabled: !!actor && !actorFetching && !!userId,
  });
}

/** Fetch a single user by ID */
export function useGetUser(userId: UserId | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<User | null>({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!actor || !userId) return null;
      return actor.getUser(userId);
    },
    enabled: !!actor && !actorFetching && !!userId,
  });
}

/** Alias kept for backward compatibility */
export const useGetCurrentUser = useGetUser;

export function useSubmitAppeal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, appealText }: { userId: UserId; appealText: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.submitAppeal(userId, appealText);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit appeal: ${error.message}`);
    },
  });
}

export function useReportModerator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moderatorId, reason }: { moderatorId: ModeratorId; reason: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.reportModerator(moderatorId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderatorReports'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to report moderator: ${error.message}`);
    },
  });
}

// ─── Moderator Application ────────────────────────────────────────────────────

export function useApplyForModerator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ answer, userId }: { answer: string; userId: UserId | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.applyForModerator(answer, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderatorApplications'] });
    },
    onError: (error: Error) => {
      toast.error(`Application error: ${error.message}`);
    },
  });
}

export function useRecordSearchAttempt() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (applicantPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordSearchAttempt(applicantPrincipal);
    },
    onError: (error: Error) => {
      console.error('Failed to record search attempt:', error.message);
    },
  });
}

// ─── Role Assignment ──────────────────────────────────────────────────────────

export function useAssignRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: UserRole }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerUserRole'] });
      queryClient.invalidateQueries({ queryKey: ['isCallerAdmin'] });
      toast.success('Role assigned!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign role: ${error.message}`);
    },
  });
}
