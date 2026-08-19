/**
 * Every TanStack Query cache key in the app.
 *
 * Centralised for the same reason the web client centralises its `qk`: a
 * hand-rolled key that differs from the canonical one by a shape detail creates
 * a SECOND cache entry, and invalidations then silently miss it — the screen
 * keeps showing stale data with nothing to indicate why.
 *
 * Keys live in their own module with no React imports, so non-component code
 * (the sync manager, repositories) can reuse them without an import cycle.
 */

export const qk = {
  settings: () => ['settings'] as const,

  branches: {
    all: () => ['branches'] as const,
    byId: (id: string) => ['branches', id] as const,
  },

  categories: {
    all: () => ['categories'] as const,
  },

  products: {
    /** Namespace for invalidating every product list at once. */
    all: () => ['products'] as const,
    /**
     * Filters are part of the key. `includeSpecial` in particular must be —
     * the server caches those variants separately because a one-off "special"
     * product must never leak into a catalogue picker.
     */
    list: (filters: {
      search?: string;
      categoryId?: string;
      isActive?: boolean;
      includeSpecial?: boolean;
    }) => ['products', 'list', filters] as const,
    byId: (id: string) => ['products', id] as const,
  },

  expenses: {
    all: () => ['expenses'] as const,
    list: (filters: { branchId?: string; from?: string; to?: string; category?: string }) =>
      ['expenses', 'list', filters] as const,
  },

  stock: {
    all: () => ['stock'] as const,
    /**
     * Branch AND business date both belong in the key: the same product has a
     * different balance per branch, and per business day.
     */
    byBranch: (branchId: string | null, date: string) =>
      ['stock', branchId ?? 'self', date] as const,
  },
} as const;
