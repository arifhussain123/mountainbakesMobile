# Mobile API contract

One row per endpoint actually consumed by the mobile app. Populated per slice, as each
service file is written — never ahead of the service. All endpoints are confirmed to
already exist on the backend (`backend/src/routes/*.routes.ts`); none are invented here.

## Consumed today

| Method | Path | Mobile service | Notes |
|---|---|---|---|
| POST | `/auth/login` | `authService.login` | |
| POST | `/auth/refresh` | `authService.refresh` | |
| GET | `/auth/me` | `authService.me` | |
| POST | `/auth/logout` | `authService.logout` | |
| GET | `/reports/summary` | `dashboardService.getReportSummary` | `period=daily\|weekly\|monthly`, `fields=basic` |
| GET | `/sales-analytics` | `dashboardService.getSalesAnalytics` | `from`, `to`, `topLimit`, `compare` |
| GET | `/stock/history` | `dashboardService.getStockHistoryDay` / `getStockHistorySeries` | `date=` or `days=` |
| GET | `/products` | `productService.listProducts` | `sellable=true` |
| GET | `/orders` | `salesService.listOrders` | `status`, `from`, `to` |
| POST | `/orders/pos` | `salesService.createPosSale` | idempotent, geofenced, stamps business date |
| GET | `/stock` | `stockService.getStock` | `date=` |
| GET | `/production-orders` | `productionOrderService.listProductionOrders` | last 7 business days, branch-scoped server-side |
| POST | `/production-orders` | `productionOrderService.createProductionOrder` | items[{productId,qty}], packingItems?, requiredDate (required), businessDate? — idempotent, **no geofence** (confirmed absent from this route) |
| GET | `/packing-materials` | `packingMaterialService.listPackingMaterials` | active materials only |
| GET | `/stock/returns` | `stockReturnService.listBranchReturns` | branch's own return history, last 90 days |
| GET | `/stock/returns/summary` | `stockReturnService.getBranchReturnsSummary` | branch's own returns, this business month to date (1st → today, server clock), per status; branch from the token. Added 2026-10-18 for the monthly returns summary |
| POST | `/stock/return` | `stockReturnService.createBranchReturn` | items[{productId,qty}], reason?, attachmentIds (1 photo) — idempotent + geofenced |
| PUT | `/stock/returns/:id` | `stockReturnService.reviseBranchReturn` | qty (new total, not a delta), reason? — only while pending/returned; geofenced |
| DELETE | `/stock/returns/:id` | `stockReturnService.withdrawBranchReturn` | only while pending/returned; geofenced |
| POST | `/attachments` | `attachmentService.uploadAttachment` | multipart (`photo` field) — stages a photo against `entity`; `branch_return` is the only entity this app uses so far |
| DELETE | `/attachments/:id` | `attachmentService.discardAttachment` | removes a staged (never bound) upload only |
| GET | `/branch-discounts` | `discountService.listBranchDiscounts` | this branch's claims, last 90 days default |
| POST | `/branch-discounts` | `discountService.createBranchDiscount` | productionOrderId, amount, reason — no idempotency key, no geofence (moves no stock) |
| PUT | `/branch-discounts/:id` | `discountService.reviseBranchDiscount` | amount, reason — only while pending/returned; resets to pending |
| DELETE | `/branch-discounts/:id` | `discountService.withdrawBranchDiscount` | only while pending/returned |
| GET | `/cash-transfers` | `cashTransferService.listCashTransfers` | this branch's deposits, last 90 days default |
| POST | `/cash-transfers` | `cashTransferService.createCashTransfer` | cashAmount/easypaisaAmount/bankAmount/fuelCharges/totalAmount?/note?/attachmentIds? — idempotent, no geofence, **no edit/withdraw exists** |
| GET | `/expenses` | `expenseService.listExpenses` | last 7 business days, branch-scoped |
| POST | `/expenses` | `expenseService.createExpense` | category/description/paymentMethod (cash\|easypaisa only)/amount/remarks? — today-only date for a branch role, idempotent, **no edit/delete** |
| GET | `/special-events` | `specialEventService.listSpecialEvents` | current year, branch-scoped to events the branch participates in |
| GET | `/special-events/:id/my-demand` | `specialEventService.getMyEventDemand` | null when the branch has not started one |
| POST | `/special-events/:id/demands` | `specialEventService.saveEventDemand` | items[{productId,qty,remarks?}], expectedCustomers?, notes? — create-or-replace while 'draft' |
| POST | `/special-events/:id/demands/:demandId/submit` | `specialEventService.submitEventDemand` | only while 'draft' |
| GET | `/daily-sale-records` | `dailySaleService.listDailySaleRecords` | last 30 business days default, branch-scoped |
| POST | `/daily-sale-records/generate` | `dailySaleService.generateDailySaleRecord` | idempotent — upserts on (branchId, businessDate) |
| PUT | `/daily-sale-records/manual-feed` | `dailySaleService.feedDailySaleRecord` | cash?/easypaisa?/bank? — addressed by businessDate, not record id; omitted method left unchanged |
| PUT | `/daily-sale-records/:id/verify` | `dailySaleService.verifyDailySaleRecord` | confirmed callable by `branch_manager`, not just `super_admin` |
| GET | `/reports/packing-usage` | `reportService.getPackingUsage` | from/to/pageSize — branch-scoped server-side |
| GET | `/support/lookup` | `supportService.lookupSupportReference` | `ref=` — typed prefixes MB-/DMD-/EXP-/STK-/CT- |
| GET | `/support` | `supportService.listSupportTickets` | own queue only for a branch_manager |
| POST | `/support` | `supportService.createSupportTicket` | {referenceId, message} — `branch_manager`/`production_user` only |
| GET | `/branch-closing` | `branchClosingService.getBranchClosing` | `date=` (defaults to today's business date) — **new in Slice 12**, added alongside this screen; composes `computeClosingTotals` plus payment-method/expense-category groupings, same auth/branch-scoping as `/branch-closing/export` |

## Confirmed but not yet consumed (reuse exactly, do not invent variants)

| Method | Path | Target feature (branchApp.md #) | Notes |
|---|---|---|---|
| PUT | `/production-orders/:id/cancel` | New Orders (04) — withdraw a pending demand | reason required, ≥3 chars; only while 'pending' |
| PUT | `/production-orders/:id/verify` | New Orders (04) — confirm receipt | moves stock; attachmentIds (photo) REQUIRED; only while 'awaiting_verification' |
| POST | `/stock/returns/:id/resubmit` | Return Stock (13) — resend a `returned` row unchanged | NOT geofenced (moves no stock); not wired, Change covers editing it instead |
| PUT | `/orders/:id/status` | Orders status change | pending\|preparing\|ready\|delivered\|cancelled — not currently wired on the branch client |
| GET | `/cash-transfers/:id` | Cash Transfers (15) detail | not wired — the list already carries each transfer's attachments |
| GET | `/expenses/export` | Shop Expenses (16) | `type=excel\|csv` — not wired, no file-download/share capability in the app yet |
| GET | `/special-events/calendar`, `/special-events/summary`, `/special-events/:id` | Special Events (18) — Calendar tab / detail | not wired; List view ships first (no month-calendar component exists) |
| GET | `/daily-sale-records/locks`, `/:id`, `/audit` | Daily Sale Record (21) detail/audit | not wired — the list card shows everything the branch screen needs today |
| GET | `/branch-closing/export` | Branch Closing (20) | file export (Excel/CSV) — not wired, no file-download/share capability in the app yet (same gap as `/expenses/export`); the screen's own data now comes from `GET /branch-closing` (added in Slice 12), not this endpoint |
| GET | `/reports/export`, `/sales-analytics/export` | Reports (23) | not wired — no file-download/share capability in the app yet (same gap as `/expenses/export`) |

## Explicitly out of scope (admin-only, do not wire into the branch client)

`/orders/production-sales`, `/orders/production-sale`, `/daily-sale-records/:id/lock`
`/unlock` `/amend`, `/reports/branch-comparison`, `/support/:id/resolve`,
`/support/:id/figures`, `/production-returns*`, `/return-stock*` (production-side),
`/branch-locations*` (admin config, mobile only reads its own geofence indirectly via the
403 the server returns), any `/finance/*` route.

## Independent re-verification — 2026-10-14

Every endpoint in the "Consumed today" table above, plus every endpoint the Production
app consumes (below), was independently re-derived by reading both the mobile service file
and the matching backend route file side by side. **Result: zero mismatches** — every
mobile call has a real backend route at the same method + path. Notable confirmations
beyond plain existence:

- `POST /orders/pos` (New Sale) — backend `orders.routes.ts:351`:
  `requireRole('super_admin', ...BRANCH_ROLES)`, `idempotent(...)`, `validate(...)`,
  `requireInsideGeofence(...)` all chained on the route; commits via
  `commitSaleTransaction` → one Postgres transaction (`commit_sale` RPC), stock rows
  locked per-product in a fixed order to avoid a two-cashier deadlock on the same product.
- `GET /stock`, `GET /sales-analytics`, `/special-events/:id/my-demand`,
  `POST /special-events/:id/demands` — all four confirmed **session-derived only**: a
  branch role's `branchId` query/body value is never read, not merely overridden
  (`stock.routes.ts:179`; `sales-analytics.routes.ts:44-52`'s `resolveScope()`, whose
  comment says explicitly that even rejecting a mismatched branchId would leak
  information, so it isn't read at all; `special-events.routes.ts:1080`'s comment, "from
  the JWT, never the query string").
- `POST /orders` / `POST /orders/pos` and `POST /stock/return` accept a `branchId` in the
  body but cross-check it: `orders.routes.ts:223-231,351-358` 403s if a branch role's body
  value disagrees with their JWT branchId; `stock.routes.ts:232-234` goes further and
  simply discards a branch role's own body value outright, always using the JWT. No branch
  role was found anywhere able to write data under a `branchId` other than its own.
- `POST /production-returns` (`production-returns.routes.ts:99`) does take `branchId`
  verbatim from the body with no cross-check — but the whole router is
  `requireRole('super_admin', 'production_user')` (`:22`), so no branch account can ever
  reach it; this is Production recording a return on a branch's behalf, not a
  branch-impersonation risk.
- `CreateCashTransferSchema` (`backend/src/shared/schemas/cash-transfer.schemas.ts:52-79`):
  the mobile-computed `totalAmount` sent by `useCashDepositForm.ts` is optional
  server-side and, when present, must equal the server's own
  `cashAmount+easypaisaAmount+bankAmount` sum (`superRefine`, line 68-79) or the whole
  request is rejected — confirms the server is authoritative on this figure, not the
  client, contrary to what a shallower read of the mobile hook alone would suggest.
- `IssuedSession` and `MeResponse` types were checked byte-for-byte against
  `backend/src/services/auth/auth.service.ts:61-114`'s `issue()` and
  `auth.routes.ts:312`'s `res.json({ user: req.user })` — both match exactly.

## Production app — endpoints consumed

Full detail and slice history in `mobile-production-plan.md`; re-verified against the
backend here. One row per endpoint the `production_user` app actually calls:

| Method | Path | Mobile service | Backend route (file:line) | Notes |
|---|---|---|---|---|
| GET | `/production-orders` | `productionOrderService.listProductionOrders` | `production-orders.routes.ts:326` | Branch-scoped N/A — this is Production's own view across all branches' demands |
| POST | `/production-orders` | — (branch-side only; Production doesn't create these) | `production-orders.routes.ts:114` | listed for completeness |
| PUT | `/production-orders/:id/review` | `productionOrderService` review action | `production-orders.routes.ts:467` | |
| PUT | `/production-orders/:id/final-approve` | `productionOrderService` final-approve action | `production-orders.routes.ts:910` | |
| GET | `/orders/production-sales` | `productionSaleService.listProductionSales` | `orders.routes.ts:113` | `requireRole('super_admin','production_user')`; scoped to the production sentinel branch, `status='delivered'` |
| POST | `/orders/production-sale` | `productionSaleService.createProductionSale` | `orders.routes.ts:515` | Confirmed no geofence/idempotency middleware on this route |
| GET | `/production-stock` | `productionStockService.getProductionStock` | `production-stock.routes.ts:31` | |
| POST | `/production-stock/prepare` | `productionStockService.prepare` | `production-stock.routes.ts:42` | |
| POST | `/production-stock/adjustment` | `productionStockService.adjust` | `production-stock.routes.ts:124` | All three stock routes `requireRole('super_admin','production_user')` only |
| GET | `/production-returns` | `productionReturnService.listProductionReturns` | `production-returns.routes.ts:40` | |
| GET | `/production-returns/summary` | `productionReturnService.getProductionReturnsSummary` | `production-returns.routes.ts:47` | month to date, per branch × status + overall total; `?branchId=` narrows. Added 2026-10-18 |
| POST | `/production-returns` | `productionReturnService.createProductionReturn` | `production-returns.routes.ts:97` | `branchId` taken verbatim from body (line 99) — safe only because the whole router requires `super_admin`/`production_user` (`:22`), no branch role can call it |
| PUT | `/production-returns/:id/review` | `productionReturnService` review action | `production-returns.routes.ts:172` | |
| GET | `/production-discounts` | `productionDiscountService.listProductionDiscounts` | `production-discounts.routes.ts:73` | |
| PUT | `/production-discounts/:id/review` | `productionDiscountService` review action | `production-discounts.routes.ts:132` | Atomic check-and-set on `status='pending'` |

**Confirmed real but NOT wired into the Production client** (per `mobile-production-plan.md`
and the screen-mapping pass): `GET /stock/history/branches` (Branch Stock, screen 09) —
`super_admin`-only server-side per `stock.routes.ts`, blocking this screen until either the
route is opened to `production_user` or a different endpoint is used; `/reports/*`
(Production Reports, screen 13) — the router explicitly refuses `production_user`; Special
Events for this role's view (screen 12) — backend not yet read for a production-side
shape; `/support`, `/support/lookup`, `POST /support` (Help Desk/New Query, screens 14/15)
— confirmed `production_user`-accessible already (reused by Branch's own Help Desk, Slice
10) but no Production-side screen consumes them yet.

**Special Orders — confirmed real, confirmed unconsumed by either app**:
`backend/src/routes/special-orders.routes.ts`,
`backend/src/shared/schemas/special-order.schemas.ts`,
`backend/src/shared/types/special-order.types.ts` all exist with a dedicated integration
test (`backend/src/services/__tests__/special-orders.integration.test.ts`). No mobile
service file calls `/api/special-orders` anywhere — `grep -rn "special-orders"
mobile/src` returns nothing.

## Finance app — endpoints

**No mobile service file exists for any Finance endpoint.** `find mobile/src/api/services
-iname "*finance*"` and `grep -ril "finance\|payroll\|ledger\|partner"
mobile/src/api/services` both return nothing. `mobile-finance-plan.md` (pre-existing,
backend-only audit) lists the permission model and a partial screen→endpoint confirmation
table, but zero of it has been turned into an actual mobile service/hook/screen. There is
therefore no mobile-side endpoint contract to verify for Finance — the gap is the complete
absence of a consuming client, not a mismatch between client and server. See
`mobile-finance-plan.md` for the backend-side endpoint inventory that exists to build
against whenever this module is scoped for real.
