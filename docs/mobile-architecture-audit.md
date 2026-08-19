# Mountain Bakes — Mobile Architecture Audit

**Date:** 2026-08-18 · **re-inspected 2026-08-19**
**Scope:** `mountainbakes-server/` (Express + Supabase), `mountainbakes-frontend/` (Next.js static export), and the mobile design docs under `mountain mobile app/desing file for mobile app/`.
**Purpose:** establish the real backend contract before writing mobile feature code, per Phase 1.

Everything below was read out of the code. Where a design document asserts something the code contradicts, the code wins and the contradiction is called out.

> **Re-inspection, 2026-08-19.** The whole server tree was read again against this
> document — 32 route files, 78 migrations, every service and middleware. §1–§7,
> §9–§10 and §12–§14 were confirmed unchanged. §8's handler count was **wrong and
> is corrected below**. Nothing new has been applied to the database: migration 84
> is still the head. What the original pass did not cover at all — the table list,
> the relationship map, and the sales / stock / expense / product / report
> workflows — is now §15–§23, and three new findings are in §24.

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

## 8. API surface — **196 handlers across 32 route files**, all under `/api`

> Corrected 2026-08-19. The original "~140 across 29" undercounted; the real
> figures are `196` route registrations across `32` `*.routes.ts` files plus
> `index.ts`. Counted with
> `grep -rhoE "^\s*router\.(get|post|put|patch|delete)\(" src/routes/*.ts | wc -l`.
> The full inventory, with the guard on every route, is §23.

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

---

## 15. Database tables

62 distinct tables are created across the 78 migrations; **5 have been dropped**,
leaving **57 live tables**. Grouped by the surface that owns them — the twelve
groups below account for all 57.

| Group | Tables |
|---|---|
| Identity | `users` (PK is `auth.users.id`), `audit_logs`, `push_subscriptions` |
| Branches | `branches`, `branch_locations`, `branch_user_requests`, `geofence_logs` |
| Catalogue | `categories`, `products`, `product_price_history`, `packing_materials` |
| Selling | `customers`, `orders`, `order_items` |
| Branch stock | `stock`, `stock_history`, `stock_audit_log` |
| Production | `production_orders`, `production_order_items`, `production_order_packing_items`, `production_balances`, `production_returns`, `production_stock`, `production_stock_history` |
| Money out | `expenses` |
| Finance ledger | `ledger_heads`, `ledger_entries`, `finance_transactions`, `finance_income_approvals`, `finance_day_closings`, `finance_settings`, `finance_audit_logs`, `finance_tickets` |
| Payroll & partners | `finance_employees`, `salary_revisions`, `salary_payments`, `finance_partners`, `partner_expenses`, `branch_share_payments` |
| Special events | `special_events`, `event_branches`, `event_branch_demands`, `event_branch_demand_items`, `event_production_status`, `event_notifications` |
| Closing & notifications | `business_day_closures`, `daily_closing_reports`, `notification_recipients`, `notification_logs`, `notifications`, `notification_reads` |
| System | `settings`, `counters`, `attachments`, `support_tickets`, `price_activation_locks`, `idempotency_keys` |

**Dropped, and not to be reintroduced:** `chats`, `chat_messages`,
`chat_participants` (migration 30), `user_presence` (30), `production_expenses`
(63 — the shared `expense.schemas.ts` comment citing "migration 59" is wrong;
no such migration ever existed, the numbering ran 58 → 60).

Two tables the mobile app must never read directly, or at all: `idempotency_keys`
is server-internal bookkeeping, and `finance_audit_logs` is append-only and
trigger-protected (`app.finance_audit_immutable`).

## 16. Database relationships

Extracted from the `references` clauses in the migrations. **The `on delete`
policy is the design, not an afterthought** — three distinct policies, each
meaning something:

- **`set null`** — the row survives its parent. Every `created_by` / `approved_by`
  / `changed_by` is `set null` on `users`, so deleting a member of staff does not
  delete the sales they rang up. `order_items.product_id` is `set null` for the
  same reason: a historical receipt outlives a deleted product (§6).
- **`restrict`** — the parent cannot be deleted while children exist. Guards money
  and stock: `orders.branch_id`, `expenses.branch_id`, `production_orders.branch_id`,
  every `ledger_entry_id`, every `ledger_head_id`, and **every `product_id` on a
  stock table** (`stock`, `stock_history`, `production_stock`, `production_balances`).
- **`cascade`** — the child is meaningless alone: `order_items → orders`,
  `production_order_items → production_orders`, `event_* → special_events`,
  `stock → branches`, `product_price_history → products`, `users → auth.users`.

The spine, in one picture:

```
auth.users ──1:1── users ──*──> branches
                     │             │
       created_by ───┤             ├──*──> stock ──────*──> products <──* categories
       (set null)    │             │         (restrict)                    (restrict)
                     │             ├──*──> stock_history        │
                     ▼             │                            ├──* product_price_history (cascade)
                  orders ──*──> order_items ────────────────────┘   (products.price is the
                     │  (cascade)   (product_id set null)               single active price)
                     └──> customers (set null)

branches ──*──> production_orders ──*──> production_order_items ──> products
                        │        (cascade)                          (set null)
                        └──*──> production_order_packing_items ──> packing_materials

production_stock / production_stock_history / production_balances ──> products (restrict)
                                     production_balances ──> branches (cascade)

ledger_heads ──*──> ledger_entries <──── finance_transactions / partner_expenses /
   (restrict)   (self-ref: reverses_entry_id, reversed_by_entry_id)  salary_payments /
                                                                     branch_share_payments
```

`ledger_entries` referencing itself twice (`reverses_entry_id`,
`reversed_by_entry_id`) is how the finance ledger stays append-only: a mistake is
reversed by a **new** entry that points at the one it cancels, never by an
update.

## 17. Product and pricing workflow

```
super_admin only:  POST /api/products · PUT /api/products/:id · DELETE /api/products/:id
                   POST /api/products/categories (+ PUT, DELETE)
everyone reads:    GET  /api/products · GET /api/products/:id · GET /api/products/categories
```

- `products.price` is **the one current active price**. There is no price list to
  join and no per-branch price.
- It is only ever changed through `price.service.ts`, which writes the new price
  and appends a `product_price_history` row **in the same transaction**
  (`public.apply_price_change`). A price change is never a bare `update products`.
- Future-dated changes sit at `price_change_status = 'scheduled'` and are promoted
  by `public.activate_due_prices()` at 02:00 Karachi — **which no longer runs**:
  the scheduler is commented out in `server.ts` (§11). Scheduled prices therefore
  activate only when someone triggers activation.
- `price_activation_locks` + `claim_price_activation` / `close_price_activation`
  make activation claim-or-noop, so two triggers cannot double-apply.
- Bulk changes arrive as a spreadsheet: `POST /api/products/price/import/preview`
  (multipart) then `/import/commit`. `price_change_source` records `manual` vs
  `import`.

**For mobile:** the app reads products and never writes a price. It must not
cache `price` across a session boundary without revalidating — see
`docs/cache-policy.md`.

## 18. Sales workflow

Two different writes land in the same `orders` table. **There is no `Sale` entity.**

| | Retail / POS | Delivery order |
|---|---|---|
| Endpoint | `POST /api/orders/pos` | `POST /api/orders` |
| Idempotency | `idempotent('sale.create')` | `idempotent('order.create')` |
| Geofence | `requireInsideGeofence` | `requireInsideGeofence` |
| Customer | name + phone, optional | `customers` row, resolved or created |
| Stock | moves **immediately**, inside `commit_sale` | reserved by status flow |
| Grand total | `subtotal + taxAmount` | `subtotal + deliveryCharges + taxAmount` |

**The arithmetic, verbatim from `orders.routes.ts`:**

```
unitPrice   = products.price          ← read server-side, per product, at save time
lineTotal   = unitPrice * qty - discount
subtotal    = Σ lineTotal             ← already net of discount
taxAmount   = round(subtotal * taxRate, 2)
grandTotal  = subtotal [+ deliveryCharges] + taxAmount
cashReturned = round(receivedCash - grandTotal, 2)   ← POS only; < grandTotal is a 400
```

**The client never sends a price.** `buildOrderItems()` re-reads every
`products.price` in one query and computes the line itself, so a price change
between opening the form and saving cannot be printed. Tax applies to the
**discounted** subtotal, because the discount is already inside `lineTotal`.
`src/utils/saleTotals.ts` in this app reproduces exactly this and is a *preview*
only — the receipt is printed from the server's response.

`public.commit_sale(order, items, branchId, businessDate)` does the whole POS
write in one transaction:

1. locks every `stock` row **in `product_id` order** — the deadlock guard;
2. compares each requested qty against the locked balance and, if any line is
   short, returns `{status:'insufficient', shortfalls:[{productId, productName,
   requested, available}]}` **without writing anything** → the route turns that
   into a **409 with per-product detail**;
3. otherwise inserts `orders` + `order_items`, applies the balance deltas and
   appends `stock_history`.

Order status moves `pending → preparing → ready → delivered`, or `cancelled`,
through `PUT /api/orders/:id/status`. A **`staff`** payment method exists for the
production counter only (`POST /api/orders/production-sale`): it takes no money
and is **excluded from revenue** in every report.

## 19. Stock workflow

Two independent pools, never one number:

- **Branch stock** — `stock` (balance per branch × product), journalled in
  `stock_history`, movement types `sale | production | return | adjustment`.
- **Production pool** — `production_stock`, journalled in
  `production_stock_history`, movement types `prepare | transfer_out | return_in |
  adjustment | sale` (the last two added in migrations 49 and 34).

Every movement goes through an RPC, never a bare update:
`apply_stock_movement`, `apply_stock_correction`,
`apply_production_stock_movement`, `apply_production_stock_correction`,
`commit_sale`, `commit_branch_return`, `commit_production_sale`,
`verify_production_order`.

**Dedupe is server-internal.** `stock_history` and `production_stock_history`
carry `unique (ref_id, product_id, type)`; every mover does
`insert … on conflict do nothing` and applies the balance delta **only if the
insert landed**. `ref_id` is server-derived — an order id, a correction UUID —
and is *not* a client idempotency key (that is §7's separate mechanism).

Balances may go negative by design on adjustment paths. The two paths that
refuse to overdraw are **sale** and **branch return**, both with a 409 carrying
per-product shortfall detail. `POST /api/stock/return` pre-validates the whole
list before writing a single row, and is the one endpoint whose idempotency
record persists on partial failure (`persistIfCommitted`) — re-running it would
return units twice.

`GET /api/stock` is **hard-capped at 200 rows** (§24).

## 20. Expense workflow

```
GET  /api/expenses   → last 7 business days only, branch-scoped by isBranchRole
POST /api/expenses   → idempotent('expense.create') + CreateExpenseSchema
```

- Branch is taken from `req.user.branchId`, never the body; no branch on the
  account is a **400**.
- `date` in the API is the **`business_date` column** — the route remaps it on
  read and `resolveClientBusinessDate` bounds it on write (no future, ≤7 business
  days back, closed days refused). This is why `services/sync/endpoints.ts` in
  this app sends `date` for expenses and `businessDate` everywhere else.
- `expense_payment_method` is `cash | easypaisa` **only** — narrower than an
  order's four.
- Categories are the nine in §9. There is no vendor, no attachment, and no
  approval step: a branch expense is recorded, not requested.
- Every row gets an `EXP-######` number from the shared counter (§22).

`GET /api/expenses` returning only seven business days is a real product
constraint, not a default — an expenses screen cannot show last month.

## 21. Reports

`GET /api/reports/summary?period=&from=&to=` is the one the dashboards use. Its
rules, from `reports.routes.ts`:

- **`cancelled` orders are excluded** from every money figure but still counted
  in `totalOrders` and `totalCancelled`.
- **`staff` sales are excluded from revenue** and reported separately as
  `staffTotal`, or profit would be overstated by whatever the counter consumed.
- Day and expense buckets group on the **stored `business_date`**, never on
  `created_at` recomputed client-side.
- `totalProfit = totalRevenue − totalExpenses`, both over the same range.
- The range filter itself is on `created_at`, while the grouping is on
  `business_date` — so an order rung up at 01:00 sits in the previous business
  day's bucket but inside the current day's range.
- The whole router is `requireRole('super_admin', 'branch_manager')`. Production
  and every finance role get 403 here; production has its own
  `/api/production-reports/summary`.

- The response carries four rollups of the same money — `branchData`,
  `topProducts` (capped at ten), `paymentMethodBreakdown` and
  `categoryBreakdown` — so a client switching between them re-renders rather
  than re-asks. `categoryBreakdown` was **added for the mobile Reports screen**
  and is computed over every line in range, not folded out of `topProducts`: the
  top ten would report a fraction of each category under the category's own
  name. It is optional in `ReportSummary` because the app ships on its own cycle
  and can be newer than the API it is talking to.
- **Nothing is paginated and nothing is capped except `topProducts`.** The route
  pulls every order in range *with its embedded line items* into the dyno and
  aggregates in Node — its own comment calls moving the group-bys into SQL the
  deferred follow-up. That is why the mobile range chips stop at a month and a
  custom window, and offer no "year".

Other report surfaces: `/reports/packing-usage`, `/reports/branch-comparison`
(super_admin only), `/reports/export` (ExcelJS), `/api/finance/reports` behind
`requireFinance('view')`, `/api/production-reports/*`.

## 22. Identity, numbering and timestamps

**Primary keys** are `uuid default gen_random_uuid()` everywhere except `users`,
whose PK *is* `auth.users.id`.

**Human-readable numbers** come from a `counters` row plus a
`next_*_number()` allocator, deliberately **not** a Postgres sequence — sequences
leave gaps on rollback, and the counter's `update … returning` is atomic under
row locking:

| Prefix | Entity | Allocator |
|---|---|---|
| `MB-######` | Sales / orders | `next_order_number()` |
| `EXP-######` | Expenses (branch **and** production share one counter) | `next_expense_number()` |
| `DMD-######` | Production demand | `next_demand_number()` |
| `PRC-######` | Price history | `next_price_number()` |
| `STK-######` | Stock rows | `next_stock_number()` |
| `TKT-######` | Support tickets | `next_ticket_number()` |
| finance series | Receipts / vouchers | `app.next_finance_number()` (migration 71) |

Each is the column **default**, so rows inserted by an RPC get one without any
application code allocating it. `app.forbid_counter_removal` stops a counter row
being deleted out from under them.

**Timestamps.** `created_at timestamptz default now()`, `updated_at` maintained
by the `app.touch_updated_at()` trigger — **routes must not set either by hand**
(`orders.routes.ts` says so in a comment). `business_date` is a separate `date`
column and is the only one any report groups on; it is stamped by
`resolveClientBusinessDate` on the five offline-capable writes and by the server
clock everywhere else. The 02:00 rollover means `created_at::date` and
`business_date` legitimately disagree for two hours every night.

## 23. Complete endpoint inventory, and what mobile does with each

Every route registration, with the guard actually applied (router-level guards
are folded in). `auth` = `authenticate` only. **Reuse** = usable as-is;
**Modify** = needs a server change before mobile can use it; **—** = not a mobile
surface.

| Mount | Route | Guard | Mobile |
|---|---|---|---|
| `/api/auth` | `POST /finance-lookup` · `/forgot-password` · `/change-password` · `GET /me` | auth | **Reuse** |
| | `POST /set-custom-claims` · `/reset-password` | super_admin | — |
| `/api/users` | `GET /` `/:id` `/activity`, `POST /` `/:id/activate` `/:id/reset-password`, `PUT /:id`, `DELETE /:id` | auth (+ per-handler checks) | — |
| `/api/branches` | `GET /` `/:id` | auth | **Reuse** |
| | `POST /` `PUT /:id` `DELETE /:id` | super_admin | — |
| `/api/branch-locations` | `GET /me`, `POST /verify` | auth | **Reuse** (geofence) |
| | `GET /` `/logs`, `PUT`/`PATCH`/`DELETE /:branchId` | super_admin | — |
| `/api/branch-user-requests` | `GET /` | super_admin, branch_manager | **Reuse** |
| | `POST /` | branch_manager | **Reuse** |
| | `POST /:id/approve` `/reject` | super_admin | — |
| `/api/products/price` | `GET /history` `/list/export` `/history/export`, `POST /import/preview` `/import/commit` | auth | — |
| `/api/products` | `GET /` `/:id` `/categories` | auth | **Reuse** |
| | `POST`/`PUT`/`DELETE` products & categories, `POST /:id/price` | super_admin | — |
| `/api/packing-materials` | `GET /` `/:id` | auth | **Reuse** |
| | `POST` `PUT` `DELETE` | super_admin | — |
| `/api/customers` | `GET /` `/:id` | auth | **Reuse** |
| | `POST /` `PUT /:id` | super_admin + branch roles | **Reuse** |
| `/api/orders` | `GET /` `/:id` | auth | **Reuse** |
| | `POST /` | idempotent + geofence + super_admin/branch | **Reuse** (offline) |
| | `POST /pos` | idempotent + geofence + super_admin/branch | **Reuse** (offline) |
| | `POST /production-sale` | super_admin, production_user | **Reuse** |
| | `GET /production-sales` | super_admin, production_user | **Reuse** |
| | `PUT /:id/status` | auth | **Reuse** |
| `/api/production` | `GET /overview` `/queue` `/branch-stock`, `PUT /:id/status` | super_admin, production_user | **Reuse** |
| `/api/production-orders` | `POST /` | idempotent + branch roles | **Reuse** (offline) |
| | `GET /` `/balances` | auth | **Reuse** |
| | `PUT /:id/verify` `/cancel` | branch roles | **Reuse** |
| | `GET /:id/previous-balance`, `PUT /:id/review` `/final-approve` `/printed`, `POST /:id/items` | super_admin, production_user | **Reuse** |
| `/api/production-stock` | `GET /`, `POST /prepare` | super_admin, production_user | **Reuse** |
| `/api/production-returns` | `GET /`, `POST /`, `PUT /:id/review` | super_admin, production_user | **Reuse** |
| `/api/production-reports` | `GET /summary` `/export` | auth | **Reuse** |
| `/api/expenses` | `GET /` | auth | **Reuse** (7-day window) |
| | `POST /` | idempotent + super_admin/branch | **Reuse** (offline) |
| `/api/stock` | `GET /` `/audit` | auth | **Reuse** (200-row cap) |
| | `POST /return` | idempotent + geofence + super_admin/branch | **Reuse** (offline) |
| `/api/reports` | `GET /summary` `/packing-usage` `/export` | super_admin, branch_manager | **Reuse** |
| | `GET /branch-comparison` | super_admin | **Reuse** |
| `/api/search` | `GET /` | auth | **Reuse** |
| `/api/support` | `GET /lookup` `/`, `POST /`, `PATCH`/`DELETE …` | auth (+ per-handler) | **Modify** — see §24 |
| `/api/closing-notifications` | `GET /reports` | auth | **Modify** — see §24 |
| | recipients CRUD, `/logs`, `/provider`, `POST /dispatch` | super_admin | — |
| `/api/special-events` | 24 handlers — events, demands, production stages, notifications | mixed | **Reuse** (unbuilt in app) |
| `/api/settings` | `GET /` | auth | **Reuse** |
| | `PUT /`, `POST /logo` | super_admin | — |
| `/api/business-day` | `GET /` | auth | **Reuse** |
| | `GET /closures`, `POST /close` | super_admin | — |
| `/api/attachments` | `POST /` (multipart) | auth | **Reuse** |
| `/api/finance/*` | 55 handlers across 7 routers — ledger, income, payroll, partners, branch-share, reports, tickets | `requireFinance(view\|create\|approve\|adjust\|configure)` | **Reuse** |

### APIs that required modification — done

Both rows of §7, on all five offline-capable writes: `Idempotency-Key` and a
client-supplied business date. Applied to the database 2026-08-18 (migration 84).

### APIs that still require modification

| What | Why |
|---|---|
| `GET /api/stock` — remove or expose the 200-row cap | Silent truncation for a branch carrying more than 200 products (§24) |
| `GET /api/support/lookup`, `GET /api/closing-notifications/reports` — scope with `isBranchRole` | A `branch_user` currently falls through to the unscoped admin path (§24) |
| Any list endpoint — real pagination | Only `GET /api/finance/ledger` takes `limit`/`offset`. Everything else returns its whole filtered set with `total = array.length` |
| `GET /api/expenses` — a date range | Seven business days is hardcoded; there is no way to ask for last month |

### Missing APIs

| Missing | Consequence for mobile |
|---|---|
| **No notification read endpoint.** `notifications` / `notification_reads` tables exist and `push.service.notify()` writes rows, but nothing is mounted at `/api/notifications` | The app's Notifications row is a placeholder. An inbox cannot be built |
| **No push transport.** `sendPush()` is `// Intentionally a no-op` with a `TODO(push)` | No device can be woken. `routeForNotification` is tested ahead of a transport that does not exist |
| **No order/demand slip PDF.** `pdfkit` is used by three *export* services (reports, finance, production) — none renders a delivery slip | The app renders the slip itself and shares plain text (§13) |
| **No conflict-resolution endpoint** | A 409 from a queued write is parked for a human; there is no server-side "resolve" call to make |

## 24. Findings from the 2026-08-19 re-inspection

Four new items, none of which existed in the original audit. The first two are
the same defect in two places.

**1. `branch_user` is not scoped on two endpoints — it gets the admin view.**
`branch_user` arrived in migration 65, after these handlers were written. They
branch on the literal role string and treat *everything else* as the unscoped
admin case:

| Endpoint | Guard | What a `branch_user` sees |
|---|---|---|
| `GET /api/support/lookup?referenceId=` | `authenticate` only | **Any branch's sale or demand.** `resolveReference` scopes only `branch_manager` (to its branch) and `production_user` (to the counter) |
| `GET /api/closing-notifications/reports` | `authenticate` only | **Every branch's daily closing report**, plus company-scope rows — 200 most recent. The four finance roles land in the same else-branch |

The fix is `isBranchRole(role)` — already exported from `@mb/shared` and already
used correctly in `orders`, `stock`, `expenses`, `customers`, `search`,
`production-orders`, `special-events` and `attachments`.

**Checked and clean:** `reports.routes.ts` uses the same literal in four places
but its router carries `requireRole('super_admin', 'branch_manager')`, so no
other role reaches it — the mobile app's assumption that Reports 403s a shift
account is correct. `branch-user-requests` is likewise guarded, and
`GET /api/support/` scopes non-admins to `raised_by = own uid`.

**2. `GET /api/stock` is capped at 200 rows with no signal.**
`stock.routes.ts:30` ends `.limit(200)`. There is no `total`, no `hasMore`, and
no `limit` parameter — a branch carrying more than 200 products gets a silently
short list, and the app's Stock screen would show it as complete. It is the only
list the app renders where truncation is invisible rather than merely slow.

**3. The rate limit is 500 requests / 15 minutes per IP** (`app.ts:36`,
`express-rate-limit`, applied globally before the routers). A sync drain that has
been offline for a day sends one request per queued row — several hundred rows
from one shop on one Wi-Fi router is a plausible burst, and every branch shares
an IP. The drain's failure classification treats a 429 as… nothing: it is not
network, not 5xx, not 401, not 409, so it parks the row as a **4xx judgement**
and stops retrying. **This is the highest-value follow-up in this document:**
`services/api/errors.ts` should map 429 to a retryable kind that honours
`Retry-After`.

**4. `GET /api/expenses` is a fixed seven-business-day window** — see §20. Not a
default, not a parameter. Any "expenses this month" screen needs a server change.

### Confirmed unchanged since 2026-08-18

Migration head is still `20260818000084_idempotency_keys.sql` (78 files, numbering
to 84 with gaps at 19–23 and 59). All three schedulers are still commented out in
`server.ts`, which still logs `[scheduler] … are OFF` at boot. The eight roles,
the 02:00 business day, the money representation, the price-at-transaction-time
rule and the production-order lifecycle are all exactly as §3–§6 and §10
describe.
