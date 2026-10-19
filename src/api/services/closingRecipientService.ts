import { apiClient } from '../client';
import type {
  ClosingDispatchResult,
  CreateRecipientInput,
  MessagingProviderStatus,
  NotificationLog,
  NotificationLogQuery,
  NotificationRecipient,
  UpdateRecipientInput,
} from '../types';

/**
 * `/api/closing-notifications` — who gets the 2:00 AM closing summary, the
 * delivery log, and a manual send. super_admin only.
 *
 * The recipient routes have no Idempotency-Key handling server-side, so a
 * retried create can add the same person twice; the form guards against a
 * double tap and checks for a duplicate before it sends.
 */
export async function listRecipients(): Promise<{ recipients: NotificationRecipient[] }> {
  return apiClient.get<{ recipients: NotificationRecipient[] }>('/closing-notifications/recipients');
}

export async function createRecipient(input: CreateRecipientInput): Promise<{ recipient: NotificationRecipient }> {
  return apiClient.post<{ recipient: NotificationRecipient }>('/closing-notifications/recipients', input);
}

export async function updateRecipient(id: string, input: UpdateRecipientInput): Promise<{ recipient: NotificationRecipient }> {
  return apiClient.patch<{ recipient: NotificationRecipient }>(`/closing-notifications/recipients/${id}`, input);
}

/** A real delete — the recipient's past log rows keep their figures but lose the link. Prefer deactivating. */
export async function deleteRecipient(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/closing-notifications/recipients/${id}`);
}

/** Newest first, `limit` ≤ 200. */
export async function listNotificationLogs(
  query: NotificationLogQuery & { limit: number; offset: number },
): Promise<{ logs: NotificationLog[]; total: number }> {
  const res = await apiClient.get<{ logs: NotificationLog[]; total: number }>('/closing-notifications/logs', { ...query });
  return { total: Number(res.total ?? 0), logs: (res.logs ?? []).map((l) => ({ ...l, retryCount: Number(l.retryCount ?? 0) })) };
}

export async function getMessagingProvider(): Promise<MessagingProviderStatus> {
  return apiClient.get<MessagingProviderStatus>('/closing-notifications/provider');
}

/**
 * Generate one business date's summaries and send them to EVERY active
 * recipient — the server has no per-branch or per-person send. Pairs already
 * logged as sent for that date are skipped unless `resend`.
 */
export async function dispatchClosingSummaries(input: { businessDate?: string; resend?: boolean }): Promise<ClosingDispatchResult> {
  return apiClient.post<ClosingDispatchResult>('/closing-notifications/dispatch', input);
}
