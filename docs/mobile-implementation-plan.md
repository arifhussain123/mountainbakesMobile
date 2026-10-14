# Mobile implementation plan — branchApp.md adoption

Full plan: `/home/murtaza/.claude/plans/squishy-dancing-cerf.md` (session-local). This file
is the durable, in-repo copy with a live status column, updated at the start/end of each
slice.

| Slice | Scope | Status |
|---|---|---|
| 1 | Theme (fixed dark "Branch" palette), Icon additions (box/plus/minus/trash/calendar), full route/type scaffolding, these docs | **Done** |
| 2 | Orders: reconcile New Orders (04) list, build Create Order (05) | **Done** |
| 3 | Stock: reconcile Stock (11), build Stock Check (12), Return Items (06), Return Stock (13) | **Done** |
| 4 | Discounts: Request Discount (07), Discounts list (14) | **Done** |
| 5 | Cash: Cash Deposit (08), Cash Transfers list (15) | **Done** |
| 6 | Expenses: Shop Expenses list (16), New Shop Expense (17) | **Done** |
| 7 | Special Events (18, list view first), Event Demand (19) | **Done** |
| 8 | Daily Sale Record (21), Manual Feed (22), Branch Closing (20) | **Done — see Slice 12 for Branch Closing** |
| 9 | Reports (23): Trend / Top Products / Packing | **Done** |
| 10 | Help Desk (24), New Query (25) | **Done** |
| 11 | Onboarding (02/02b), Splash polish (01), Login polish (02c), Profile/Settings (26) | **Done** |
| 12 | Branch Closing (20) — unblocked via a justified backend addition (branchApp.md rule 10) | **Done** |
| 13 | Bottom-sheet conversion for the 8 modal-presented forms (05/06/07/08/12/17/22/25) | **Done** |

## Slice 1 detail (done)

- `shared/theme/colors.ts`: `darkColors` replaced with the HTML reference's "Midnight"
  palette (`#0B0C12` bg, glass-card-approximating `#15161D` surface, `#F5F1EC` text,
  added `secondary`/`info` tokens). `lightColors` kept, unused.
- `shared/theme/index.ts`: `useAppTheme()` no longer branches on `useColorScheme()` —
  always returns the dark palette.
- `shared/ui/Icon/Icon.tsx`: added `box`, `plus`, `minus`, `trash`, `calendar`.
- `navigation/routes.ts` + `navigation/types.ts`: every route constant and param-list
  entry for all 28 screens added now, so later slices only add a screen component + one
  `Stack.Screen`/`Drawer.Screen` registration.
- `navigation/DrawerNavigator/DrawerContent.tsx`: added missing Main-section labels
  (Discounts, Cash Deposits, Special Events, Branch Closing, Daily Sale Record) — all
  still route to `ComingSoonScreen` until their slice lands.
- Verified: `npx tsc --noEmit`, `npx eslint src/shared/theme src/shared/ui/Icon
  src/navigation`, `npx jest` — all clean (only pre-existing warnings, no new errors).

## Slice 2 detail (done)

**Correction to the plan's original endpoint mapping:** branchApp 04/05 ("New Orders" /
"Create Order") turned out to be the branch's production-demand workflow
(`/api/production-orders`, `/api/packing-materials`), not `POST /api/orders` as the plan
assumed — there is no customer concept anywhere in the 04/05 HTML reference, and
`POST /api/orders` requires a `customerId`. Caught by reading `production-order.types.ts`
and `production-orders.routes.ts` before writing any screen code. See
`mobile-architecture-audit.md` for the full explanation.

- `api/types.ts`: added `ProductionOrder(Status|Item|PackingItem)`, `ProductionOrderListResponse`,
  `CreateProductionOrderInput`, `PackingMaterial(ListResponse)`.
- `api/services/productionOrderService.ts`, `packingMaterialService.ts`: list + create,
  mirroring `salesService.createPosSale`'s businessDate-stamping pattern. No geofence call —
  confirmed absent from this route (only order/sale/stock-return creation are geofenced).
- `api/hooks/useProductionOrdersApi.ts`, `usePackingMaterialsApi.ts` + `queryKeys.ts` entries.
- `features/orders/components/OrderCard.tsx`: rewritten for the real `ProductionOrder` shape
  (demand number, requested vs approved qty, packing count, cancel reason) — it was
  previously rendering the wrong `Order` type.
- `features/orders/screens/OrdersListScreen`: rewritten against `useProductionOrders()`,
  2 tabs (Active: pending/awaiting_verification/verified; History: approved/rejected/cancelled),
  search by demand number or product name, "+ New Order" → `CREATE_ORDER`.
- `features/orders/screens/CreateOrderScreen` (new): product qty table (all active products,
  stock balance from `useStock`, live rate), collapsible Packing Materials section (reuses
  a picker-modal pattern copied from `sales/ProductPickerModal`), required-date text input
  (client-validated `YYYY-MM-DD`, cannot submit without it), totals footer, Clear + Submit.
- **Deliberately not wired** (HTML mockup shows them, backend doesn't support them as drawn):
  "Save Draft" — `production_orders` has no draft status, every submission is 'pending'
  immediately; "Special Order Items" section — `CreateProductionOrderSchema` rejects a
  non-empty `specialItems`, that flow is `POST /api/special-orders`, a separate feature
  (branchApp screen outside this slice's scope, not yet mapped). A fake demand-number
  preview (the mockup's "PO-CCB-…" header) is also skipped — the real number is minted
  server-side on submit, never fabricated client-side.
- `navigation/OrdersStackNavigator`: added `CREATE_ORDER` as a modal screen.
- Verified: `npx tsc --noEmit` (clean), scoped `npx eslint` on changed paths (0 errors, 37
  pre-existing-style warnings — inline styles, `no-void`), `npx jest` (4/4 passed).

## Slice 3 detail (done)

- `shared/ui/Icon`: added `camera`, `image` (Return Items' Camera/Gallery buttons).
- **New dependency**: `react-native-image-picker@8.3.1` — the first photo-capture
  flow in this app. No native build/pod-install/gradle-sync was run in this
  environment (no device/emulator, same gap as every slice's testing report); the
  JS side type-checks and lints clean, but native linking is unverified.
- `api/client.ts`: added `put`/`delete` to `apiClient` (previously only `get`/`post`)
  — needed for `PUT/DELETE /stock/returns/:id`.
- `api/types.ts`: added `Attachment`/`AttachmentEntity` (scoped to `'branch_return'`
  only — extend as later slices upload against other entities), `BranchReturn(Status)`,
  `BranchReturnListResponse`, `CreateBranchReturnInput`.
- `api/services/attachmentService.ts`: `uploadAttachment` (multipart `POST /attachments`,
  RN's `{uri,type,name}` FormData part — no client-side resize pass, picker options
  approximate `RETURN_PHOTO_MAX_DIMENSION`/`RETURN_PHOTO_QUALITY` instead) and
  `discardAttachment`. Exported directly from `@/api` (not a query hook — one-shot
  side effects, not cached data), matching `generateIdempotencyKey`'s existing pattern.
- `api/services/stockReturnService.ts` + `api/hooks/useStockReturnsApi.ts`: list/create/
  revise/withdraw against `/stock/return` and `/stock/returns/:id` — all four confirmed
  geofenced except resubmit (not wired this slice — Change/Withdraw cover the HTML
  reference's own actions; Resubmit is a follow-up if a returned-and-corrected row needs it).
- `features/stock/screens/StockOverviewScreen` (11): added a Returned stat (row + totals)
  and a quick-actions row (Stock Check / Return Items / Return Stock) — the screen already
  matched branchApp 11 closely from Slice 1's inventory, this was a reconciliation, not a rebuild.
- `features/stock/screens/StockCheckScreen` (12, new): client-only compare of a typed
  count against the live balance. **Nothing is saved** — there is no backend endpoint for
  a stock-check result; "Verify" only shows a local mismatch summary, matching the HTML
  reference's own "nothing on this screen is saved" copy.
- `features/stock/screens/ReturnItemsScreen` (06, new, modal): product rows with
  available-qty-bounded stepper, optional reason, required photo (Camera/Gallery via
  `react-native-image-picker`, staged via `uploadAttachment('branch_return', …)` before
  `POST /stock/return`).
- `features/stock/screens/ReturnStockListScreen` (13, new): the branch's own return
  history, status filter chips, Change (qty/reason via a modal, `PUT /stock/returns/:id`)
  and Withdraw (`DELETE /stock/returns/:id`) on open (`pending`/`returned`) rows only.
- `navigation/StockStackNavigator`: added `STOCK_CHECK`/`RETURN_ITEMS` as modals and
  `RETURN_STOCK_LIST` as a pushed screen.
- Verified: `npx tsc --noEmit` (clean), scoped `npx eslint` (0 errors, 75 pre-existing-style
  warnings), `npx jest` (4/4 passed).

## Slice 4 detail (done)

- `api/types.ts`: `BranchDiscount(Status)`, `BranchDiscountListResponse`, `CreateBranchDiscountInput`
  — confirmed a discount moves no stock (no idempotency key, no geofence on
  `branch-discounts.routes.ts`, unlike returns/orders).
- `api/services/discountService.ts` + `api/hooks/useDiscountsApi.ts`: list/create/revise/withdraw.
- `features/discounts`: `DiscountCard` (shared by both screens, shows `reviewNote` when
  Production sent it back or rejected it), `ReviseDiscountModal`, `DemandPickerModal`
  (claims are raised against one of the branch's own `useProductionOrders()` demands).
- `RequestDiscountScreen` (07): demand picker, amount, reason, "YOUR DISCOUNT REQUESTS"
  (last 5) with Change/Withdraw inline, matching the HTML reference's own layout.
- `DiscountsListScreen` (14): full history, status filter chips, search.
- `navigation/DiscountsStackNavigator` (new) registered as a `Drawer.Screen` (first
  drawer-level stack to go live — Slice 1 only scaffolded its types). `DrawerContent`'s
  "Discounts" and "Returns" items now navigate for real instead of `comingSoon`.
- Verified: `npx tsc --noEmit` (clean), scoped `npx eslint` (0 errors, 43 warnings, same
  pre-existing categories), `npx jest` (4/4 passed).

## Slice 5 detail (done)

- `api/types.ts`: `CashTransfer(Method|Status)`, `CashTransferListResponse`,
  `CreateCashTransferInput`; `AttachmentEntity` extended with `'cash_transfer'`.
- `api/services/cashTransferService.ts` + `api/hooks/useCashTransfersApi.ts`: list/create
  only — confirmed `cash-transfers.routes.ts` has no edit/withdraw route by design ("a
  wrong submission is rejected by Finance and raised again"). Idempotent (`idempotent
  ('cash_transfer.create')` on the route), no geofence.
- `features/cash/hooks/useCashDepositForm.ts`: cash/easypaisa/bank/fuel inputs, computed
  Total, photo required only when Total > 0 (a fuel-only deposit may skip it, matching
  `CreateCashTransferSchema`'s own rule) — reuses the Return Items photo-capture pattern.
  **"Auto" (fill from the Daily Sale Record) deliberately not wired** — that record
  doesn't exist until Slice 8, exactly as flagged in the plan from the start.
- `CashDepositScreen` (08), `CashTransfersListScreen` (15, Awaiting/Approved summary,
  status filter chips, no edit/withdraw actions on the cards since none exist server-side).
- `navigation/CashStackNavigator` (new), registered as a `Drawer.Screen`; "Cash Deposits"
  drawer item now navigates for real.
- Verified: `npx tsc --noEmit` (clean), scoped `npx eslint` (0 errors, 48 warnings, same
  pre-existing categories), `npx jest` (4/4 passed).

## Slice 6 detail (done)

- `api/types.ts`: `Expense(PaymentMethod)`, `EXPENSE_CATEGORIES` (the 15-value fixed list
  the form offers), `ExpenseListResponse`, `CreateExpenseInput`.
- `api/services/expenseService.ts` + `api/hooks/useExpensesApi.ts`: list (last 7 business
  days, server-scoped) + create. No edit/delete exists for this resource.
- `ShopExpensesListScreen` (16): hero total (of the filtered/search set, not a server
  aggregate — labelled "Total (filtered)" so it never claims to be more than it is),
  search by description/category. **`/expenses/export` deliberately not wired** — no
  file-download/share infrastructure exists in the app yet; flagged as a gap rather than
  faking a download button that does nothing.
- `NewShopExpenseScreen` (17): category chips (all 15), amount, description, cash/
  easypaisa payment chips, optional remarks. Date is today-only and stamped server-side
  from `getBusinessDate()` — no date picker shown, matching the backend's own refusal of
  any other date for a branch role.
- `navigation/ExpensesStackNavigator` (new), registered as a `Drawer.Screen`; "Expenses"
  drawer item now navigates for real.
- Verified: `npx tsc --noEmit` (clean), scoped `npx eslint` (0 errors, 37 warnings, same
  pre-existing categories), `npx jest` (4/4 passed).

## Slice 7 detail (done)

- `api/types.ts`: `SpecialEvent(Category|Status|Priority)`, `EventDemandStatus`,
  `EventBranchDemand(Item)`, `SaveEventDemandInput` — scoped to the fields the branch
  screens actually read (not every admin-only field on `SpecialEventView`).
- **Confirmed the plan's open item**: Event Demand's "Save Draft" is a REAL backend state
  (`event_branch_demands.status: 'draft'`, `POST /special-events/:id/demands` is a true
  create-or-replace-while-draft), unlike a production order's fake one — so both Save
  Draft and Submit are wired for real here, unlike Slice 2's Create Order.
- `api/services/specialEventService.ts` + `api/hooks/useSpecialEventsApi.ts`: list (current
  year), get-my-demand, save-draft, submit.
- `SpecialEventsScreen` (18): **List view only** — the HTML reference also shows a
  Calendar tab; there is no month-calendar component anywhere in this app, so Calendar
  stays an explicit follow-up rather than being faked with a placeholder grid.
- `EventDemandScreen` (19): hydrates from the branch's existing draft if one exists
  (`useMyEventDemand`), add-product modal, qty steppers, expected customers, notes, Save
  Draft + Submit. Locked (read-only) once the server reports anything past `'draft'`.
- `navigation/EventsStackNavigator` (new), registered as a `Drawer.Screen`; "Special
  Events" drawer item now navigates for real.
- Verified: `npx tsc --noEmit` (clean), scoped `npx eslint` (0 errors, 45 warnings, same
  pre-existing categories), `npx jest` (4/4 passed).

## Slice 8 detail (Daily Sale Record + Manual Feed; Branch Closing — see Slice 12)

- `api/types.ts`: `DailySaleRecord(Status)`, `PaymentMethodLock`, `DailySaleSummary`,
  `DailySaleRecordList`, `DailySaleRecordDetail`, `FeedDailySaleRecordInput`.
- `api/services/dailySaleService.ts` + `api/hooks/useDailySaleApi.ts`: list, generate
  (idempotent, upserts on branch+date), feed (manual-feed), verify.
- **Confirmed the plan's open item**: `PUT /daily-sale-records/:id/verify` is
  `requireRole('super_admin', 'branch_manager')` — callable by a branch manager, exactly
  as `daily-sale.routes.ts`'s own header comment states. Wired for real.
- `DailySaleRecordListScreen` (21): "Generate Today" quick action, per-day cards each
  showing auto figures + a Generate/Manual Feed/Verify action depending on
  `record.id === null` (not yet generated) vs `status`. Window summary card (Total Sale /
  Difference / Discount) from the server's own `DailySaleSummary`, never recomputed
  client-side.
- `ManualFeedScreen` (22): addressed by **business date**, not record id — matches
  `feed_daily_sale_record`'s own design (it ensures the record if one doesn't exist yet).
  Blank field = "leave as is", matching the schema. No Foodpanda field — the schema has
  none, by design (settled by the aggregator). `navigation/types.ts`'s
  `MANUAL_FEED` param was changed from the Slice-1 scaffold's `{ recordId }` to
  `{ businessDate }` once this was confirmed against the real backend contract.
- **Branch Closing (20) deliberately NOT built at this point** — `branch-closing.routes.ts`
  had only `GET /export` (an Excel/CSV file), no JSON read endpoint. Building a read-only
  composited view would have meant reimplementing `computeClosingTotals` (backend-only,
  `backend/src/shared`) in the mobile client — exactly the "never invent/duplicate
  business logic" rule this whole build operates under. Resolved properly in Slice 12,
  below, rather than worked around here.
- `navigation/ClosingStackNavigator` (new), registered as a `Drawer.Screen`; "Daily Sale
  Record" drawer item now navigates for real.
- Verified: `npx tsc --noEmit` (clean — one real type error caught and fixed:
  `ListDailySaleRecordsParams` needed an index signature to satisfy `apiClient.get`'s
  params type), scoped `npx eslint` (0 errors, 49 warnings, same pre-existing categories),
  `npx jest` (4/4 passed).

## Slice 9 detail (done)

- `api/types.ts`: `PackingUsageRow`, `PackingUsageResponse`.
- `api/services/reportService.ts` + `api/hooks/useReportsApi.ts`: `getPackingUsage`/`usePackingUsage`.
- `ReportsScreen` (23): internal tab state (Trend / Top Products / Packing), sharing one
  `DateFilter` (daily/weekly/monthly) across all three. **Trend and Top Products
  deliberately reuse** `SalesChart`/`TopProductsDonut` and `getAnalyticsWindow` directly
  from `@/features/dashboard` (already consumed by the Home dashboard against the same
  `GET /sales-analytics`) rather than rebuilding chart rendering a second time — a
  judgment call to reuse generic chart/date-math code, not business logic. Packing tab is
  new, from `GET /reports/packing-usage`, with server-computed totals (never summed
  client-side).
- `navigation/ReportsStackNavigator` (new), registered as a `Drawer.Screen`; "Reports"
  drawer item now navigates for real.
- Verified: `npx tsc --noEmit` (clean), scoped `npx eslint` (0 errors, 31 warnings, same
  pre-existing categories), `npx jest` (4/4 passed).

## Slice 10 detail (done)

- `api/types.ts`: `SupportReferenceType`, `SupportTicketStatus`, `SupportDetailField`,
  `SupportReference`, `SupportTicket`, `SupportTicketListResponse`.
- `api/services/supportService.ts` + hooks: list (own queue only, server-enforced),
  lookup-by-reference, create. `lookupSupportReference` exported directly from `@/api`
  (one-shot side effect, not cached query state) — same pattern as `uploadAttachment`.
- `HelpDeskListScreen` (24): own queries, resolution note shown once Admin answers.
- `NewQueryScreen` (25): reference lookup with a found/not-found preview before the
  message box unlocks, matching the HTML reference's own flow.
- `navigation/HelpDeskStackNavigator` (new), registered as a `Drawer.Screen`; "Help Desk"
  drawer item now navigates for real ("Support Center" stays `comingSoon` — that's the
  older CLAUDE.md concept, not a branchApp.md screen).
- Verified: `npx tsc --noEmit` (clean), scoped `npx eslint` (0 errors, 39 warnings, same
  pre-existing categories), `npx jest` (4/4 passed).

## Slice 11 detail (done) — branchApp.md's 28-screen plan is now fully addressed

- `navigation/routes.ts`/`types.ts`: added `ONBOARDING`, a new `AuthStackParamList`
  (`Onboarding` → `Login`), and `PROFILE`/`SETTINGS` entries on `DrawerParamList` (both
  were route constants from Slice 1 with no screen or param-list entry until now).
- `features/auth/screens/OnboardingScreen` (02/02b, new): 2 slides behind an
  AsyncStorage `mountainbakes.onboardingSeen` flag — Skip/Next on slide 1, Get Started on
  slide 2. Slide 2's "day ends at 2 AM" copy describes the real `getBusinessDate()` rule,
  not a separately invented one.
- `navigation/AuthNavigator`: now reads the onboarding flag once (mirroring
  `authStore.bootstrap()`'s own pattern) to decide whether a first-time device starts at
  Onboarding or Login; returning users go straight to Login.
- Splash (01): left as-is — the existing `SplashView` (logo + spinner, shown only while
  `authStore.bootstrap()` resolves) already matches the HTML reference closely enough
  that there was nothing concrete to change.
- Login (02c): left as-is — `LoginScreen`/`useLoginForm` already has everything
  branchApp.md asks for (email, show/hide password, Remember me, validation, loading/
  error) and already omits the HTML mockup's "Finance Ledger sign-in" button, per the
  plan's Slice-1 decision.
- `features/profile`: new `ProfileScreen` (name/email/role/branch from `authStore`, no
  phone field — `SessionUser` has none, not invented) and `SettingsScreen` (Theme: Dark
  (fixed) + Sign Out only — no Notifications/Language toggles that would do nothing).
  Both registered as `Drawer.Screen`s; the "Profile"/"Settings" drawer items navigate for
  real.
- Verified: `npx tsc --noEmit` (clean), scoped `npx eslint` (0 errors, 34 warnings, same
  pre-existing categories), `npx jest` (4/4 passed).

## Slice 12 detail (done) — Branch Closing (20) unblocked

Per branchApp.md rule 10 ("If a required backend capability is missing, document the gap
and implement it only when justified by the existing architecture"): the missing JSON
read was squarely justified — `computeClosingTotals` already existed and was already used
by the export route, so the fix was to expose it as JSON too, not to invent a new business
rule.

- **Backend** (`backend/src/routes/branch-closing.routes.ts`): added `GET
  /api/branch-closing?date=` (defaults to today's business date), same auth/branch-scoping
  as `/export` (extracted into a shared `resolveBranchId` helper so both routes enforce the
  identical rule — a branch reads its own shop only, a super admin must name one). Returns
  `{ date, branchId, branchName, totals, paymentMethods, expenseCategories }`:
  - `totals` is `computeClosingTotals(orders, expenses)` verbatim — the same function, same
    inputs, same result the export has always produced. Nothing recomputed differently.
  - `paymentMethods`/`expenseCategories` are new groupings (by `paymentMethod` / `category`)
    over the same day's orders/expenses the route already fetches — arithmetic over
    raw data already read, not a new rule.
  - Deliberately does NOT include a per-product stock table — `GET /api/stock?date=`
    already serves that shape (`StockRow`: opening/newQty/sold/returned/adjustment/
    balance), and the mobile screen reads it directly rather than this endpoint
    duplicating it.
  - Verified: `npx tsc --noEmit` (clean) from `backend/`. Backend has no working lint
    config (`eslint@^9.17.0` declared, no `eslint.config.js` present — pre-existing,
    unrelated to this change) and no test suite at all (`npm test` script doesn't exist,
    no `*.test.ts` files anywhere in the repo) — `tsc` is the available verification bar,
    matching the rigor already present in this codebase.
- **Mobile**: `api/types.ts` — `ClosingTotals` (mirrors the backend type field-for-field),
  `BranchClosingPaymentMethodTotal`, `BranchClosingExpenseCategoryTotal`,
  `BranchClosingSummary`. New `api/services/branchClosingService.ts` +
  `api/hooks/useBranchClosingApi.ts` (`useBranchClosing(date)`).
- `features/closing/screens/BranchClosingScreen` (new): a prev/next business-date stepper
  (capped at today — no future dates), NET/Sales/Expenses/Cash in Hand/Orders+Cancelled/
  Discounts stat grid from `totals`, a takings-by-payment-method breakdown card, a
  shop-expenses-by-category breakdown card, and the closing-stock list — the last one
  reusing `StockRow` directly from `@/features/stock/components` (already built for the
  Stock screen, same row shape) against `useStock(date)`, not duplicated.
- `navigation/ClosingStackNavigator`: `BRANCH_CLOSING` is now this stack's entry point
  (matching branchApp.md's own 20/21/22 ordering), registered for real.
  `DrawerContent.tsx`'s "Branch Closing" item now navigates to it instead of `comingSoon`.
- Verified (mobile): `npx tsc --noEmit` (clean), `npx eslint src` (0 errors, 536 warnings —
  up from 519, same pre-existing categories: `react-native/no-inline-styles`, `no-void`),
  `npx jest` (4/4 passed).

Not run: the live read against a real signed-in branch session and real order/expense/
stock data for a given day — no device/emulator in this environment, same gap as every
mutation and read path in this build. In particular, the payment-method/expense-category
groupings have been reviewed against the real `Order`/`Expense` field names but never
exercised against a live response.

**branchApp.md's 28-screen scope is now fully addressed**: every screen is either built
against the real backend or individually documented as blocked with evidence, per the
spec's own Definition of Done (Section 19) — there is no longer any Branch screen with no
backend path forward.

## Slice 13 detail (done) — bottom-sheet conversion

The 8 forms the design spec presents as a partial-height bottom sheet (05 Create Order, 06
Return Items, 07 Request Discount, 08 Cash Deposit, 12 Stock Check, 17 New Shop Expense, 22
Manual Feed, 25 New Query) were, until this slice, pushed stack screens with
`presentation: 'modal'` — a full-screen card slide-up, not a sheet with a grab handle that
coexists with its parent list. This slice is the real per-screen refactor flagged in
`docs/SCREENS.md`'s "Next steps" item 1: each form stopped being a route (no more
`useRoute()` params / `navigation.goBack()`) and became an overlay the parent list screen
opens via a `BottomSheetModal` ref, passing props instead of route params.

- `App.tsx`: added `BottomSheetModalProvider` (from the already-installed
  `@gorhom/bottom-sheet`) inside `SafeAreaProvider`/outside `RootNavigator` — the one
  provider every `BottomSheetModal` in the app now needs.
- New `shared/ui/FormBottomSheet`: the shared chrome (title/subtitle row, a close button,
  `BottomSheetScrollView` for the form body) every converted screen uses instead of
  `Screen`+`AppHeader`+`ScrollView`+`KeyboardAvoidingView`. Takes `onRequestClose` (wired to
  the parent's own `sheetRef.current?.dismiss()`, not a ref-reads-ref hack) so the header's
  close button behaves exactly like swipe-to-dismiss. `snapPoints={['92%']}`,
  `keyboardBehavior="extend"` — forms that need the keyboard (every one of the 8 has at
  least one `TextInput`) stay usable without a separate `KeyboardAvoidingView`.
- Each of the 8 screens' default export was renamed from `*Screen` to `*SheetContent`
  (e.g. `CreateOrderScreen` → `CreateOrderSheetContent`) and stripped of `Screen`/
  `AppHeader`/`ScrollView`/`KeyboardAvoidingView`/`useNavigation` — they're now plain
  content components taking an `onClose: () => void` prop (used for Cancel buttons and the
  post-submit success `Alert`'s `OK`), rendered as `FormBottomSheet`'s children from their
  one parent list screen. Sticky footers (totals + action buttons in Create Order/Return
  Items/Stock Check) are no longer pinned below a `KeyboardAvoidingView` — they're the last
  block inside the sheet's own scroll content instead, a deliberate simplification rather
  than fighting `BottomSheetScrollView`'s own gesture handling with an absolutely
  positioned footer.
- Manual Feed (22) is the one screen that took a route param (`businessDate`) rather than
  none — it's now a prop instead: `DailySaleRecordListScreen` holds
  `manualFeedDate: string | null` state, opens the sheet via `openManualFeed(businessDate)`,
  and renders `<ManualFeedSheetContent businessDate={manualFeedDate} ... />` only once a
  date is set (the sheet's `onDismiss` clears it back to `null`).
- Request Discount (07) keeps its existing (pre-this-slice) extra "YOUR DISCOUNT REQUESTS"
  recent-claims list inside the sheet — not part of the design spec's screen 07, added in
  an earlier slice, left as-is per "avoid unrelated refactors."
- Removed the now-dead stack-screen registrations and param-list entries for all 8 routes
  (`OrdersStackNavigator`, `StockStackNavigator`, `DiscountsStackNavigator`,
  `CashStackNavigator`, `ExpensesStackNavigator`, `ClosingStackNavigator`,
  `HelpDeskStackNavigator`, `navigation/types.ts`) and the now-unused route constants
  (`CREATE_ORDER`, `RETURN_ITEMS`, `STOCK_CHECK`, `REQUEST_DISCOUNT`, `CASH_DEPOSIT`,
  `NEW_SHOP_EXPENSE`, `MANUAL_FEED`, `NEW_QUERY`) from `routes.ts`, confirmed zero remaining
  references first.
- Verified: `npx tsc --noEmit` (clean), `npx eslint src App.tsx` (0 errors, 542 warnings —
  up from 522, same pre-existing categories: `react-native/no-inline-styles`, `no-void`;
  the new `FormBottomSheet` itself carries a handful of inline-style warnings, consistent
  with the rest of the UI layer), `npx jest` (4/4 passed).

Not run: opening a sheet on a real device/emulator — no device/emulator in this
environment, same gap as every native-dependency addition in this build (`@gorhom/
bottom-sheet`'s own pod/gradle linking was already a known gap before this slice, per
`docs/SCREENS.md`). The snap-point height, keyboard-avoidance behavior, and swipe-to-dismiss
gesture have been reviewed against the library's documented API but never exercised live.

## Open items carried forward (owner's call, not assumed — see plan file Section 6)

- Production order verify/cancel (branch-facing `PUT /production-orders/:id/verify` and
  `/:id/cancel`) are confirmed real and branch-scoped but not yet wired into any screen —
  a natural Slice 2 follow-up once a demand-detail screen exists (the list only shows
  summary cards today, matching the HTML reference's own List view).
- Special Order Items (`POST /api/special-orders`) is a distinct branchApp.md screen not
  yet mapped to a slice — flag for the owner when sequencing remaining slices.
- `react-native-image-picker` needs a real native build (pod install / gradle sync) and
  on-device test before Return Items' Camera/Gallery buttons can be trusted — flag this to
  whoever runs the first device build.
- Return Stock's "Resubmit" action (`POST /stock/returns/:id/resubmit`, for a `returned`
  row sent back unchanged) is confirmed real but not wired — Change already covers editing
  a `returned` row; add Resubmit only if the owner wants the two kept distinct in the UI.
- `GET /expenses/export` (Excel/CSV) is confirmed real but not wired — the app has no
  file-download/share capability yet; needed before any "Export" button can be built
  honestly, here or anywhere else (Reports, Branch Closing's own export endpoint, still
  unwired even though the JSON read now is).

- "Finance Ledger sign-in" button in the HTML mockup — recommended dropped (belongs to a
  separate finance-role app per the sibling `mountainbakesFinance.dc.html` design file).
- Special Events (18) Calendar view — no existing month-calendar component; List view
  ships first, Calendar is an explicit follow-up micro-slice.
- Return Items (06) required-photo toggle (`RETURN_PHOTO_REQUIRED`) — mobile has no
  visibility into this server config flag; always attempt to require a photo client-side
  and let the server be the final arbiter if it turns out to be optional (Slice 3).

---

# Audit pass — 2026-10-14 gap backlog

Independent read-only audit (no code changed) covering Branch (28 screens), Production
(16 screens), and Finance (23 screens). Ranked by severity: **blocker** (data integrity,
security, or "this role has nothing to use"), **should-fix** (a real functional/UX gap
against the spec, not cosmetic), **nice-to-have** (documented, deliberate, low-risk scope
cut). Every item below was verified by reading the cited file; nothing here is invented.

## Blocker

1. **Finance role: 0 of 23 reference screens built.** `RootNavigator/index.tsx:42` routes
   all four finance roles to `FinanceDrawerNavigator`, which is a single static "Coming
   soon" screen (`src/navigation/FinanceDrawerNavigator/index.tsx:14-29`) with no real
   content. `grep -ril "finance\|payroll\|ledger\|partner" mobile/src` finds nothing but
   that one file and `docs/mobile-finance-plan.md` (a backend-only audit, not an
   implementation). No `financeService.ts`, no `features/finance/`, zero wired mutations
   (approve/reject cash transfers, post ledger entries, approve payslips/advances — none of
   these exist to audit for idempotency or audit-trail completeness because none of them
   exist at all). Spec section: Finance Dashboard through Finance Settings (all 23
   Finance-reference screens). This is the single largest gap found in this audit.
2. **No device/emulator run has ever been performed on this app, for any role.** Every
   slice's own verification in this file and in `mobile-testing-report.md` ends with "Not
   run: ... no device/emulator in this environment" — this is true without exception,
   across all ~20 slices. Four native modules that real users depend on have **never been
   exercised once**: `react-native-keychain` (every session's refresh token — if native
   linking is wrong, no one can ever stay logged in), `@react-native-community/geolocation`
   (the geofence check gating New Sale and Return Items — Slice 3's own note: "native
   linking is unverified"), `react-native-image-picker` (required photo on Return Items/
   Cash Deposit), and `@react-native-community/netinfo`. "Production-ready" cannot be
   claimed for a React Native app whose native layer has literally never booted once.

## Should-fix

3. **`useNetworkStatus` hook is dead code — no offline banner exists anywhere.**
   `mobile/src/shared/hooks/useNetworkStatus.ts:5-16` implements the spec's required
   (CLAUDE.md §37) offline detection, but `grep -rn "useNetworkStatus(" src` matches only
   its own definition — zero screens import or render it. A cashier mid-sale with no
   connection gets no warning at all; `apiClient`'s own error mapper
   (`src/api/client.ts:41-43`) does produce a "No internet connection" message, but only
   *after* a request already fails, never proactively.
4. **Stock Check (screen 12) persists nothing server-side.** Self-documented at
   `src/features/stock/screens/StockCheckScreen/index.tsx:11-13`: "NOTHING HERE IS SAVED —
   there is no backend endpoint for a stock-check result." The spec's own traceability
   requirement (every stock movement auditable) implies a stock-check discrepancy should
   be a persisted, reviewable event, not a client-memory-only `Alert.alert`. Needs a real
   backend endpoint before this can be called complete, not a client-side fix.
5. **Four form screens show no loading/error state for their background reference-data
   fetch, only for submit** — `CreateOrderScreen` (hook `useCreateOrderForm.ts` exposes no
   loading/error for `products`/`stock`, and the screen doesn't read what little exists),
   `ReturnItemsScreen` (`useReturnItemsForm.ts`, same pattern), `NewSaleScreen`
   (`useNewSaleForm.ts:114` returns `productsLoading` but `NewSaleScreen/index.tsx` never
   reads it), `RequestDiscountScreen` (no loading/error UI for the demand picker fetch or a
   failed recent-claims list). A slow or failed initial load renders as a silently empty
   product/demand picker with zero explanation — inconsistent with every list screen in
   the app, which does have `LoadingSkeleton`/`ErrorState` wired.
6. **New Sale's pre-commit total is entirely client-computed and could drift from what the
   server actually persists**, with no confirmation round-trip before the charge:
   `useNewSaleForm.ts:54-67` computes `subtotal`/`discountTotal`/`grandTotal`/`changeDue`
   from the locally cached product price list; only `{productId, qty, discount}` is sent
   (line 87) and the server returns its own authoritative totals in the response — so the
   *stored* sale is never wrong, but a cashier who already handed back change computed
   from the client's number has no way to know if it silently differed (e.g. a stale
   cached price) until after the fact. Spec section: CLAUDE.md §18/§32 ("never trust
   client calculations for ... prices"; "check available stock" before completing a sale).
   Fix direction: either a price-freshness check before enabling Save, or surfacing the
   server's returned total/change prominently if it differs from the preview.
7. **No component/mutation-flow test coverage.** Exactly one test file exists in the whole
   mobile app: `mobile/__tests__/businessDate.test.ts` (4 cases, business-date rollover
   only). No test exercises a single form, hook, or screen — the New Sale/Cash Deposit/
   Return Items flows that move money or stock have zero regression protection beyond
   `tsc`/`eslint`.
8. **Production: Branch Stock (09) and Production Reports (13) are blocked by role-gated
   backend routes, not missing mobile work.** `GET /stock/history/branches`
   (`backend/src/routes/stock.routes.ts`, per `mobile-production-plan.md`'s own note) is
   `requireRole('super_admin')` only; `/reports/*` explicitly refuses `production_user`.
   Needs an owner decision (open the route, or add a production-scoped equivalent) before
   either screen can be built — flagging as should-fix rather than blocker since Production
   otherwise has 12/16 screens working.
9. **Production: Special Events (12) and Help Desk/New Query (14/15) not started.**
   `ProductionDrawerNavigator/index.tsx:12-14,23-25` wires these three to
   `comingSoonPane(...)` placeholders. Help Desk/New Query in particular should be nearly
   free — `supportService` is already confirmed `production_user`-accessible server-side
   (reused as-is by Branch's own Help Desk) — the gap is purely "no Production-side screen
   built yet," not a backend blocker.
10. **Special Orders (SO-IDs) exist on the backend with no mobile consumer anywhere.**
    `backend/src/routes/special-orders.routes.ts` (plus its own schema, types, and
    integration test) is a real, distinct entity from branch production-demand orders —
    `mobile/src/features/orders/hooks/useCreateOrderForm.ts`'s own comment confirms Create
    Order's schema actively rejects a non-empty `specialItems`, so this was a deliberate
    skip, not an oversight, but it remains a named reference-screen feature (shown inline
    on Production Orders in the mockup) with zero mobile implementation on either side.
11. **`design UIandUX/` pollutes a bare `eslint .` with 17 non-app "errors."** No
    `.eslintignore`/`ignorePatterns` exists (`.eslintrc.js`: `{root: true, extends:
    '@react-native'}` only); every prior slice's verification ran `eslint src` specifically
    to avoid this, but a CI step or a future contributor running the bare `eslint .` from
    `package.json`'s own `"lint": "eslint ."` script would see 17 errors that have nothing
    to do with the app (`no-undef` on browser globals inside the HTML mockup's own
    `support.js`). Trivial fix: add an `ignorePatterns`/`.eslintignore` entry for
    `design UIandUX/`.

## Nice-to-have

12. ~~Bottom-sheet conversion pending for 8 modal-presented forms~~ — **done, see Slice 13.**
13. Special Events (18) Calendar/month-grid view not built — List view ships; no
    month-calendar primitive exists yet in `shared/ui`. Already an explicit, flagged
    follow-up (`mobile-implementation-plan.md` Slice 7 detail, above).
14. No file export/download/share capability anywhere in the app — `GET /expenses/export`,
    `/reports/export`, `/sales-analytics/export`, `/branch-closing/export` are all
    confirmed real and unwired, consistently, across every feature that has one. One
    shared capability (a download/share sheet) would unblock all four at once.
15. Several Drawer/production-drawer items are honest, labeled placeholders rather than
    real screens: Branch app — "Stock History," "Branch Demand," "Products"/"Price List"/
    "Packaging Materials"/"Notifications," "Support Center"
    (`DrawerNavigator/DrawerContent.tsx` — these are CLAUDE.md §5 drawer items, not part of
    the 28-screen branchApp.md scope, so their absence is a scope difference, not a broken
    promise). Same pattern in Production's own drawer for Branch Stock/Special Events/
    Production Reports/Help Desk (already listed above as should-fix items 8-9 since those
    ARE in the 16-screen Production scope).
16. Cosmetic: Event Demand's on-screen header reads "Advance Demand"
    (`src/features/events/screens/EventDemandScreen/index.tsx`), not "Event Demand" —
    same feature, naming drift only.
17. ESLint warning debt: 581 warnings across real app source (`eslint src` equivalent),
    entirely `react-native/no-inline-styles` and `no-void` — zero functional risk, but
    worth a cleanup pass before calling the UI layer fully polished.
18. Not independently line-verified this pass (pattern-consistent with every other hook in
    the codebase, which was uniformly real wherever opened):
    `src/features/events/hooks/useEventDemandForm.ts`,
    `src/features/closing/hooks/useManualFeedForm.ts`,
    `src/features/support/hooks/useNewQueryForm.ts`,
    `src/navigation/ProductionDrawerNavigator/ProductionDrawerContent.tsx`. Low risk, but a
    follow-up read would close out 100% coverage of this audit.

## Explicitly re-checked and found NOT to be gaps (to save a future auditor's time)

- Branch Closing (screen 20) — exists and is real (`BranchClosingScreen`,
  `GET /branch-closing`), despite this audit's own brief flagging it as possibly missing.
- Cash Deposit's client-computed `totalAmount` — server cross-validates it
  (`cash-transfer.schemas.ts:68-79`) and rejects a mismatch; not a trust gap.
- Stock availability for New Sale — genuinely enforced server-side, same DB transaction as
  the decrement (`commit_sale` RPC, row-locked per product); the client never blocks
  submission on its own stock view.
- Historical price preservation — real and server-side
  (`backend/src/services/price.service.ts:26`, `order_items.unit_price` is a stored
  column).
- Branch-scoping on every sales/stock/orders/discount/cash-transfer/special-event route —
  either session-derived only or body-value cross-checked against the JWT; no blind trust
  found anywhere.
