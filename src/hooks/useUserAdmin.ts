import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  createUser,
  getUsers,
  resetUserPassword,
  setUserActive,
  updateUser,
  type ResetPasswordResult,
  type UserFilters,
} from '@/services/api/usersApi';
import { qk } from '@/services/query/queryKeys';
import type { AdminResetPasswordInput, CreateUserInput, UpdateUserInput } from '@/shared/schemas/user.schemas';
import type { User } from '@/shared/types/user.types';

/**
 * User administration.
 *
 * Online-only writes, for the same reason product administration is: queueing
 * them would let two admins edit one account offline and have the later drain
 * silently win. `writeOffline()` exists for transactions a shift would otherwise
 * LOSE — a sale, an expense — and an account edit is not that. A failure here is
 * an error and a retry, which is the honest outcome.
 *
 * Every mutation invalidates the whole `users` namespace rather than patching a
 * cache entry. Deactivating an account changes both the row and its Supabase
 * auth ban state, and a role change rewrites `app_metadata` — the only
 * trustworthy copy after any of that is the one the server returns next.
 */

export function useUsers(filters: UserFilters = {}): UseQueryResult<User[]> {
  return useQuery({
    queryKey: qk.users.list(filters),
    queryFn: () => getUsers(filters),
  });
}

function useInvalidateUsers() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: qk.users.all() });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: CreateUserInput) => createUser(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserInput }) =>
      updateUser(id, payload),
    onSuccess: invalidate,
  });
}

/**
 * Block or restore sign-in.
 *
 * Not a delete: the server sets `status` and bans or unbans the auth user, and
 * the row stays. Every order, expense and audit entry referencing this account
 * keeps resolving.
 */
export function useSetUserActive() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserActive(id, active),
    onSuccess: invalidate,
  });
}

/**
 * Reset another account's password.
 *
 * The result may carry a one-time temporary password. It is returned to the
 * caller and deliberately NOT cached: query caches are inspectable and this
 * device's database is not encrypted, so a credential must not outlive the
 * dialog that shows it.
 */
export function useResetUserPassword() {
  const invalidate = useInvalidateUsers();
  return useMutation<ResetPasswordResult, Error, { id: string; input: AdminResetPasswordInput }>({
    mutationFn: ({ id, input }) => resetUserPassword(id, input),
    onSuccess: invalidate,
  });
}
