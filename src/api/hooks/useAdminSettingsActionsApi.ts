import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as adminSettingsActionsService from '../services/adminSettingsActionsService';
import type { RestrictionGroup, RestrictionRules } from '../types';

// ─── Settings (web SettingsPage) ────────────────────────────────────────────

/**
 * "Save Settings". The restriction rules state carries the business closing
 * time from these settings, so it refetches too.
 */
export function useUpdateAppSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => adminSettingsActionsService.updateAppSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.appSettings() });
      void queryClient.invalidateQueries({ queryKey: ['restrictions'] });
    },
  });
}

// ─── Settings → Restriction Rules (web RulesTab / ApprovalsTab) ─────────────

/** One group and its whole config — the web's `SaveRestrictionGroupInput`. */
export type SaveRestrictionGroupInput = {
  [G in RestrictionGroup]: { group: G; config: RestrictionRules[G] };
}[RestrictionGroup];

export function useSaveRestrictionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ group, config }: SaveRestrictionGroupInput) => adminSettingsActionsService.saveRestrictionGroup(group, config),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['restrictions'] }),
  });
}

export function useDecideRestrictionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: 'approved' | 'rejected'; reason?: string }) =>
      adminSettingsActionsService.decideRestrictionRequest(id, decision, reason),
    // Settled, not just success (as the web): a 409 means someone else decided
    // it, and the list on screen is stale either way.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['restrictions'] }),
  });
}
