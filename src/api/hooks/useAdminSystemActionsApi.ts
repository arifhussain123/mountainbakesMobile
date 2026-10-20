import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as adminSystemActionsService from '../services/adminSystemActionsService';
import type { AdminResetPasswordInput, ChangeUserEmailInput, CreateUserInput, UpdateUserInput } from '../types';

type QueryClient = ReturnType<typeof useQueryClient>;

// ─── Users (web UsersPage) ──────────────────────────────────────────────────

/** `['adminUsers']` covers the Data Engine pages, the plain list and the User Activity feed (every write is audited). */
function invalidateUsers(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers() });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => adminSystemActionsService.createUser(input),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => adminSystemActionsService.updateUser(id, input),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSystemActionsService.deactivateUser(id),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSystemActionsService.activateUser(id),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSystemActionsService.deleteUserPermanently(id),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminResetPasswordInput }) => adminSystemActionsService.resetUserPassword(id, input),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useChangeUserEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ChangeUserEmailInput }) => adminSystemActionsService.changeUserEmail(id, input),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

// ─── Security (web RevokeSessionDialog) ─────────────────────────────────────

/** `['loginSessions']` covers the roster, the history pages, each session's detail and the dashboard card. */
function invalidateSessions(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ['loginSessions'] });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason?: string }) => adminSystemActionsService.revokeSession(sessionId, reason),
    onSuccess: () => invalidateSessions(queryClient),
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) => adminSystemActionsService.revokeAllSessions(userId, reason),
    onSuccess: () => invalidateSessions(queryClient),
  });
}

// ─── Database Backup (web DatabaseBackupPage) ───────────────────────────────

/** The web invalidates its whole `['backups']` root; here that is the status, the history and the dashboard's health badge. */
function invalidateBackups(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.backupStatus() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.backupJobs() });
  return queryClient.invalidateQueries({ queryKey: queryKeys.backupHealth() });
}

export function useRunManualBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminSystemActionsService.runManualBackup(),
    onSuccess: () => invalidateBackups(queryClient),
  });
}

export function useVerifyBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSystemActionsService.verifyBackup(id),
    onSuccess: () => invalidateBackups(queryClient),
  });
}
