import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { settingsService } from '../services';

/** GST rate/enabled — rarely changes; a long stale time avoids re-fetching it on every screen. */
const SETTINGS_STALE_TIME_MS = 5 * 60_000;

export function useAppSettings() {
  return useQuery({
    queryKey: queryKeys.appSettings(),
    queryFn: () => settingsService.getAppSettings(),
    staleTime: SETTINGS_STALE_TIME_MS,
  });
}
