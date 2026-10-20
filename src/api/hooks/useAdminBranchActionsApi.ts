import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as adminBranchActionsService from '../services/adminBranchActionsService';
import type { AdminBranchInput, UpsertBranchLocationInput } from '../types';

/**
 * A branch write moves every branch list (the admin's, every picker's) and the
 * Branch Locations rows, which carry the branch's name and active flag.
 */
function invalidateBranches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminBranches() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.branches() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.branchLocations() });
}

/** A location write moves the row and the GPS Configured / Missing GPS tiles. */
function invalidateBranchLocations(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.branchLocations() });
}

export function useCreateAdminBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminBranchInput) => adminBranchActionsService.createBranch(input),
    onSuccess: () => invalidateBranches(queryClient),
  });
}

export function useUpdateAdminBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; input: AdminBranchInput }) => adminBranchActionsService.updateBranch(v.id, v.input),
    onSuccess: () => invalidateBranches(queryClient),
  });
}

export function useDeactivateAdminBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBranchActionsService.deactivateBranch(id),
    onSuccess: () => invalidateBranches(queryClient),
  });
}

export function useUpsertBranchLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { branchId: string; input: UpsertBranchLocationInput }) =>
      adminBranchActionsService.upsertBranchLocation(v.branchId, v.input),
    onSuccess: () => invalidateBranchLocations(queryClient),
  });
}

export function useSetBranchLocationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { branchId: string; isActive: boolean }) => adminBranchActionsService.setBranchLocationStatus(v.branchId, v.isActive),
    onSuccess: () => invalidateBranchLocations(queryClient),
  });
}

export function useDeleteBranchLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (branchId: string) => adminBranchActionsService.deleteBranchLocation(branchId),
    onSuccess: () => invalidateBranchLocations(queryClient),
  });
}
