import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import {
  type User,
  type Moderator,
  type Warning,
  type ModeratorReport,
  type UserProfile,
  Variant_deny_approve,
} from '../backend';

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

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['callerUserRole'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Admin: Moderators ────────────────────────────────────────────────────────

export function useGetAllModerators() {
  const { actor, isFetching } = useActor();

  return useQuery<Moderator[]>({
    queryKey: ['allModerators'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllModerators();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddModerator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ principal, name }: { principal: string; name: string }) => {
      if (!actor) throw new Error('Actor not available');
      const { Principal } = await import('@dfinity/principal');
      return actor.addModerator(Principal.fromText(principal), name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allModerators'] });
    },
  });
}

// ─── Admin: Users ─────────────────────────────────────────────────────────────

export function useGetAllUsers() {
  const { actor, isFetching } = useActor();

  return useQuery<User[]>({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, username }: { userId: string; username: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addUser(userId, username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });
}

// ─── Admin: Moderator Reports ─────────────────────────────────────────────────

export function useGetModeratorReports() {
  const { actor, isFetching } = useActor();

  return useQuery<ModeratorReport[]>({
    queryKey: ['moderatorReports'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getModeratorReports();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useResolveModeratorReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, banModerator }: { reportId: string; banModerator: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.resolveModeratorReport(reportId, banModerator);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderatorReports'] });
      queryClient.invalidateQueries({ queryKey: ['allModerators'] });
    },
  });
}

// ─── Admin: Appeals ───────────────────────────────────────────────────────────

export function useReviewAppeal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, decision }: { userId: string; decision: Variant_deny_approve }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.reviewAppeal(userId, decision);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['pendingAppeals'] });
    },
  });
}

export function useGetPendingAppeals() {
  const { actor, isFetching } = useActor();

  return useQuery<User[]>({
    queryKey: ['pendingAppeals'],
    queryFn: async () => {
      if (!actor) return [];
      const users = await actor.getAllUsers();
      return users.filter(
        (u) => u.isBanned && u.banAppealStatus === 'pending'
      );
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Moderator Actions ────────────────────────────────────────────────────────

export function useIssueWarning() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.issueWarning(userId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });
}

export function useBanUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.banUser(userId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });
}

export function useInstantBanUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.instantBanUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });
}

// ─── User Status ──────────────────────────────────────────────────────────────

export function useGetCurrentUser(userId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<User | null>({
    queryKey: ['currentUser', userId],
    queryFn: async () => {
      if (!actor || !userId) return null;
      return actor.getUser(userId);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useGetUserWarnings(userId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Warning[]>({
    queryKey: ['userWarnings', userId],
    queryFn: async () => {
      if (!actor || !userId) return [];
      return actor.getUserWarnings(userId);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useSubmitAppeal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, appealText }: { userId: string; appealText: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.submitAppeal(userId, appealText);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['currentUser', variables.userId] });
    },
  });
}

export function useReportModerator() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moderatorId, reason }: { moderatorId: string; reason: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.reportModerator(moderatorId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderatorReports'] });
    },
  });
}

// ─── Moderator Status Check ───────────────────────────────────────────────────

export function useGetCurrentModeratorStatus() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['currentModeratorStatus'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const mods = await actor.getAllModerators();
        return mods;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
  });
}
