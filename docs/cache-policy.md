# Cache policy

What is cached, for how long, and why.

## Server state (TanStack Query)

| Data | staleTime | Reasoning |
|---|---|---|
| Products, categories, branches, settings | 10 min | Catalogue data barely moves, and the server caches the unfiltered variants too. |
| Everything else (default) | 60 s | Matches the web client, so the two never disagree about how fresh a figure is. |
| Stock, dashboards, ledger, production overview | 15 s (`LIVE_STALE_TIME_MS`) | Moves with every sale. Treating it as 60 s-stale would show a balance a cashier has already changed. |

`gcTime` is **24 hours**, deliberately longer than any staleTime: a screen the
user has not opened recently must still be present in the cache when they go
offline. A short gcTime would evict exactly the screens offline mode exists for.

`refetchOnReconnect` is on — coming back online is precisely when a stale screen
needs correcting. `refetchOnWindowFocus` is off, matching the web client;
foreground refresh is handled by the sync engine instead.

### Retries

Queries retry twice, but **never** for an error the server has already judged:
`ApiError.isRetryable` is false for validation, authorization and not-found, so a
400 or a 403 surfaces immediately instead of being re-sent twice to produce the
same answer more slowly.

Mutations are **never** retried automatically. Without server-side idempotency a
blind retry can double-apply a sale; offline writes go through the sync queue,
which retries deliberately and carries a `client_operation_id`.

## Query keys

Every key comes from `qk` in `src/services/query/queryKeys.ts`. A hand-rolled key
that differs by a shape detail creates a second cache entry that invalidations
silently miss — the screen keeps showing stale data with nothing to indicate why.

Filters are part of the key. `includeSpecial` in particular must be, because the
server caches those variants separately: a one-off "special" product must never
leak into a catalogue picker.

## Device state (MMKV, encrypted)

Theme, last-sync marker, remember-me flag, last identity. Small, non-sensitive,
and read synchronously so a cold start does not flash the wrong theme.

## Local database (SQLite)

Not a cache — it is the **system of record** for transactions created on the
device, and is never cleared by a cache eviction, a sign-out, or an app update.

`local_products` / `local_categories` / `local_stock` exist as a reference-data
mirror for offline reads, but **nothing populates them yet**. Offline catalogue
reads currently fall back to the persisted query cache instead.

## What is deliberately NOT cached

- Auth tokens beyond what the Supabase SDK persists (encrypted MMKV).
- Report exports — generated per request; a stale spreadsheet is worse than none.
- Anything from the Finance ledger beyond its 15 s window; balances are running
  totals and a stale one is actively misleading.
