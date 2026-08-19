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

**A key names the request, never the screen.** Several screens used to hand-roll
their own, and the cost was not theoretical:

| Was | Now |
|---|---|
| `['reports','summary',period]` (branch dashboard) and `['reports','summary','export-view',period]` (Reports) | `qk.reports.summary({period})` |
| `['production','orders',status]`, `['production-orders','pending','count']` and `qk.productionOrders.list({status})` | `qk.productionOrders.list({status})` |
| `['orders','list']` beside `qk.orders.list(filters)` | `qk.orders.list({})` |
| `['finance','dashboard']`, `['finance','ledger']`, `['production','overview' …]` | `qk.finance.*`, `qk.production.*` |

The report pair is the clearest case: a branch manager opening the dashboard and
then Reports made the **same** request twice and kept two copies of one answer,
which then went stale independently. The production trio also broke invalidation
— `invalidateQueries(['production'])` after reviewing a demand could not reach a
list stored under `['productionOrders']`, so the screen that had just changed
kept showing the state before the change.

### Switching a filter keeps the previous answer

Every query behind a chip row or a date range carries
`placeholderData: previous => previous`. Changing a filter is the same screen
being asked a different question, not a new screen — without this the result
unmounts, the layout collapses to a skeleton, and it refills a moment later. It
applies to the dashboards' period chips, the production and demand status
filters, and the catalogue's server-side search.

### A session ending empties the cache

`clearCachedServerState()` (`services/query/queryClient.ts`) is called from every
transition to signed-out: the explicit sign-out, an abandoned wrong-module or
no-role session, and an expired refresh token arriving through the Supabase
listener.

It is not housekeeping. The client is a module singleton mounted above the auth
tree, so it outlives every sign-out in the process, `gcTime` is 24 hours, and
several keys carry **no identity at all** because the server scopes those
responses from the JWT:

| Key | What identifies the response |
|---|---|
| `qk.reports.summary({period})` | the caller's branch, from the token |
| `qk.reports.summary({period, branchId})` | an **admin** scoping to one shop — see below |
| `qk.productionOrders.list({status})` | "the caller's own branch" |
| `qk.expenses.list({...})` | `branchId` optional; absent means "mine" |
| `qk.stock.byBranch(null, date)` | keyed literally as `'self'` |

`branchId` is the exception that proves the rule, and it goes **in** the key. A
branch manager never sends it — the server scopes them off the token, so their
key is identified by the JWT like everything else above. An admin does send it,
from the Reports branch chips, and one admin session asks about Saddar and then
Gulberg inside the same minute. Those are two answers to two questions; without
`branchId` in the key the second chip would be served the first shop's takings.

A branch handset is shared. Without this, a manager signing out and a shift user
signing in on the same phone could be shown the previous account's takings,
demands and balances — and with a ten-minute staleTime on settings, branches and
categories, possibly with no refetch to correct it.

Putting the account into all forty keys would also work and is worse: every key
anyone adds later has to remember, and one that forgets fails silently. This
fails safe — after a sign-out there is nothing left to leak.

**Server state only.** Unsynced transactions stay in SQLite and resume on the
next sign-in on that phone, and the reference mirror stays too, because clearing
it would break the offline cold start it exists for.
`store/__tests__/signOutPreservesLocalData.test.ts` pins both halves against a
real database.

## Device state (MMKV, encrypted)

Theme, last-sync marker, remember-me flag, last signed-in e-mail. Small and read
synchronously so a cold start does not flash the wrong theme or an empty sign-in
field.

The remembered e-mail is an identity, not a credential: ticking "Remember me"
prefills the address and **never** stores the password. It also does not gate
session persistence — the session is kept either way, because signing a device
out on close would strand a shift that rang up sales offline and force-quit.

## Local database (SQLite)

Not a cache — it is the **system of record** for transactions created on the
device, and is never cleared by a cache eviction, a sign-out, or an app update.

`local_products` / `local_categories` / `local_branches` / `local_stock` are the
reference-data mirror, and they are **populated on every successful fetch** and
served when a request never reaches the server (`services/query/readThrough.ts`).

That is what makes the app usable offline rather than merely tolerant of it: the
write path was always offline-first, but a cold start with no signal used to
leave every catalogue read in an error state — and a cashier cannot build a cart
from a screen saying "could not connect".

Three rules the fallback keeps:

- **Only a transport failure falls back.** A 403 is an answer; serving a cached
  list over a refusal would show a branch data it may no longer see.
- **Empty is not absent.** A mirror that was never written rethrows rather than
  rendering an empty catalogue.
- **A mirrored read shows the mirror's own age**, not `dataUpdatedAt` — a
  fallback resolves *now*, and that clock would make stale data look fresh.

A replace is **one native call**, not one per row. `replaceCollection` in
`referenceRepository.ts` builds a single `executeBatch` — the DELETE plus one
parameterised INSERT run against every row — which op-sqlite executes inside one
transaction on the native side. The atomicity that made the old per-row loop a
`transaction()` is preserved (a mirror is never left half-replaced for a screen
to read), and a 400-product catalogue costs one JSI crossing instead of 401.

There is still no persisted **query** cache: `@tanstack/react-query-persist-client`
is a dependency and is not wired, so dashboards and reports are online-only. The
mirror covers the reads that must work offline, and it does so more honestly than
a restored cache would: a mirrored read reports *its own* age, which is what lets
a screen say how old its figures are.

## What is deliberately NOT cached

- Auth tokens beyond what the Supabase SDK persists (encrypted MMKV).
- Report exports — generated per request; a stale spreadsheet is worse than none.
- Anything from the Finance ledger beyond its 15 s window; balances are running
  totals and a stale one is actively misleading.
