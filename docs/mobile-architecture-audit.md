# Mountain Bakes — Mobile Architecture Audit

**Date:** 2026-08-18
**Scope:** `mountainbakes-server/` (Express + Supabase), `mountainbakes-frontend/` (Next.js static export), and the mobile design docs under `mountain mobile app/desing file for mobile app/`.
**Purpose:** establish the real backend contract before writing mobile feature code, per Phase 1.

Everything below was read out of the code. Where a design document asserts something the code contradicts, the code wins and the contradiction is called out.

---

## 1. System shape

```
   React Web App (Next.js static export)        React Native App (this project)
              │                                            │
              │  Supabase JWT in Authorization: Bearer     │
              └──────────────────┬─────────────────────────┘
                                 ▼
                    Mountain Bakes Express API  (:3001)
                    holds the service-role key,
                    owns ALL privileged writes
                                 │
                                 ▼
                        Supabase / PostgreSQL
```

Both clients authenticate **directly against Supabase Auth** and then call the Express API cross-origin with the resulting JWT. The API verifies the token via `supabaseAdmin.auth.getUser(token)` and authorises in application code.

Authorization is enforced in application code, **not RLS** — the server uses the service-role key, which bypasses RLS entirely. RLS exists as defence-in-depth. The web app's `RouteGuard` is navigation UX, not a boundary; the mobile navigator is the same. **The API re-decides every request.**

---

## 2. The finding that changed the plan: there is no login endpoint

`src/routes/auth.routes.ts` has **no `/login` handler**. The server never mints a JWT — it only verifies one. Sign-in happens client-side:

```js
supabase.auth.signInWithPassword({ email, password })
```

This directly contradicts `stack.md`, which bans `@supabase/supabase-js` in the app ("The app talks to the server. It does not talk to Supabase."). That instruction was written before the backend was audited and is not implementable as stated — there is no server endpoint to call instead.

**Resolution (approved):** the mobile app uses `@supabase/supabase-js` for **auth only**. Every business read and write goes through the Express API. No business table is ever queried directly from the app.

### Auth contract

| Aspect | Value |
|---|---|
| Token | Supabase Auth access JWT |
| Header | `Authorization: Bearer <jwt>` |
| Verification | `supabaseAdmin.auth.getUser(token)` in `src/middleware/auth.ts` |
| Role / branch source | `user.app_metadata.role` / `.branchId` / `.branchName` — server-set claims, never from a request body |
| Refresh | Client-side, by the Supabase SDK. The API has no `/refresh`. |
| Expiry | Supabase project settings, not in this codebase |
| Unrecognised role | **403, fail-closed** |

Password endpoints that DO exist: `POST /api/auth/forgot-password` (super_admin accounts only), `POST /api/auth/change-password`, `POST /api/auth/reset-password` (super_admin), `POST /api/users/:id/reset-password`, `POST /api/auth/finance-lookup` (Finance User ID → email).

Finance has a **separate sign-in** (`/finance-login` on web): lookup ID → email, then `signInWithPassword`, then optional TOTP MFA via `supabase.auth.mfa.*`.

---

## 3. Roles — the eight real values

From `src/shared/types/user.types.ts` (mirrors the Postgres `user_role` enum; drift causes a runtime `22P02`):

```
super_admin
branch_manager
branch_user
production_user
finance_admin
finance_manager
accountant
finance_auditor
```

> Both projects' own `.claude/CLAUDE.md` files claim there are **three** roles. They are stale. The root `CLAUDE.md` documents this.

`branch_user` is a **shift account carrying its manager's `branchId`**, not a branch of its own. Branch-scoped queries must treat it identically to `branch_manager` (`isBranchRole`), or a shift user sees an empty shop. What it may *reach* is narrower — enforced in the API, not the schema.

Finance uses a second, per-action gate — `financeCan(role, permission, allowSuperAdminWrite)`:

| Role | view | create | approve | adjust | configure |
|---|---|---|---|---|---|
| finance_admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| finance_manager | ✓ | ✓ | ✓ | | |
| accountant | ✓ | ✓ | | | |
| finance_auditor | ✓ | | | | |
| super_admin | ✓ | only if `allowSuperAdminWrite` (default **off**) | | | |

---

## 4. Business date — 2:00 AM, not midnight

`src/shared/utils/timezone.ts`, mirrored into this project at `src/shared/utils/timezone.ts`:

- `Asia/Karachi` is treated as a **fixed UTC+5** offset (no DST since 2009), computed with plain `Date` math — no `date-fns-tz`.
- **`BUSINESS_DAY_START_MINUTES = 120`.** The bakery trades 8:00 AM → 2:00 AM. Records from **00:00–01:59 belong to the previous business date**. This is a fixed constant, deliberately *not* settings-driven.
- The order-entry **window** (`ORDER_WINDOW_OPEN_MINUTES = 480`, `ORDER_WINDOW_CLOSE_MINUTES = 120`) *is* settings-driven (`orderStartTime`/`orderEndTime`) and wraps past midnight.
- `assertBusinessDayOpen()` rejects writes against a closed business date for everyone except `super_admin`.

Covered by `src/utils/__tests__/businessDate.test.ts`, which asserts the rollover behaviour directly.

**Consequence for offline:** the API stamps the business date **on receipt**. A sale created at 21:00 and synced at 07:00 would be billed to the wrong — already closed — business day. See §7.

---

## 5. Money

- Postgres `numeric(14,2)` for every monetary column. **Not** floats, **not** integer minor units. Migration `20260719000001` moved off floats specifically because they drifted.
- Quantities are `numeric(14,3)` and **may be negative** on some ledgers by design.
- **PostgREST serialises `numeric` as a JSON string.** An untouched `grandTotal` can arrive as `"1250.00"`; adding it to a number concatenates. `toNumber()` in `src/utils/money.ts` is mandatory at every API boundary.
- Display: `Rs.` + `en-PK` grouping. The tenant-configurable `AppSettings.currencySymbol` is what the web actually renders with.

**Mobile divergence, deliberate:** the web formats via `Number.toLocaleString('en-PK', …)`. Hermes ships an incomplete `Intl` on Android, where that can degrade to ungrouped digits. `formatAmount()` groups by hand and is pinned by `money.test.ts` against values captured from a full-ICU runtime (verified identical across 4,034 values).

**Bug found in the web client (not fixed there):** `parseCurrency` is
`parseFloat(value.replace(/[^0-9.-]/g, ''))`, which keeps the `.` from `"Rs."` and strips the thousands comma — so `parseCurrency('Rs. 1,250')` returns **0.125**. The mobile implementation parses correctly and documents the divergence.

---

## 6. Price-at-transaction-time

- `order_items` snapshots `unit_price`, `product_name`, `category_name` at sale time and is **never re-resolved** through `products` at read time.
- `order_items.product_id` is `ON DELETE SET NULL` (not CASCADE), specifically so historical receipts survive a deleted product.
- `products.price` is the single current active price, changed only by `price.service.ts`, always in the same transaction that appends a `product_price_history` row.
- The web client builds its printed invoice from the **server's response snapshot**, not local product prices — so a price change between opening the form and saving cannot print a stale rate. **Mobile must do the same.**

---

## 7. Idempotency — the blocking gap for offline writes

Exhaustive grep for `idempot|operation_id|client_id|dedupe|Idempotency-Key`:

**No endpoint accepts a client-supplied idempotency key.** None.

What *does* exist is server-internal, database-level dedupe, not an API contract:
- `stock_history` and `production_stock_history` carry `unique (ref_id, product_id, type)`; every stock-moving RPC does `insert … on conflict do nothing` and only applies the balance delta if the insert landed.
- `ref_id` is **server-derived** (an order id, a correction UUID), never caller-supplied.
- `notification_logs`, `claim_business_day_closure`, `price_activation_locks`, `finance_income_approvals` use the same claim-or-noop pattern internally.

The web app's own service worker documents this and keeps its write queue **disabled** for three stated reasons — all three apply verbatim to mobile:

1. **No idempotency keys** — a request the server did process gets applied twice on replay.
2. **Frozen `Authorization` header** — an overnight replay 401s on an expired token, and the replay logic *deletes* 4xx entries.
3. **Business day stamped on receipt** — a demand queued at 9pm and replayed at 7am belongs to a closed day.

### Required backend changes (approved, additive, backward-compatible)

| Change | Endpoints | Why |
|---|---|---|
| Accept `Idempotency-Key` header; store result keyed by it; return the original result on repeat | `POST /api/orders/pos`, `POST /api/orders`, `POST /api/expenses`, `POST /api/production-orders`, `POST /api/stock/return` | Replay safety (1) |
| Accept a client-supplied `businessDate` on those same endpoints, validated against `assertBusinessDayOpen` | same | Correct day attribution (3) |

Problem (2) is solved client-side: the token is attached at send time by an interceptor, never frozen into the queued row.

**Status: IMPLEMENTED** (2026-08-18), both rows, on all five endpoints.

| Where | What |
|---|---|
| `supabase/migrations/20260818000084_idempotency_keys.sql` | `idempotency_keys`, keyed `(user_id, key)`, plus `claim_` / `complete_` / `release_` / `purge_idempotency_key(s)`. The claim IS the lock — the primary key makes exactly one of two concurrent claims land |
| `src/middleware/idempotency.ts` | `idempotent(endpoint, { persistOn? })`. Mounted after `requireRole`, before `validate` |
| `src/utils/clientBusinessDate.ts` | `resolveClientBusinessDate` — bounds a client date (no future, ≤7 business days back) and puts it through `assertBusinessDayOpen` |
| `src/shared/schemas/business-date.schemas.ts` | `optionalBusinessDate`, added to `CreateOrderSchema`, `CreatePosSaleSchema`, `CreateProductionOrderSchema`, `CreateBranchReturnSchema`. Mirrored into both client trees |
| `package.json` | `pnpm purge:idempotency-keys` (dry run by default), since no cron is armed; `pnpm verify:idempotency` to re-check the behaviour after any future migration |

**Applied to the linked database on 2026-08-18** (`supabase db push --linked`; 84 was the only pending migration). `pnpm verify:idempotency` passes all 14 checks against it: first claim granted, repeat reported rather than granted, exactly one of three concurrent claims winning, status and body replayed, mismatched body and mismatched endpoint both refused, release honoured, a *completed* key surviving a release, a backdated claim reading as stale, another user's identical key staying its own claim, and the purge removing nothing recent.

Still to do: **deploy the server** (`git push heroku HEAD:main`). Until then the header is accepted by the schema but no running dyno reads it.

Decisions worth knowing:

- **Only responses worth replaying are stored; everything else releases the key.** A rejected request has no side effect to protect, and storing its refusal would mean a queued sale could replay nothing but that refusal forever. The one exception is a branch return that committed part of its list before a shortfall stopped it (`persistIfCommitted`) — re-running that returns units twice.
- **A stale claim is never auto-retried.** A claim left `in_progress` by a killed process cannot be distinguished from a committed transaction, so a repeat gets a `409` for a person to check rather than a silent second attempt. An operation parked for a human is recoverable; a duplicate sale nobody notices is not.
- **Keys are scoped per user.** The stored body is returned verbatim on replay; a key-only primary key would let a captured key read another account's response.
- **No header, no change.** The web app sends none and behaves exactly as before.

---

## 8. API surface (~140 handlers across 29 route files, all under `/api`)

Mount order matters: `/api/products/price` is registered **before** `/api/products`, and the four specific `/api/finance/...` sub-prefixes **before** the general `/api/finance`.

Endpoints the mobile app will use first:

| Domain | Endpoints |
|---|---|
| Auth | `POST /auth/finance-lookup`, `/auth/forgot-password`, `/auth/change-password`, `GET /auth/me` |
| Branches | `GET /branches`, `GET /branches/:id` |
| Products | `GET /products`, `GET /products/:id`, `GET /products/categories` |
| Orders / sales | `GET /orders`, `GET /orders/:id`, `POST /orders`, `POST /orders/pos`, `POST /orders/production-sale`, `PUT /orders/:id/status` |
| Stock | `GET /stock`, `GET /stock/audit`, `POST /stock/return` |
| Expenses | `GET /expenses`, `POST /expenses` |
| Production orders | `POST /production-orders`, `GET /production-orders`, `GET /production-orders/balances`, `GET /:id/previous-balance`, `PUT /:id/review`, `PUT /:id/cancel`, `PUT /:id/verify`, `PUT /:id/final-approve`, `PUT /:id/printed`, `POST /:id/items` |
| Production | `GET /production/overview`, `/queue`, `/branch-stock`, `PUT /production/:id/status` |
| Reports | `GET /reports/summary`, `/reports/export`, `/reports/packing-usage`, `/reports/branch-comparison` |
| Settings | `GET /settings` |
| Business day | `GET /business-day` |

### Conventions

- **No `{success, data}` envelope.** Bodies are resource-keyed: `{user}`, `{orders, total}`, `{product}`, `{success: true}`. Each caller unwraps its own shape; the API client does not unwrap.
- **Errors are consistent:** `{ error: string, details?: unknown }`. `details` carries `[{field, message}]` on Zod failures. A `code` field appears on only 3 call sites — do not rely on it generally.
- In production, 5xx messages are masked to "Internal server error"; 4xx messages are always user-facing.
- **Effectively no pagination.** No `page` param exists anywhere. The ONE exception is `GET /api/finance/ledger`, which takes `limit`/`offset` (server-capped at 500) and returns a `LedgerPage` with totals — corrected after building the Ledger screen. Every other list returns its full filtered set with `total: array.length`, relying on date-range and `branchId` filters; `limit` is honoured on three further routes, each with its own hardcoded ceiling.
- Geofencing: `X-Geo-Position` header, enforced per-write-route via `requireInsideGeofence` on order create, POS sale, and stock return. Off by default.

---

## 9. Domain values (verbatim — never invent these)

```ts
OrderStatus:    'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
PaymentMethod:  'cash' | 'easypaisa' | 'foodpanda' | 'bank_account' | 'staff'
  // branch/POS validation uses only the first four; 'staff' is production-counter
  // only, takes no money, and is excluded from revenue.
BranchProductionOrderStatus:
  'pending' | 'awaiting_verification' | 'verified' | 'approved' | 'rejected' | 'cancelled'
ProductionStatus:        'pending' | 'preparing' | 'ready'
StockMovementType:       'sale' | 'production' | 'return' | 'adjustment'
ExpensePaymentMethod:    'cash' | 'easypaisa'
EXPENSE_CATEGORIES: Ingredients, Packaging, Utilities, Rent, Salaries,
                    Maintenance, Transport, Equipment, Other
```

The mobile design docs' status colour map used `waiting / reviewed / in_production / prepared / delivered / returned` — **none of which are real backend values**. `src/theme/colors.ts` is keyed to the real enums instead.

**There is no Vendor entity anywhere in the codebase**, despite the master prompt calling for a Vendors screen. A retail POS sale and a delivery order are both an `Order`; there is no separate `Sale` type.

---

## 10. Production order workflow

```
branch POST                → pending
production PUT /review     → awaiting_verification  (or rejected)
branch PUT /verify         → verified               ← stock moves on counted receipt
production PUT /final-approve → approved
branch PUT /cancel         → cancelled  (before review; cancelReason mandatory)
```

`previousBalanceQty` / `totalRequiredQty` / `remainingBalanceQty` on order items are **dead as of migration 74** — carry-forward was removed; new rows always write `0 / qty / 0`. They survive only to render pre-migration orders. Do not reintroduce them into any calculation.

`GET /:id/previous-balance` bills the **immediately preceding delivered order** (branches can receive several deliveries a day), nets off returns created strictly between the two timestamps, and applies `companySharePct` (per-branch override → global → default 75). It does **not** track whether the previous order was settled — a reprint shows the same figure every time.

**RESOLVED from the SQL.** Migration `20260810000058_verify_moves_stock.sql` states the lifecycle explicitly: Production's review moves **no stock**; stock moves at `verified`, when the branch confirms what actually arrived, so the pool is debited once for the counted quantity. **Three comments in the server tree still describe the older behaviour and are wrong** — `production-orders.routes.ts` (review handler), `production-order.types.ts` (type doc header), and `production-order.schemas.ts` (~line 160). Worth correcting server-side.

---

## 11. Known problems inherited

| Issue | Impact on mobile |
|---|---|
| No client-facing idempotency | Blocks safe offline writes — §7 |
| No pagination on any list endpoint | Large date ranges transfer everything; must constrain by date/branch |
| All three cron schedulers are **disabled** (`server.ts`, commented out) | Daily closing, price activation and event reminders never fire automatically |
| No test framework in either sibling project | Mobile is the first tree with tests; backend changes need manual verification |
| Response envelope inconsistent across ~140 handlers | Per-endpoint typing; no generic unwrap |
| `push.service.ts` web push is a `TODO` no-op | Push notifications are not available to build against |
| Web `parseCurrency` mis-parses `"Rs. 1,250"` → `0.125` | Not mirrored; see §5 |
| Production stock-move step documented two ways | Must be resolved from SQL before Phase 7 |

---

## 12. Offline & security risks

**Offline**
- Business date must be computed **on device at creation time** and sent explicitly (needs the §7 backend change).
- Sync must respect dependency order — never send a dependent before its prerequisite exists.
- Server remains authoritative for money and stock; the client computes previews only.
- Stock balances are deliberately allowed to go negative except on sale and branch-return paths, which reject overdrawing with **409** plus per-product shortfall detail. Conflicts must surface, not be swallowed.
- Sign-out must never clear unsynced local data.

**Security**
- The service-role key must never enter the app. Only the Supabase URL + anon key ship, and they are public by design.
- `react-native-config` values are readable from the APK — public config only.
- Tokens live in encrypted MMKV whose key is held in the Keychain/Keystore. Passwords are never stored.
- Never trust from the client: `price`, `total`, `branchId`, `userId`, `stock`, `permissions`. The server validates all of them.
- Sentry must scrub `Authorization` headers and customer phone numbers before release.

---

## 13. Decisions taken

| Decision | Rationale |
|---|---|
| React Native **0.86.2**, not 0.87 | `react-native-reanimated@4.5.3` declares peer `react-native: "0.83 - 0.86"`. Reanimated is a transitive peer of React Navigation, victory-native and bottom-sheet. Exactly the lag the design doc predicted. |
| `@supabase/supabase-js` for auth only | No server login endpoint exists — §2 |
| `src/shared/` mirrored from the server | Third copy of an already-mirrored directory; guarded by `npm run shared:check` |
| `zod` pinned to **v3** | Matches the shared schemas; v4 would break them |
| npm, not pnpm | RN autolinking is most reliable on npm's flat layout. Siblings use pnpm; this is a deliberate divergence. |
| `react-native-print` **not installed** | Its `react-native-windows` peer is mandatory and pins RN 0.84.1, forcing `--legacy-peer-deps` across all 1,000+ packages. Production slips will be rendered server-side (the server already depends on `pdfkit`) and shared via the native share sheet — which is also what §51 of the master prompt prefers. |
| Offline engine **before** role screens | Resolves the phase-ordering contradiction between `phases.md` and `mountain-bakes-rn-agentic-prompt.md`, per approval |

---

## 14. Document contradictions resolved

| Contradiction | Resolution |
|---|---|
| `stack.md` bans the Supabase SDK; no server login exists | SDK used, auth only |
| `phases.md` puts offline at phase 8; the newer prompt gates on it | Offline engine first |
| Two different `sync_queue` schemas across docs | Use the SQL version in `mountain-bakes-rn-agentic-prompt.md` §5.1 (concrete, includes indexes and the `blocked` status) |
| `victory-native` locked vs. offered as a choice | `victory-native`, per the locked stack |
| Unistyles/NativeWind suggested but absent from the locked stack | Neither. Theme tokens + `StyleSheet.create`, per `design-system.md` |
| `backend-contract.md` is named as a contract but contains no endpoints | It is a discovery procedure. This document is its output. |
| Design tokens exist only in a file the skill never references | Tokens transcribed into `src/theme/`; status colours corrected to real enums |
