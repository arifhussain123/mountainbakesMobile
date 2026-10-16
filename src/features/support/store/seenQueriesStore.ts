import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SeenQueriesState {
  /** ticketId → ISO timestamp of the admin reply/status that was last seen for it. */
  seenAt: Record<string, string>;
  markSeen: (ticketId: string, replyTimestamp: string) => void;
}

/**
 * `support_tickets` carries no "read" flag server-side (Step 0: the only
 * reply field is `resolutionNote`, with nothing tracking whether the branch
 * has looked at it yet) — so the Query list's "unread dot" is entirely a
 * local, per-device concept, persisted the same way `useAccentStore` persists
 * a UI preference. It is advisory only: it never affects `useNavBadges`'
 * drawer badge, which stays "any resolved/rejected ticket with a note counts
 * as replied" regardless of what this device has opened.
 */
export const useSeenQueriesStore = create<SeenQueriesState>()(
  persist(
    (set) => ({
      seenAt: {},
      markSeen: (ticketId, replyTimestamp) => set((state) => ({ seenAt: { ...state.seenAt, [ticketId]: replyTimestamp } })),
    }),
    { name: 'mountainbakes.helpDesk.seenQueries', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** A ticket has an unseen admin reply when it has one at all and either it's never been opened, or it was opened before THIS reply arrived (re-resolved/edited after the branch already saw an earlier state). */
export function hasUnseenReply(ticketId: string, resolutionNote: string | null, resolvedAt: string | null, seenAt: Record<string, string>): boolean {
  if (!resolutionNote || !resolvedAt) return false;
  const lastSeen = seenAt[ticketId];
  return !lastSeen || lastSeen < resolvedAt;
}
