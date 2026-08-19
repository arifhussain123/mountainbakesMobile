import { create } from 'zustand';
import { karachiTimeStr } from '@/shared/utils/timezone';

/**
 * Which reads are currently being served from the SQLite mirror, and how old
 * that data is.
 *
 * ---------------------------------------------------------------------------
 * Why this is not TanStack Query's `dataUpdatedAt`
 * ---------------------------------------------------------------------------
 * Screens show "as of 09:14" from `dataUpdatedAt`, which is when the *query*
 * last resolved. A mirror-served read resolves successfully **now**, so that
 * clock would read the current time over data saved hours ago — the one reading
 * that makes stale data look fresh. The mirror's own `synced_at` is the truth,
 * and this is where it is published.
 *
 * Cleared as soon as a live fetch succeeds, so the mark cannot outlive the
 * condition that caused it.
 */

export type MirrorResource = 'products' | 'categories' | 'branches' | 'stock';

interface MirrorState {
  /** Epoch ms per resource, or null when that resource is live. */
  savedAt: Record<MirrorResource, number | null>;
  setSavedAt: (resource: MirrorResource, at: number | null) => void;
  clearSavedAt: (resource: MirrorResource) => void;
}

const EMPTY: Record<MirrorResource, number | null> = {
  products: null,
  categories: null,
  branches: null,
  stock: null,
};

export const useMirrorStore = create<MirrorState>(set => ({
  savedAt: EMPTY,
  setSavedAt: (resource, at) =>
    set(state => ({ savedAt: { ...state.savedAt, [resource]: at } })),
  clearSavedAt: resource =>
    set(state =>
      state.savedAt[resource] === null
        ? state
        : { savedAt: { ...state.savedAt, [resource]: null } },
    ),
}));

/**
 * The "as of" string for a screen whose data may be mirrored.
 *
 * Prefers the mirror's timestamp when one is set, and falls back to the query's.
 * Karachi time either way — the business clock, not the device's.
 */
export function useDataAsOf(
  resource: MirrorResource,
  queryUpdatedAt: number | undefined,
): string | undefined {
  const savedAt = useMirrorStore(s => s.savedAt[resource]);
  const at = savedAt ?? queryUpdatedAt;
  if (!at) return undefined;
  return karachiTimeStr(new Date(at));
}
