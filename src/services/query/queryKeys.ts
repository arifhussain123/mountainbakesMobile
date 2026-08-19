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
    /**
     * Price history for one product, or the whole trail when `productId` is
     * omitted. Nested under `products` so a price change invalidates the lists,
     * the product itself and its history with one call.
     */
    priceHistory: (productId?: string) => ['products', 'priceHistory', productId ?? 'all'] as const,
  },

  /**
   * Branch demands on central production. The server scopes the list to the
   * caller's own branch, so the key carries only the status filter.
   */
  productionOrders: {
    all: () => ['productionOrders'] as const,
    list: (filters: { status?: string }) => ['productionOrders', 'list', filters] as const,
  },

  expenses: {
    all: () => ['expenses'] as const,
    list: (filters: { branchId?: string; from?: string; to?: string; category?: string }) =>
      ['expenses', 'list', filters] as const,
  },

  /**
   * Accounts. Filters belong in the key because the server applies them in SQL
   * (`status` and `role` are `.eq()` predicates), so two filter sets are two
   * different responses rather than one list the client narrows.
   */
  users: {
    all: () => ['users'] as const,
    list: (filters: { status?: string; role?: string }) => ['users', 'list', filters] as const,
    byId: (id: string) => ['users', id] as const,
  },

  /** Customer orders and counter sales — the same `/api/orders` resource. */
  orders: {
    all: () => ['orders'] as const,
    list: (filters: { branchId?: string; status?: string; from?: string; to?: string }) =>
      ['orders', 'list', filters] as const,
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

  /**
   * `/api/reports/summary`.
   *
   * The filters ARE the key and nothing else is, which is the point: the branch
   * dashboard and the Reports screen ask the same question with the same
   * `{period}` and used to do it under `['reports','summary',period]` and
   * `['reports','summary','export-view',period]` — two cache entries, two
   * requests, and two independently-stale copies of one answer on screens the
   * same manager moves between. A screen name has no business in a cache key;
   * the arguments to the request are the whole identity of the response.
   *
   * The server scopes the figures to the caller's role, so a branch manager and
   * an admin asking for the same period genuinely are asking different
   * questions — but they are never the same session, so no key has to say so.
   *
   * `branchId` **is** in the key, for the opposite reason: one admin session
   * scopes the same period to one shop and then another, and those are two
   * answers. Leaving it out would serve Saddar's revenue under Gulberg's chip.
   */
  reports: {
    all: () => ['reports'] as const,
    summary: (params: { period?: string; from?: string; to?: string; branchId?: string }) =>
      ['reports', 'summary', params] as const,
  },

  /**
   * The production counter's own resources — the shop floor, not the demands
   * branches raise on it. Those are `productionOrders` above, and they are one
   * resource under one key however many screens read it: the production Orders
   * list, a branch's Demands list and the admin dashboard's pending count are
   * all `GET /api/production-orders`, scoped server-side by role.
   */
  production: {
    all: () => ['production'] as const,
    overview: () => ['production', 'overview'] as const,
    queueStats: () => ['production', 'queue', 'stats'] as const,
    stock: () => ['production', 'stock'] as const,
    /** Branch balances as the production counter sees them. */
    branchStock: () => ['production', 'branchStock'] as const,
    previousBalance: (orderId: string) => ['production', 'previousBalance', orderId] as const,
  },

  /** The Finance product surface. Its own endpoints, its own permission model. */
  finance: {
    all: () => ['finance'] as const,
    dashboard: () => ['finance', 'dashboard'] as const,
    ledger: () => ['finance', 'ledger'] as const,
  },
} as const;
