import { apiClient } from '../client';
import type { NotificationFeedResponse } from '../types';

/** `/api/notifications` — the caller's own feed, newest first, capped at 50. */
export async function listNotifications(): Promise<NotificationFeedResponse> {
  return apiClient.get<NotificationFeedResponse>('/notifications');
}

/** `/api/notifications/read` — up to 50 ids per call (the feed's own cap), which is always enough for a single "mark all" since the feed never holds more than that. */
export async function markNotificationsRead(ids: string[]): Promise<{ readIds: string[] }> {
  return apiClient.post<{ readIds: string[] }>('/notifications/read', { ids });
}
