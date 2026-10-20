import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as adminSearchAndFilesService from '../services/adminSearchAndFilesService';
import type { BackupArchive, PickedLogo } from '../services/adminSearchAndFilesService';

/** The web searches from two characters; below that nothing is sent. */
export const GLOBAL_SEARCH_MIN_CHARS = 2;

/** Global Search — `term` is already debounced by the screen (300 ms, as the web). */
export function useGlobalSearch(term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: queryKeys.globalSearch(q),
    queryFn: () => adminSearchAndFilesService.globalSearch(q),
    enabled: q.length >= GLOBAL_SEARCH_MIN_CHARS,
    staleTime: 30_000,
  });
}

/** The forced change. The caller refreshes the session after, which is what lifts the gate. */
export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (newPassword: string) => adminSearchAndFilesService.changeOwnPassword(newPassword),
  });
}

/**
 * The server writes the new URL to the settings row itself. Settings are only
 * marked stale, not refetched now: the Settings form re-seeds itself from every
 * fresh copy, and an immediate refetch would wipe edits the admin has not saved
 * yet. The screen shows the returned URL meanwhile; the next fetch (Save, pull
 * to refresh, reopening) brings it in.
 */
export function useUploadSettingsLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logo: PickedLogo) => adminSearchAndFilesService.uploadSettingsLogo(logo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.appSettings(), refetchType: 'none' }),
  });
}

/** A fresh five-minute link per tap — a mutation, as on the web, so it is never cached. */
export function useBackupDownloadUrl() {
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: BackupArchive }) => adminSearchAndFilesService.getBackupDownloadUrl(id, file),
  });
}
