# Mobile Production app — implementation plan

Source: `design UIandUX/mountainbakesProduction.html` (15 screens, `data-screen-label`
01–16, one of which — 16 "Drawer" — is chrome, not a distinct screen). Scope: the
`production_user` role only, exactly as the Branch build was scoped to `branch_manager`
only. Reuses the same theme, `shared/ui`, and `@/api` service layer as the Branch app —
this is one RN codebase serving three role-specific app shells, not three separate apps.

## Role dispatch

`navigation/RootNavigator/index.tsx` now picks the app shell from `authStore.user.role`:

| Role | Shell |
|---|---|
| `branch_manager` | `DrawerNavigator` (branchApp.md) |
| `production_user` | `ProductionDrawerNavigator` (this plan) |
| `finance_admin`/`finance_manager`/`accountant`/`finance_auditor` | `FinanceDrawerNavigator` (placeholder — see `mobile-finance-plan.md`) |
| anything else (`super_admin`) | `UnsupportedRoleView` — explicit "not built for this role", never a silent fallback |

## Confirmed backend endpoints (reuse only — never invent)

| Screen | Endpoint(s) | Notes |
|---|---|---|
| 01 Production Dashboard | `GET /production-orders`, `GET /production-stock` | No `/reports/*` access for this role (`branch_manager`/`super_admin` only) — confirmed by reading `reports.routes.ts`'s `router.use`. Dashboard is composited from these two only. |
| 02 Production Orders / 03 Order Detail | `GET /production-orders`, `PUT /:id/review`, `PUT /:id/final-approve` | No `GET /:id` exists — detail is looked up from the already-fetched list, same pattern as the Branch Event Demand screen. |
| 05 Sales / 06 New Sale | `GET /orders/production-sales`, `POST /orders/production-sale` | Production's own counter sale — pulls from the **central pool**, not a branch's `stock`; supports `paymentMethod: 'staff'` (no money, required comment). Confirmed in `orders.routes.ts`. |
| 07 Production Stock / 08 Prepared Products | `GET /production-stock`, `POST /production-stock/prepare`, `GET /production-stock/movements`, `POST /production-stock/adjustment` | `prepare` records "Today's Prepared Products"; `adjustment` is a correction, confirmed `production_user`+`super_admin` only. |
| 09 Branch Stock | `GET /stock/history/branches` | **Not confirmed buildable yet** — that route is `super_admin` only in `stock.routes.ts` (`requireRole('super_admin')`); needs re-checking before this screen is built, or a different endpoint found. |
| 10 Returns | `GET /production-returns`, `POST /production-returns`, `PUT /:id/review` | Production's own return-to-self plus reviewing a branch's incoming return. |
| 11 Discounts | `GET /production-discounts`, `PUT /:id/review` | Production's review board for branch discount claims (the other half of the Branch app's Request Discount). |
| 12 Special Events | `GET /special-events*` (admin/production views), event production-status endpoints | Not yet read in detail — needs its own backend pass before building. |
| 13 Production Reports | — | **Blocked**: `/reports/*` refuses `production_user`. No endpoint confirmed yet; do not build until one is found or added. |
| 14 Help Desk / 15 New Query | `GET /support`, `POST /support`, `GET /support/lookup` | Already confirmed `production_user`-accessible in the Branch build (Slice 10) — can reuse `supportService` as-is, just needs its own Production-side screen (own ticket list is already role-scoped server-side). |

## Status

| Slice | Scope | Status |
|---|---|---|
| P1 | Foundation: role dispatch, full nav scaffolding (routes/types for all 15 screens), Production Dashboard (01) | **Done** |
| P2 | Production Orders (02) + Order Detail (03) — review/send/reject/final-approve | **Done** |
| P3 | Sales (05) / New Sale (06) | **Done** |
| P4 | Production Stock (07) / Prepared Products (08) | **Done** |
| P5 | Branch Stock (09) | Blocked — endpoint access needs re-confirming (see table above) |
| P6 | Returns (10) | **Done** |
| P7 | Discounts (11) | **Done** |
| P8 | Special Events (12) | Not started — backend not yet read for this role's view |
| P9 | Production Reports (13) | Blocked — no confirmed endpoint for this role |
| P10 | Help Desk (14) / New Query (15) | Not started — same `supportService` as Branch, needs its own screen |

## Slice P1 detail (done)

- `navigation/routes.ts`/`types.ts`: full route/param-list scaffolding for all 15 screens
  up front (same up-front-scaffold approach as the Branch build's Slice 1), so later
  slices only add a screen component + one `Stack.Screen`/`Drawer.Screen` registration.
- `navigation/RootNavigator`: role dispatch (see above).
- `ProductionBottomTabNavigator` (Dashboard/Orders/Sales/Stock/More, mirroring the Branch
  app's own 5-tab shape) + `ProductionDrawerNavigator` + `ProductionDrawerContent`
  (Main section: Dashboard, Production Orders, Sales, Production Stock, Returns,
  Discounts, Special Events, Reports, Help Desk).
- `features/placeholder/screens/ComingSoonPane.tsx` (new): a `comingSoonPane(title)`
  factory for wiring a not-yet-built screen directly into a typed stack without a route
  param — used for every Production screen not yet built (Sales, Stock, Returns,
  Discounts, Events, Reports, Help Desk).
- `api/types.ts`: `ProductionStockRow` (+`Status`), `ProductionStockListResponse`,
  `ReviewProductionOrderInput`.
- `api/services/productionStockService.ts` (new) + `productionOrderService.ts` extended
  with `reviewProductionOrder`/`finalApproveProductionOrder`.
- `ProductionDashboardScreen` (01): composited from `useProductionOrders()` (pending /
  awaiting-verification counts) + `useProductionStock()` (pool balance, outstanding
  demand, shortage count) — confirmed these are the only two endpoints this role can
  read for a dashboard-shaped view; `/reports/*` refuses `production_user`.

## Slice P2 detail (done)

- `ProductionOrdersListScreen` (02): every branch's demand, tabs (Pending / Awaiting
  Verify / History), search by demand number or branch name.
- `ProductionOrderDetailScreen` (03): looked up from the cached list by id (no `GET /:id`
  exists). Pending → Reject / Send to Branch (`PUT /:id/review`, approves every line at
  its requested qty — a quantity-adjustment UI is a later refinement, not assumed here).
  Verified → Final Approve (`PUT /:id/final-approve`).
- Verified: `npx tsc --noEmit` (clean), `npx eslint src` (0 errors, 402 warnings —
  consistent pre-existing-style categories across the whole tree), `npx jest` (4/4).

## Slice P3 detail (done)

- Confirmed `CreateProductionSaleSchema` (`backend/src/shared/schemas/order.schemas.ts`):
  `items`, `paymentMethod` (the Branch 4 values plus `'staff'`), optional `receivedCash`,
  `notes` (required non-empty when `paymentMethod === 'staff'`, enforced server-side via
  `superRefine`). `branchId` is accepted but ignored — the server pins the sale to the
  Production sentinel branch itself.
- `api/types.ts`: `ProductionSalePaymentMethod` (`PaymentMethod | 'staff'`),
  `CreateProductionSaleInput`. Reused `CreatePosSaleResult` as-is for the response shape —
  identical fields.
- **Real bug found and fixed along the way**: `InsufficientStockDetail` (used by both the
  Branch New Sale screen and this one for the 409 insufficient-stock response) had the
  wrong field names — `requestedQty`/`availableQty` — but the actual wire shape thrown by
  `InsufficientStockError` (`backend/src/services/stock.service.ts`) is `requested`/
  `available`. Confirmed no backend mapping exists anywhere between the two. Fixed the
  type and both call sites (`NewSaleScreen`, this slice's `ProductionNewSaleScreen`) to the
  real field names — the Branch screen was silently rendering "Available: undefined /
  Requested: undefined" on every insufficient-stock error before this fix.
- `api/services/productionSaleService.ts` (new): `listProductionSales` (`GET
  /orders/production-sales`), `createProductionSale` (`POST /orders/production-sale`) —
  confirmed neither geofenced nor behind `idempotent()` server-side (unlike `/orders/pos`),
  so no geo position or idempotency key is attached, unlike the Branch sale's own service.
- `api/hooks/useProductionSalesApi.ts` (new): `useProductionSales`, `useCreateProductionSale`
  (invalidates `productionSales` + `productionStock` on success — a counter sale draws down
  the pool, not a branch's stock).
- `features/production/hooks/useNewProductionSaleForm.ts`: mirrors the Branch
  `useNewSaleForm` shape (same discount-string convention, same line-item math) but reads
  availability from `useProductionStock()`'s `available` field instead of branch `stock`,
  and adds the `'staff'` branch: no cash-tender validation, a required comment, "No Charge"
  rendered instead of a total.
- `features/production/screens/ProductionSalesListScreen` (05): today's counter sales,
  payment-method filter chips (adds Staff), gross/discount/revenue stat row (staff sales
  excluded from the revenue figure since they take no money).
- `features/production/screens/ProductionNewSaleScreen` (06): reuses `ProductPickerModal`/
  `ProductPickerRow` directly from `@/features/sales/components` (both already generic over
  `Product`/`Map<string, number>`, no business logic to duplicate) behind a new
  `ProductionPaymentMethodPicker` (adds Staff to the Branch picker's 4 options — a dedicated
  component so the Branch app's own picker/type stay untouched).
- `ProductionSalesStackNavigator` wired to the two real screens (was a `comingSoonPane` stub).
- Verified: `npx tsc --noEmit` (clean), `npx eslint src` (0 errors, 427 warnings — up from
  402, same pre-existing categories), `npx jest` (4/4).

Not run: the live submit flow against `/orders/production-sale` on a real device — no
device/emulator, same gap as every mutation path in this build so far.

## Slice P4 detail (done)

- **Real type bug found and fixed**: the mobile `ProductionStockRow` type was missing two
  fields the backend always returns — `returnTransferIn` and `returned`
  (`backend/src/shared/types/production-ops.types.ts`'s `ProductionStockFigures`). Neither
  was wrong in the already-shipped Dashboard (P1), which only reads `balance`/
  `branchDemand`/`status`, but this slice's stats grid needed the "FROM RETURNS" figure, so
  the gap would have surfaced as a silent `undefined` the moment it was used. Fixed the type
  to match the backend exactly rather than adding only what this slice needed.
- `api/types.ts`: `PrepareProductionItemInput`/`PrepareProductionInput`/
  `PrepareProductionResult`, `PRODUCTION_ADJUSTMENT_TYPES`/`ProductionAdjustmentType`/
  `PRODUCTION_ADJUSTMENT_LABELS` (copied field-for-field from
  `production-ops.schemas.ts`), `CreateProductionAdjustmentInput`/`ProductionAdjustmentResult`.
- `api/services/productionStockService.ts` extended with `prepareProduction` (`POST
  /production-stock/prepare`) and `createProductionAdjustment` (`POST
  /production-stock/adjustment`) — confirmed neither is geofenced nor behind
  `idempotent()` server-side; the prepare route mints its own fresh `refId` per call.
- `api/hooks/useProductionStockApi.ts` extended with `usePrepareProduction` /
  `useCreateProductionAdjustment`, both invalidating `productionStock` on success.
- `features/production/screens/ProductionStockOverviewScreen` (07): the central pool table.
  8-stat grid (Opening/Prepared/Total Stock/Branch Demand/Sold/From Returns/
  Adjustment/Balance) summed client-side over the server-trusted per-row figures (plain
  arithmetic, not a business rule); an insufficient-stock banner when any row is
  `shortage`/`out`; search; per-product `ProductionStockRowCard` (status badge +
  opening/prepared/demand/balance mini-stats) — all matching the HTML reference's own
  layout. The HTML's third button, "Prepared Detail", was NOT built — it has no
  corresponding screen number in the 15-screen scope and no confirmed single endpoint
  behind it (the closest is the Stock Ledger, `GET /production-stock/movements`, which
  is a paged, filterable list with its own UI surface, not a small popover); flagged as
  an open item rather than guessed at.
- `features/production/screens/ProductionPreparedProductsScreen` (08): "ADDS to what
  today already holds" per the HTML's own copy and the endpoint's actual semantics (never
  a replace) — per-product add-qty inputs next to each product's already-prepared count,
  a running "Adding +X to Y already prepared today → Y+X" footer, Clear/Save.
- `features/production/screens/ProductionStockAdjustmentScreen` (the "Adjustment" button
  on screen 07 — not its own numbered screen in the HTML, but a real, ready endpoint
  directly reachable from Production Stock, so building it is in scope): product picker
  (reuses `ProductPickerModal` from `@/features/sales/components`), adjustment-type chips,
  an explicit direction toggle (Add/Remove) so the sign is derived rather than typed —
  typing a bare negative number would be easy to get backwards — quantity, a mandatory
  reason, optional remarks. Shows the before/after balance on success.
- Verified: `npx tsc --noEmit` (clean), `npx eslint src` (0 errors, 473 warnings — up from
  427, same pre-existing categories), `npx jest` (4/4).

Not run: the live submit flow for prepare/adjustment against a real device — no
device/emulator, same gap as every mutation path in this build so far.

## Slice P6 detail (done)

- Confirmed `production-returns.routes.ts` end to end: `GET /` (30 days default, server
  paged/filtered/sorted), `POST /` (Production recording a return it received directly —
  `source: null`), `PUT /:id/review` (`accepted`/`rejected`/`returned`). No `GET /:id` —
  same lookup-from-cached-list pattern as Production Orders and Order Detail (P2).
- **Two distinct kinds of return in one queue**, confirmed by reading the route's own
  extensive comments: a `source: 'branch'` row was raised from the Branch app's Return
  Items screen (`POST /stock/return`, already built) — the branch's balance is already
  debited and waiting on this review, so `'returned'` (send back) is valid only here. A
  `source: null` row is Production's own note that something arrived with no branch
  screen involved — accepting it moves BOTH the branch and Return Stock balances, and
  there is no branch paperwork to send back, so `'returned'` is refused server-side on
  these. The mobile UI mirrors this exactly: `ProductionReturnDetailScreen` only shows
  "Send Back" when `item.source === 'branch'`.
- Accepting requires a `disposition` (`saleable`/`damaged`/`expired`); `damaged`/`expired`
  additionally require a `dispositionNote` — enforced client-side before the call, matching
  the backend's own `ReviewProductionReturnSchema` refinements.
- `api/types.ts`: `BranchSummary`/`BranchListResponse` (new — a lean id/name subset of the
  full admin `Branch` shape, since that's all a picker needs), `ProductionReturnStatus`/
  `ProductionReturn`/`ProductionReturnListResponse`/`CreateProductionReturnInput`/
  `ProductionReturnDisposition`/`ReviewProductionReturnInput` (copied field-for-field from
  `production-ops.types.ts` and the two Zod schemas).
- `api/services/branchService.ts` (new): `listBranches` (`GET /branches` — confirmed
  readable by every authenticated role, not role-gated).
- `api/services/productionReturnService.ts` (new): `listProductionReturns`,
  `createProductionReturn`, `reviewProductionReturn`.
- `features/production/components`: `ProductionReturnCard` (status badge, branch, reason,
  source), `BranchPickerModal` (new — Production is the first role in this app that needs
  to pick FROM a list of branches, since Branch/Production screens built so far are always
  scoped to the signed-in branch or role), `ReturnProductPickerModal` (a name-only product
  picker, deliberately NOT reusing `@/features/sales/components`' `ProductPickerModal` — that
  one always shows an "Available N" figure, which has no meaning when recording a return).
- `features/production/screens/ProductionReturnsListScreen` (10): tabs (All/Awaiting
  Review/Approved/Rejected — `Rejected` buckets both `rejected` and `returned`, since the
  HTML reference has no fifth tab for "Sent Back"), search, `+ Record Return`.
- `features/production/screens/ProductionReturnDetailScreen`: looked up from the cached
  list by id; disposition chips + conditional note shown only while `pending`; Reject/Send
  Back/Approve.
- `features/production/screens/NewProductionReturnScreen` (the "+ Record Return" action):
  branch picker, product picker, quantity stepper, reason.
- Verified: `npx tsc --noEmit` (clean), `npx eslint src` (0 errors, 506 warnings — up from
  473, same pre-existing categories), `npx jest` (4/4).

Not run: the live submit/review flow against `/production-returns` on a real device — no
device/emulator, same gap as every mutation path in this build so far.

## Slice P7 detail (done)

- Confirmed `production-discounts.routes.ts` end to end: `GET /` (30 days default, server
  paged/filtered/sorted, same conventions as the returns queue) and `PUT /:id/review`
  (`approved`/`rejected`/`returned`). No create endpoint for this role — a discount claim
  is always raised by a branch (`POST /branch-discounts`, already built in the Branch app's
  Slice 4); Production only ever reviews one. The route's own header comment makes the
  contrast with Returns explicit: approving or rejecting a discount moves no stock and no
  money — it's a status write and a notification, nothing for a client to reconcile
  against two balances.
- **Reused `BranchDiscount` directly** rather than defining a parallel type — confirmed
  `GET /production-discounts` returns the exact same row shape as the Branch app's own
  `GET /branch-discounts` (same table, same `date`/`amount` normalisation), so duplicating
  the type would have been the one thing this build's own discipline rules out.
- New `ReviewBranchDiscountInput` type (`status`, optional `reviewNote` — required only
  for `'returned'`, enforced client-side the same way the backend's own schema refines it)
  and `api/services/productionDiscountService.ts` (new service, since the URL differs from
  the Branch app's `discountService.ts` even though the row type is shared).
- `features/production/screens/ProductionDiscountsListScreen` (11): tabs (All/Awaiting
  Review/Approved/Rejected — `Rejected` buckets `rejected`+`returned`, same choice as the
  Returns queue, since the HTML reference's own tab row has no fifth "Sent Back" tab),
  search.
- `features/production/screens/ProductionDiscountDetailScreen`: looked up from the cached
  list by id (no `GET /:id`, same pattern as Orders/Returns); Reject/Send Back/Approve,
  with "Send Back" disabled until a note is entered (server-enforced requirement for that
  one outcome, mirrored client-side rather than only caught on submit).
- Verified: `npx tsc --noEmit` (clean), `npx eslint src` (0 errors, 520 warnings — up from
  506, same pre-existing categories), `npx jest` (4/4).

Not run: the live review flow against `/production-discounts` on a real device — no
device/emulator, same gap as every mutation path in this build so far.

## Open items (owner's call, not assumed)

- **Branch Stock (09)**: the obvious endpoint (`GET /stock/history/branches`) is
  `super_admin`-only per `stock.routes.ts`. Either a production-accessible endpoint
  exists elsewhere and needs finding, or this screen needs a backend change before it
  can be built honestly.
- **Production Reports (13)**: no endpoint confirmed. `/reports/*` explicitly refuses
  `production_user`. Flag to the owner — either a production-facing report endpoint
  needs to be added server-side, or this screen is descoped.
- **Special Events (12)**: not yet investigated against this role's actual permissions —
  needs its own read-the-routes pass before any screen work, same discipline as every
  other slice in this build.
- **Order Detail's "Send to Branch" currently approves every line at its requested
  quantity** — the HTML reference may expect per-line quantity adjustment before
  sending; flagged rather than guessed at, since getting this wrong would misrepresent
  what Production actually approved.
- Sales (05/06) is Production's own retail counter, pulling from the central pool with
  the `staff` payment method for internal consumption — distinct business logic from the
  Branch app's POS sale and needs its own careful read of `commitProductionSaleTransaction`
  before building, not a copy-paste of the Branch `useNewSaleForm`.
