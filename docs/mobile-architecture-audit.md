# Mobile architecture audit

Source spec: `.claude/branchApp.md`, visual/workflow reference `design UIandUX/mountainbakesBranch.html`.
This supersedes `.claude/CLAUDE.md`'s light-theme direction (kept only for its original
business-logic sections, not its visual direction — see the theme decision below).

## Repository shape

Monorepo: `backend/` (Express + TypeScript REST API, Postgres), `frontend/` (web app),
`mobile/` (this React Native CLI 0.87 + TypeScript app), root `docs/`. Mobile talks to
`backend/` over plain axios/REST (`mobile/src/api/client.ts`) — no Supabase SDK is
actually used despite an earlier mention in CLAUDE.md.

## Existing mobile feature inventory (as of the branchApp.md adoption)

| Feature folder | Screens | Backend it calls | branchApp.md screen(s) |
|---|---|---|---|
| `auth` | LoginScreen | `POST /auth/login`, `/refresh`, `GET /auth/me`, `POST /auth/logout` | 02c Login |
| `dashboard` | HomeDashboardScreen | `GET /reports/summary`, `GET /sales-analytics`, `GET /stock/history` | 03 Home |
| `orders` | OrdersListScreen, CreateOrderScreen | `GET/POST /production-orders`, `GET /packing-materials` | 04 New Orders, 05 Create Order |
| `sales` | SalesListScreen, NewSaleScreen | `GET /orders?status=delivered`, `POST /orders/pos` | 09 Sales, 10 New Sale |
| `stock` | StockOverviewScreen | `GET /stock` | 11 Stock (partial) |
| `placeholder` | ComingSoonScreen | — | fallback for anything below not yet built |

**Correction from Slice 1's assumption (found while building Slice 2):** branchApp's "New
Orders" (04) / "Create Order" (05) screens are NOT `backend/src/routes/orders.routes.ts`
(`POST /api/orders`, which requires a `customerId` against the `customers` collection —
there is no customer concept anywhere in the 04/05 HTML reference). They are the branch's
daily **production demand** to the central kitchen: `backend/src/routes/production-orders.routes.ts`
(`BranchProductionOrder`, `demand_number` DMD-######, statuses
pending → awaiting_verification → verified → approved, or rejected/cancelled). The
original `OrdersListScreen` (built in an earlier session against `GET /api/orders`) was
pointed at the wrong endpoint and has been corrected in Slice 2 — see
`mobile-implementation-plan.md`. `GET /api/orders` / `POST /api/orders/pos` remain correct
for Sales (09/10), unchanged.

**All 28 branchApp.md screens are now addressed** (Slices 1–11), with two deliberate
exceptions — see `mobile-implementation-plan.md`'s open items for why:

- Branch Closing (20) — no JSON read endpoint exists server-side (`/export` only);
  building it would mean duplicating `computeClosingTotals` client-side.
- Special Events (18) Calendar view — List view ships; no month-calendar component
  exists in this app yet.

## Theme

Decision (confirmed with the project owner): the app is fixed to a single dark "Branch"
theme ported from the HTML reference's default "Midnight" mood — no OS light/dark toggle,
no user-facing theme switch. `shared/theme/colors.ts`'s `darkColors` is the live palette;
`lightColors` (CLAUDE.md's original cream theme) is kept in the file, unused, in case a
future non-Branch-role surface wants it.

## Roles and scope

`UserRole` (`api/types.ts`) is confirmed to match the backend's `user.types.ts` exactly:
`super_admin | branch_manager | production_user | finance_admin | finance_manager |
accountant | finance_auditor`. `BRANCH_ROLES = ['branch_manager']` server-side is the
entire scope of this 28-screen build — no finance-role screens belong here (see the
"Finance Ledger sign-in" note in the implementation plan).

## Business-date rule

Confirmed real and pervasive server-side: every write stamps `business_date` using a
02:00 Asia/Karachi rollover (`backend/src/shared/utils/timezone.ts`), never re-derived
downstream from `created_at`. Mobile's `api/businessDate.ts` mirrors this; the server is
still the final arbiter via `resolveClientBusinessDate` — mobile may propose a date, never
dictate one.

## Geofencing

Real server-side enforcement (`backend/src/middleware/requireInsideGeofence.ts`), mounted
on order/sale/stock-return creation only (not on expense/cash-transfer/discount creation).
Fails closed if the geofence lookup itself fails. Mobile's `api/geo.ts` already sends the
required `X-Geo-Position` header; treat client GPS as a UX nicety, never a security
boundary — the server 403s outside-radius requests regardless of what the client believes.

## Status

See `mobile-implementation-plan.md` for the slice-by-slice plan and status; this audit is
updated as each slice confirms or corrects an assumption.

## Audit refresh — 2026-10-14

Independent re-verification pass (read-only; no code written). Re-checked the claims
above directly against the current tree rather than assuming the prior slices still hold.

- **`config/env.ts`** now points `apiBaseUrl` at the live Railway deployment
  (`https://mountainbakes-server-production.up.railway.app/api`) instead of localhost —
  a recent, unrelated fix, confirmed not to affect anything audited here.
- **`npx tsc --noEmit`** (mobile/): clean, 0 errors.
- **`npx eslint .`** (whole `mobile/` tree, `--max-warnings=0`): reports 17 errors + 581
  warnings — but every one of the 17 errors (`no-undef` on `DOMParser`/`location`/`Node`/
  `customElements`/`HTMLElement`, `no-new-func`, one `react-hooks/exhaustive-deps`) is in
  `design UIandUX/support.js`, the browser-only JS behind the HTML mockup, not app source
  — there's no `.eslintignore` and no `ignorePatterns` in `.eslintrc.js` (`root: true,
  extends: '@react-native'` only), so a bare `eslint .` lints that file too. Scoped to
  `src/` (the convention every prior slice actually used, per `mobile-testing-report.md`),
  it's 0 errors / 581 warnings — all pre-existing `react-native/no-inline-styles` and
  `no-void`, no new category. Recommend adding `design UIandUX/` to an `ignorePatterns`
  array so a future `eslint .` (e.g. a CI step that doesn't know the project's `eslint src`
  convention) doesn't false-positive on 17 "errors" that aren't in the app at all.
- **Auth/token storage** (`src/state/authStore.ts`, `src/api/client.ts`): refresh token in
  `react-native-keychain` (`KEYCHAIN_SERVICE = 'com.mountainbakes.branch.refreshToken'`,
  authStore.ts:9,32-43); access token lives only in the in-memory zustand store, never
  persisted to AsyncStorage/disk (authStore.ts:17,48); `AsyncStorage` is used only for the
  non-sensitive "remembered email" string and the onboarding-seen flag. 401 handling in
  `api/client.ts:62-75` retries exactly once after a refresh, skips refresh entirely for
  `/auth/login`/`/auth/refresh` themselves (client.ts:59,66), and calls
  `onSessionExpired()` → forced sign-out if refresh fails. Role-based navigation is a
  single decision point, `src/navigation/RootNavigator/index.tsx:40-43`: `branch_manager`
  → `DrawerNavigator`, `production_user` → `ProductionDrawerNavigator`, the four finance
  roles → `FinanceDrawerNavigator` (a static placeholder, confirmed at
  `FinanceDrawerNavigator/index.tsx:14-29` — "isn't built yet in this phase"), anything
  else (`super_admin`) → `UnsupportedRoleView`, never a silent fallback.
- **Idempotency keys** (`generateIdempotencyKey`, `api/client.ts:96-99`) are confirmed
  actually sent (not just defined) for: `createPosSale` (New Sale,
  `salesService.ts:28,32`), `createProductionOrder` (Create Order,
  `productionOrderService.ts:19,22`), `createExpense` (New Shop Expense,
  `expenseService.ts:13,16`), `createBranchReturn`/`revise`/`withdraw` (Return Items/Return
  Stock, `stockReturnService.ts:23-48`), and `createCashTransfer` (Cash Deposit,
  `cashTransferService.ts:19-22`). **Not** used for `createBranchDiscount` (Request
  Discount) — by explicit design, documented inline at `discountService.ts:16`: "No
  idempotency key, no geofence — a discount claim moves no stock."
- **Geofencing** (`api/geo.ts`): `getCurrentGeoPosition()` is wired into exactly two
  services — `salesService.ts:30` (New Sale) and `stockReturnService.ts:25,37,47` (Return
  Items create/revise/withdraw). It is NOT sent for production-order creation, expense,
  cash transfer, or discount requests. This is not a mobile-side gap — the backend's own
  `requireInsideGeofence` middleware is independently confirmed (via a backend-route read,
  see `mobile-api-contract.md`'s re-verification section) to be mounted on exactly the
  same two write paths (`POST /orders/pos`, `POST /stock/return`) and no others, so the
  client and server agree on scope.
- **Offline handling — a real gap, not previously flagged**: `src/shared/hooks/
  useNetworkStatus.ts` implements `NetInfo`-based offline detection (explicitly commented
  "CLAUDE.md Section 37: detect offline state for the banner") but is **never imported or
  called anywhere else in `src/`** (`grep -rn "useNetworkStatus(" src` matches only its own
  definition). No screen renders an offline banner. The spec's "No Internet Connection…
  Some information may be unavailable" requirement (CLAUDE.md §37) has no live UI behind
  it today — see the implementation-plan gap list.
- **Money/currency representation**: the backend stores every monetary column as Postgres
  `Decimal(14,2)` (`backend/prisma/schema.prisma`, e.g. lines 148, 320, 342-344, 1766,
  1375 `unit_price`). Mobile's `api/types.ts` types every amount as a plain TS `number`
  (no cents/minor-unit convention). For New Sale (`useNewSaleForm.ts`), the client computes
  a **preview-only** subtotal/discount/grandTotal with `parseFloat`
  (`useNewSaleForm.ts:18-25,52-67`) for on-screen display and the "cash covers total"
  check, but the actual submit payload (`useNewSaleForm.ts:85-100`) sends only
  `{productId, qty, discount}` per line — never a client-computed `unitPrice` or
  `lineTotal`. `OrderItemResult`/`CreatePosSaleResult` (`api/types.ts:211-230`) confirm the
  server returns its own authoritative `unitPrice`, `lineTotal`, `subtotal`,
  `discountTotal`, `grandTotal` — the client's float math can never corrupt what's
  persisted, only momentarily mis-preview a compound/percentage discount by a fraction of
  a rupee before the server's response replaces it.
- **Historical price preservation**: confirmed server-side and real.
  `backend/src/services/price.service.ts:26` states explicitly: "Historical sales are
  never touched: orders snapshot `unitPrice` at sale time." `order_items.unit_price` is a
  stored column (`schema.prisma:1375`), not a live join to `products.price`. Mobile never
  recomputes an old sale's price from the current product list.
- **Server-authoritative stock checks**: New Sale does not block submission on the
  client's own view of `useStock()` balances (`useNewSaleForm.ts:71` — `canSubmit` checks
  only that a line has a product/qty and cash covers the total, never
  `stockByProductId`); an insufficient-stock 409 from the server is caught and displayed
  via `InsufficientStockDetail[]` (`useNewSaleForm.ts:102-106`). Stock availability is
  genuinely decided server-side, in the same DB transaction as the stock decrement
  (`backend/src/services/stock.service.ts:902-946`, Postgres `commit_sale` RPC, row-locked
  per product to prevent a two-cashier race on the last units).
- **Branch Closing (screen 20) exists** — contrary to this audit's own instructions
  flagging it as possibly missing, it is built: `src/features/closing/screens/
  BranchClosingScreen/index.tsx`, backed by a real, newly-added backend endpoint (`GET
  /branch-closing`, added specifically to unblock this screen rather than duplicating
  `computeClosingTotals` client-side — see `mobile-implementation-plan.md` Slice 12).
- **Onboarding** is a single `OnboardingScreen` component holding a 2-element `SLIDES`
  array (`features/auth/screens/OnboardingScreen/index.tsx:14-28`), matching the spec's
  "Onboarding x2" requirement with one screen component, not two files.
- **Stock Check (screen 12) persists nothing** — confirmed intentional and documented
  in-code: `StockCheckScreen/index.tsx:11-13`, "NOTHING HERE IS SAVED: there is no backend
  endpoint for a stock-check result." The screen only diffs a typed count against the live
  `GET /stock` balance in memory; closing the screen discards the comparison.
- **Tests**: exactly one test file exists in the whole mobile app —
  `mobile/__tests__/businessDate.test.ts` (4 cases, the 2 AM Asia/Karachi business-day
  rollover). No component/screen tests, no mutation-flow tests, no React Native Testing
  Library usage anywhere. `jest.config.js` only widens the RN-related
  `transformIgnorePatterns`; nothing else is configured for broader testing.
- **Branch/role scoping on the backend** (sales, stock, orders — spot-checked per this
  audit's scope, and independently cross-checked against every other branch-scoped route
  the mobile app calls): every write/list route either derives `branchId` purely from the
  JWT for a branch role (ignoring any client-supplied value outright —
  `stock.routes.ts` `GET /`, `sales-analytics.routes.ts` `resolveScope()`,
  `special-events.routes.ts` demand routes) or accepts a body-supplied `branchId` but
  403s if it doesn't match the JWT (`orders.routes.ts` `POST /`/`POST /pos`,
  `stock.routes.ts` `POST /return`, which actually discards the branch role's own body
  value outright rather than merely checking it). No branch-scoped route was found trusting
  a client-supplied `branchId` without either ignoring or cross-checking it. See
  `mobile-api-contract.md`'s re-verification section for the full per-route breakdown.
- **Full navigation tree re-verified, zero orphan screens**: every `.tsx` screen file
  under `src/features/*/screens/` (both branch and production apps) is registered on some
  navigator — confirmed by cross-checking the complete `find src/features -iname "*.tsx"`
  listing against every navigator's `Stack.Screen`/`Drawer.Screen`/`Tab.Screen`
  registrations. The only "dead ends" are explicit, self-labeled `ComingSoonScreen`/
  `comingSoonPane` placeholders (see the gap list in `mobile-implementation-plan.md`), not
  unregistered code.
- **Client-side calculation re-survey across all 28 Branch screens** (full screen-by-screen
  detail in `mobile-implementation-plan.md`'s gap list): most "client math" found is a
  display-only aggregate of already-server-computed per-row fields (list header totals on
  Sales/Stock/Expenses/Cash Transfers/Special Events — low risk). Two screens compute
  something that actually reaches a mutation:
  - `useReturnItemsForm.ts:63` gates which return lines can submit by comparing the typed
    qty against the cached `useStock()` balance client-side — the server is expected to
    re-validate (it owns the actual decrement), but this is still client-computed
    accept/reject logic in front of it.
  - `useNewSaleForm.ts:54-67` computes `subtotal`/`discountTotal`/`grandTotal`/`changeDue`
    entirely client-side and shows them to the cashier **before** the sale is saved; only
    `{productId, qty, discount}` per line is actually sent (line 87), and the server
    returns its own authoritative totals in the response — so the persisted sale can never
    be wrong, but the cashier could be shown (and hand back exact change against) a total
    that differs from what the server ends up charging if the cached product price is
    stale. See the gap list for severity.
  - `useCashDepositForm.ts:42` computes a client-side `totalAmount` and sends it
    (hook line 96) — **re-verified against the backend and this is NOT a trust gap**:
    `backend/src/shared/schemas/cash-transfer.schemas.ts:52-79` makes `totalAmount`
    optional and, when present, requires it to equal the server's own
    `cashAmount+easypaisaAmount+bankAmount` sum to the cent or the request is rejected
    (`superRefine` at line 68-79) — "a screen showing one Total can never save another"
    (schema's own comment, line 47). The server is the authority here, not the client.
- **Reference-data loading/error states — a real, repeated gap**: `CreateOrderScreen`
  (`useCreateOrderForm.ts` → screen never reads `products.isLoading`/`.error` or
  `stock.isLoading`/`.error`), `ReturnItemsScreen` (same pattern against
  `useReturnItemsForm.ts`), `NewSaleScreen` (`useNewSaleForm.ts:114` returns
  `productsLoading` but `NewSaleScreen/index.tsx` never reads it), and
  `RequestDiscountScreen` (no loading/error UI for the demand picker's fetch or for a
  failed recent-claims list) all show only a submit-time error, never a background-fetch
  loading/error state — a slow or failed reference-data load renders as a silently empty
  picker/product list with no explanation, in contrast to every list screen in the app
  (Sales/Stock/Orders/etc.), which does have `LoadingSkeleton`/`ErrorState`/`EmptyState`
  wired consistently.

## Production Module (role `production_user`)

Confirmed via direct read of `src/navigation/RootNavigator/index.tsx:41` and
`src/features/production/`: this is a real, separately-built app shell (not a stub) —
12 of 16 reference screens (per `design UIandUX/mountainbakesProduction.html`) have actual
screen components; 4 are honest `comingSoonPane` placeholders (Branch Stock, Special
Events, Production Reports, Help Desk/New Query share one with Branch Help Desk's
`supportService` not yet given its own Production screen). Full per-screen detail,
backend-endpoint table, and slice status already live in `mobile-production-plan.md`
(274 lines) and `docs/SCREENS.md`'s "Production app" table — this audit re-verifies rather
than re-documents:

- **Role isolation is enforced, not just structural**: `RootNavigator/index.tsx:39-43`
  branches on `authStore.user.role` (sourced from the JWT via `authService.me`/
  `login`/`refresh`, never client-settable) — a `production_user` session can only ever
  reach `ProductionDrawerNavigator`; there is no shared code path that would let it render
  `DrawerNavigator` (branch) or `FinanceDrawerNavigator`. This is a single `if`/`else if`
  chain (not per-screen checks), so isolation is centralized and easy to audit, but also
  means a bug in this one function would affect every role — it was read in full and is
  correct as written.
- **Server-authoritative stock/pricing**: `ProductionStockOverviewScreen` reads
  `GET /production-stock` directly (confirmed by the backend-route agent,
  `production-stock.routes.ts:31`) — opening/prepared/demand/balance figures come from the
  server response, not recomputed client-side (consistent with every other stock screen in
  this codebase). `POST /production-stock/prepare` and `/adjustment`
  (`production-stock.routes.ts:42,124`) are both gated `requireRole('super_admin',
  'production_user')` server-side — no branch role can reach this router at all.
- **Special Orders (SO-IDs) — confirmed real on the backend, confirmed ABSENT from mobile
  entirely, on both Branch and Production**: `backend/src/routes/special-orders.routes.ts`,
  `backend/src/shared/types/special-order.types.ts`,
  `backend/src/shared/schemas/special-order.schemas.ts` are all real, with their own
  integration test (`backend/src/services/__tests__/special-orders.integration.test.ts`).
  Mobile's only reference to the concept is a deliberate *exclusion*:
  `mobile/src/features/orders/hooks/useCreateOrderForm.ts` (Slice 2 notes, repeated in
  `mobile-implementation-plan.md`'s Slice 2 detail) states `CreateProductionOrderSchema`
  rejects a non-empty `specialItems`, so Create Order's "Special Order Items" section from
  the HTML reference was skipped — "a separate feature... not yet mapped" to any slice.
  `grep -rln "special-orders\|specialOrder\|SpecialOrder" mobile/src` finds nothing beyond
  that one exclusionary comment. No mobile screen, on either the Branch or Production side,
  reads or writes `/api/special-orders` today.
- **Audit trail on approve/reject**: confirmed real server-side for discounts
  (`production-discounts.routes.ts:132`, "atomic check-and-set on status='pending'" per
  the backend-route agent) and production orders (`production-orders.routes.ts:467,910`,
  review/final-approve) — these are status-transition writes with the usual
  created_at/updated_at columns, not a separate structured audit log. The one codebase-wide
  *named* audit trail found is Finance's own (`financeTicketAuditTrail`,
  `backend/src/routes/finance-tickets.routes.ts:59,839`) — see the Finance Module section;
  Production's review/approve actions are traceable via row history, not a dedicated audit
  endpoint, and no mobile screen (Branch or Production) surfaces an audit view for orders/
  returns/discounts today.
- **Not independently line-verified this pass** (pattern-consistent with every other hook
  in the codebase, which was uniformly real wherever opened, but not opened themselves):
  `src/features/events/hooks/useEventDemandForm.ts`,
  `src/features/closing/hooks/useManualFeedForm.ts`,
  `src/features/support/hooks/useNewQueryForm.ts`,
  `src/navigation/ProductionDrawerNavigator/ProductionDrawerContent.tsx`.

## Finance Module (roles `finance_admin`/`finance_manager`/`accountant`/`finance_auditor`)

**Verdict: the Finance role exists at the navigation/routing level but has zero built
screens.** `RootNavigator/index.tsx:18,42` correctly recognizes all four finance roles and
routes them to `FinanceDrawerNavigator` (so a finance login doesn't crash or land on the
wrong shell), but that component
(`src/navigation/FinanceDrawerNavigator/index.tsx:14-29`) is a single static screen —
title "Finance", subtitle "Coming soon", one paragraph of text, and a Sign Out button.
`grep -rn "finance\|payroll\|ledger\|partner" mobile/src -il` returns only this one
navigator file and `docs/mobile-finance-plan.md`; there is no `financeService.ts`, no
`features/finance/` folder, no finance type beyond what's implied by the shared
`SessionUser.role` union. **0 of the 23 reference screens (Finance Dashboard, Daily
Ledger, Cash Transfers review, Income & Expense, New Entry, Payroll, New Payslip, New
Advance, Add Employee, Resignation, Salary Ledger, Partner Transactions, New Partner
Advance, Partner Detail, Company Transaction Details, Ledger Heads, New Ledger Head,
Daily Closing, Finance Reports, Audit Trail, Finance Help Desk, Finance New Query, Finance
Settings) have any mobile implementation.**

What does exist, server-side, per `mobile-finance-plan.md`'s own prior audit (re-confirmed
plausible by this pass's backend-route reading, not independently re-read line-for-line
given the time budget):
- A real permission model, `requireFinance('view'|'create'|'approve'|'adjust'|'configure')`
  checked per-endpoint (not a blanket role gate) — `backend/src/middleware/
  requireFinance.ts` (per `mobile-finance-plan.md`), meaning any future mobile build must
  gate buttons by permission, not by role alone.
- A real, named audit trail specifically for Finance tickets:
  `financeTicketAuditTrail(ticket.id, isAdmin)` (`backend/src/routes/
  finance-tickets.routes.ts:839`), redacted per caller role (line 863's comment) — this is
  the one place in the whole backend with a dedicated audit-trail function by that name;
  it is scoped to finance support tickets, not a general ledger audit log (whether a
  broader ledger-entry audit trail exists was not independently confirmed this pass — flag
  as unverified rather than assumed).
- Five finance route files `mobile-finance-plan.md` itself flags as "not yet fully read"
  (`finance-payroll.routes.ts`, `finance-partners.routes.ts`,
  `finance-branch-share.routes.ts`, `finance-income.routes.ts`,
  `finance-tickets.routes.ts`) — this audit did not re-read them either (out of the
  15-minute backend budget this pass allotted to the Branch-focused scoping check); their
  endpoint signatures, and therefore whether server-authoritative running-balance
  calculations exist on the ledger, remain unconfirmed.
- Finance role isolation from Branch/Production is enforced the same way as
  Production's: `RootNavigator/index.tsx`'s single role-dispatch function. Since no Finance
  screen exists to reach, there is nothing yet for a non-finance account to improperly
  reach — the isolation question will become meaningful once screens are built.

This absence is carried into `mobile-implementation-plan.md` as the single highest-severity
finding in this entire audit.
