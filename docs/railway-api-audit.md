# Railway backend integration audit

Code-level audit only — no live network calls were made against production, no Railway
dashboard/logs were inspected (not available in this environment), and nothing here
required or exposed credentials.

## Base URL / environment

`src/config/env.ts`:
```ts
export const env = {
  apiBaseUrl: 'https://mountainbakes-server-production.up.railway.app/api',
};
```
- Single hardcoded Railway URL, HTTPS. No `localhost`/`http://` fallback anywhere in
  `src/api/*` (`grep -rn "localhost\|http://" src/api` returns nothing besides this doc).
- No per-build-variant (dev/staging/prod) split exists yet — the file's own comment says
  so explicitly ("Override by editing this file per machine until a proper per-build-variant
  config is worth adding"). Not a bug, a known simplification; flag if the owner wants
  build-variant separation before a wider release.
- No secrets, API keys, or DB credentials appear anywhere in `src/` (confirmed by grep for
  common patterns — `SUPABASE`, `SERVICE_ROLE`, `_KEY`, `_SECRET` — none found client-side,
  consistent with this being a pure REST client of the Express/Railway backend).

## Auth wiring (`src/api/client.ts`, `src/state/authStore.ts`)

- Bearer token attached via an axios request interceptor reading from an injected
  `getAccessToken()` closure (`setTokenAccessor`), not a global/module-level token — avoids
  stale-closure bugs across re-logins.
- A 401 is retried exactly once after a silent refresh (`setRefreshHandler`), except on
  `/auth/login` and `/auth/refresh` themselves (`AUTH_ENDPOINTS`) — correct: those endpoints'
  own 401s mean bad credentials/dead refresh token, not an expired session, so retrying would
  be pointless and forcing sign-out would wipe a refresh token that was never implicated.
- `onSessionExpired` callback (`setSessionExpiredHandler`) fires when a refresh genuinely
  fails — wired to the auth store to drop the user back to the login screen rather than
  leaving them on a screen that will 401-loop.

## Request/response shape discipline

Every DTO in `src/api/types.ts` is hand-copied from the real backend contract — confirmed
in this session for the Finance module specifically: four parallel subagent audits each read
the actual `backend/src/routes/*.ts`, `backend/src/shared/schemas/*.ts`, and
`backend/src/shared/types/*.ts` files in full before any mobile type was written (see
`docs/mobile-finance-plan.md`'s endpoint map, built this way on purpose — "none invented").
Branch and Production's types predate this session but follow the same stated convention
(`src/api/types.ts`'s own header comment: "copied by hand from the real backend contract...
rather than invented").

## Error handling

- `toApiError()` (`client.ts`) normalizes every failure to one `ApiError` shape
  (`status`, `message`, `code`, `details`) — a network failure (`!err.response`) gets a
  specific "No internet connection" message rather than a raw axios error reaching a screen.
- Every list/dashboard screen audited this session (Finance's 11 built screens, spot-checked
  Branch's `HomeDashboardScreen`) renders an explicit `ErrorState` component with a Retry
  action on error — no screen was found that swallows an error into a blank view.
- `mapErrorToMessage()` (`src/shared/helpers`) is the single place server error messages are
  turned into UI copy — used consistently rather than each screen re-deriving its own.

## Idempotency / offline

- `generateIdempotencyKey()` + `Idempotency-Key` header for money/stock-moving POSTs — in use
  on Branch's Cash Deposit (`useCashDepositForm`) and the rest of its create forms. This
  audit found the new Finance mutations built earlier this session (Cash Transfer
  approve/reject, Income & Expense create/approve/reject, Daily Closing close-day) had NOT
  been wired with one — **fixed during this audit pass** (see `docs/bug-fix-report.md` #1);
  `createLedgerHead`/`updateLedgerHead` were left without one deliberately (configuration
  writes, not money-moving, lower consequence of a duplicate).
- `src/api/offlineQueue.ts` exists for queuing writes while offline, with its own retry
  worker — used by the Branch/Production builds; the new Finance mutations built this session
  do NOT go through this queue (they call `useMutation` directly against `financeService`).
  Given finance writes are permission-gated, approval-workflow documents (not fire-and-forget
  POS actions), this is a reasonable choice, but it does mean a Finance write attempted while
  offline fails immediately rather than queuing — worth confirming that's the intended
  behavior for this module specifically.

## Branch isolation / RLS

Not independently re-verified at the mobile layer this session (this is enforced server-side,
per `backend/src/middleware/requireFinance.ts`'s own doc comments and the earlier Finance
permission-model audit) — the mobile client never passes a `branchId` the signed-in user
shouldn't be able to see; filtering/scoping is the server's job per every route read this
session, consistent with how Branch/Production's existing builds already behave (confirmed by
their own `*.routes.ts` guards: a branch role gets its own `branchId` resolved server-side
rather than trusting a client-supplied one — see `resolveBranchId` in
`backend/src/routes/branch-closing.routes.ts`, read earlier this session).

## Summary

| Area | Status |
|---|---|
| Base URL correctness | OK — single Railway HTTPS URL, no stale localhost |
| Auth token attach/refresh | OK |
| DTOs match backend | OK for Finance (verified this session against source); Branch/Production assumed per their own stated convention, not re-verified line-by-line this pass |
| Error handling | OK — consistent `ErrorState`/Retry pattern |
| Idempotency on new Finance mutations | Fixed this session (was a gap) |
| Offline queue coverage for Finance | Intentional gap, not a queue bug — confirm intent |
| Secrets exposure | None found |
