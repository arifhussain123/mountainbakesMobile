import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateSettings } from '@/api/services/settingsService';
import { qk } from '@/api/queryKeys';
import type { UpdateSettingsInput } from '@/shared/schemas/settings.schemas';

/**
 * Business settings.
 *
 * Sends a PATCH, never the whole object. The route writes only the fields
 * present in the body, so posting a full settings object would write back
 * whatever this screen last read — silently reverting another admin's edit to a
 * section this one never touched.
 *
 * The invalidation matters more here than anywhere else in the app: the currency
 * symbol and GST rate are read by every screen that renders money, and the
 * server caches settings behind `invalidate('settings')`. A stale copy means a
 * receipt printed with the wrong tax.
 */
export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateSettingsInput) => updateSettings(patch),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.settings() }),
  });
}
