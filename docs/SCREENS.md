# Screen map — design spec → route → status

Reconciles the pixel-perfect per-screen spec (Appendix A of the pasted "Agent Prompt",
and the underlying `design UIandUX/*.html` files it was generated from) against this
codebase's actual routes and screens. One row per screen. Built on React Native CLI
(not Expo) — confirmed by the user after the architecture question — with React
Navigation (not Expo Router), `@gorhom/bottom-sheet` for sheet-presented forms, and the
**existing real backend** (not a mock adapter): this app does not invent data, so a
screen whose backend endpoint doesn't exist yet stays unbuilt and flagged, same
discipline as every slice before this one.

Status legend: **Done** (built, wired to the real backend) · **Partial** (built, but not
yet reconciled against this spec's exact copy/bottom-sheet presentation) · **Not built**
· **Blocked** (no backend endpoint for this role).

## Branch app — role `branch_manager` (28 screens)

| # | Screen | Route | Status | Note |
|---|---|---|---|---|
| 01 | Splash | `SplashView` (RootNavigator) | Partial | Built pre-rebuild; not yet reconciled against this spec's exact copy/glow. |
| 02 | Onboarding 1 | `Onboarding` | Partial | 2-slide version exists; copy/visuals not yet reconciled line-for-line. |
| 02b | Onboarding 3 | `Onboarding` | Partial | Same screen, slide 2 — "day ends at 2 AM" copy present via `businessDate.ts` logic, not yet matched verbatim. |
| 02c | Login | `Login` | Partial | Built; "Finance Ledger sign-in" button deliberately NOT present (Slice 1 decision — building it would expose finance-role surfaces to a branch session; still correct under RN CLI). |
| 03 | Home | `Dashboard` | Partial | Built against real endpoints; exact copy/section order vs. this spec's verbatim list not yet audited. |
| 04 | New Orders | `OrdersList` | Done | Against real `production-orders`. |
| 05 | Create Order | `CreateOrder` (bottom sheet, owned by `OrdersListScreen`) | Done | Converted to `@gorhom/bottom-sheet` — Slice 13. |
| 06 | Return Items | `ReturnItems` (bottom sheet, owned by `StockOverviewScreen`) | Done | Converted — Slice 13. |
| 07 | Request Discount | `RequestDiscount` (bottom sheet, owned by `DiscountsListScreen`) | Done | Converted — Slice 13. |
| 08 | Cash Deposit | `CashDeposit` (bottom sheet, owned by `CashTransfersListScreen`) | Done | Converted — Slice 13. "Auto-fill from Daily Sale Record" now has a real source (Slice 8 landed after Slice 5) — open item to wire. |
| 09 | Sales | `SalesList` | Done | |
| 10 | New Sale | `NewSale` | Done | Full-screen, not bottom-sheet — matches spec's own "Full screen" type for this one. |
| 11 | Stock | `StockOverview` | Done | |
| 12 | Stock Check | `StockCheck` (bottom sheet, owned by `StockOverviewScreen`) | Done | Converted — Slice 13. |
| 13 | Return Stock | `ReturnStockList` | Done | |
| 14 | Discounts | `DiscountsList` | Done | |
| 15 | Cash Transfers | `CashTransfersList` | Done | |
| 16 | Shop Expenses | `ShopExpensesList` | Done | |
| 17 | New Shop Expense | `NewShopExpense` (bottom sheet, owned by `ShopExpensesListScreen`) | Done | Converted — Slice 13. |
| 18 | Special Events | `SpecialEvents` | Partial | List view only — spec's Calendar/month-grid view not built (no month-grid primitive yet). |
| 19 | Event Demand | `EventDemand` | Done | |
| 20 | Branch Closing | `BranchClosing` | Done | Unblocked via a justified backend addition (`GET /branch-closing`, new JSON endpoint composing the existing `computeClosingTotals` function) — see `mobile-implementation-plan.md` Slice 12. |
| 21 | Daily Sale Record | `DailySaleRecord` | Done | |
| 22 | Manual Feed | `ManualFeed` (bottom sheet, owned by `DailySaleRecordListScreen`) | Done | Converted — Slice 13; addressed by a `businessDate` prop instead of a route param now. |
| 23 | Reports | `Reports` | Done | Trend/Top Products/Packing tabs; Branch Comparison chart (admin-only data) correctly absent. |
| 24 | Help Desk | `HelpDesk` | Done | |
| 25 | New Query | `NewQuery` (bottom sheet, owned by `HelpDeskListScreen`) | Done | Converted — Slice 13. |
| 26 | More | `DrawerContent` (drawer, not a stack screen) | Done | |

## Production app — role `production_user` (15 screens)

| # | Screen | Route | Status | Note |
|---|---|---|---|---|
| 01 | Production Dashboard | `ProductionDashboard` | Done | No `/reports/*` access for this role — dashboard composited from `production-orders`+`production-stock` only, confirmed real. |
| 02 | Production Orders | `ProductionOrdersList` | Done | "Special Orders" section (separate from demand) in this spec's copy — not yet confirmed against a `special-orders` endpoint for this screen; open item. |
| 03 | Order Detail | `ProductionOrderDetail` | Partial | Built; POP Print / A4 Challan actions in this spec not implemented (no printer integration). |
| 05 | Sales | `ProductionSalesList` | Done | |
| 06 | New Sale | `ProductionNewSale` | Done | |
| 07 | Production Stock | `ProductionStockOverview` | Done | "Prepared Detail" button in this spec NOT built — no single confirmed endpoint behind it (flagged in `mobile-production-plan.md`). |
| 08 | Prepared Products | `ProductionPreparedProducts` | Done | |
| 09 | Branch Stock | `ProductionBranchStock` | **Blocked** | `GET /stock/history/branches` is `super_admin`-only server-side; needs a backend change or a different endpoint. |
| 10 | Returns | `ProductionReturnsList` / `ProductionReturnDetail` | Done | |
| 11 | Discounts | `ProductionDiscountsList` / `ProductionDiscountDetail` | Done | |
| 12 | Special Events | — | **Not built** | Not yet read against this role's permissions. |
| 13 | Production Reports | — | **Blocked** | `/reports/*` explicitly refuses `production_user`; no endpoint confirmed. |
| 14 | Help Desk | — (stub) | **Not built** | Reuses the same `supportService` as Branch (already role-confirmed); needs its own screen. |
| 15 | New Query | — (stub) | **Not built** | Same. |
| 16 | Drawer | `ProductionDrawerContent` | Done | Chrome, not a screen. |

## Finance app — roles `finance_admin`/`finance_manager`/`accountant`/`finance_auditor` (23 screens)

**None built.** `FinanceDrawerNavigator` is a static "coming soon" placeholder. The
permission model (`requireFinance('view'|'create'|'approve'|'adjust'|'configure')`,
`backend/src/middleware/requireFinance.ts`) is audited in `mobile-finance-plan.md`, and
the screen→endpoint map is complete for 01/02/16-20/23; five route files
(`finance-payroll`, `finance-partners`, `finance-branch-share`, `finance-income`,
`finance-tickets`) still need a full read before 03–15/21–22 can be scoped honestly.

| # | Screen | Endpoint confirmed? |
|---|---|---|
| 01 | Finance Dashboard | Yes |
| 02 | Daily Ledger | Yes |
| 03 | Cash Transfers (Finance's review side) | Partially — `GET`/approve confirmed, not read in full |
| 04–05 | Income & Expense / New Entry | Partially — `requireIncomeVerifier` not yet read |
| 06–11 | Payroll / New Payslip / New Advance / Add Employee / Resignation / Salary Ledger | No — `finance-payroll.routes.ts` not fully read |
| 12–14 | Partner Transactions / New Partner Advance / Partner Detail | No — `finance-partners.routes.ts` not fully read |
| 15 | Company Transaction Details | No — `finance-branch-share.routes.ts` not fully read |
| 16–17 | Ledger Heads / New Ledger Head | Yes |
| 18 | Daily Closing | Yes |
| 19 | Finance Reports | Yes |
| 20 | Audit Trail | Yes |
| 21–22 | Finance Help Desk / Finance New Query | No — `finance-tickets.routes.ts` not fully read (confirmed to be a SEPARATE ticket system from Branch/Production's `support.routes.ts`) |
| 23 | Finance Settings | Yes |

## What changed in this rebuild pass so far

- Confirmed with the user: stay on **React Native CLI**, keep the **real backend**
  (reject the pasted prompt's Expo + mock-data-adapter instructions for the stack and
  data layer) — only its **pixel-perfect per-screen spec** (Appendix A) and its
  **bottom-sheet presentation for forms** are being adopted.
- `shared/theme/colors.ts`: added the design files' full text-tier palette
  (`textMuted`/`textFaint`/`textLabel`), the translucent glass-card tokens
  (`cardFill`/`cardBorder`), and the remaining status/series colors (`infoAlt`, `violet`,
  `orange`) — all additive, nothing existing renamed or re-valued, so no built screen
  shifts tone from this alone.
- Installed `@gorhom/bottom-sheet`, `react-hook-form`, `zod`, `react-native-linear-gradient`
  — none of these existed in `package.json` before. Native linking (pods/gradle) not yet
  run — no device/emulator in this environment, same gap as every native-dependency
  addition in this build (`react-native-image-picker` carries the same caveat from
  earlier in the build).
- **New `Screen` primitive** (`shared/ui/Screen`): the dark background + layered
  diagonal-gradient "radial glow" chrome every screen in the design files shares
  (`LinearGradient` only draws linear gradients, so a true radial is approximated with a
  gradient anchored at the glow's corner, fading to transparent toward the opposite
  corner — reads the same on a phone-sized surface). `glow="default"` (violet
  top-right + teal bottom-left) for ordinary app screens, `glow="warm"` (orange/brown
  top-right) for Splash/Login, `glow="none"` to opt out. Drop-in replacement for a plain
  `SafeAreaView` — same children API.
- `Card` now uses the translucent glass-card tokens (`cardFill`/`cardBorder`) instead of
  the old flat solid `surface` — matches the design files' own card chrome everywhere
  `Card` is used, app-wide, in one change.
- Applied `Screen` to the four highest-visibility screens as the reference
  implementation: Splash (`glow="warm"`, added the "Fresh • Quality • Every Day" /
  "Loading…" copy from the spec that wasn't there before), Login (`glow="warm"`), the
  Branch Home dashboard and the Production Dashboard (`glow="default"`), and the Finance
  placeholder shell.
- Verified: `npx tsc --noEmit` (clean), `npx eslint src` (0 errors, 522 warnings — down
  slightly from 523, same pre-existing categories), `npx jest` (4/4).

**`Screen` rollout — done.** Every screen that used the `SafeAreaView` + flat
`theme.colors.background` pattern now renders through `Screen` (37 files: all of Branch's
remaining screens, all of Production, the shared `ComingSoonPane`/`ComingSoonScreen`
placeholders, `UnsupportedRoleView`, Profile/Settings, Onboarding). Done via a small,
reviewed migration script rather than by hand file-by-file (the replacement was 100%
mechanical — two known JSX patterns, plus the matching import edits — and every file was
re-verified with `tsc`/`eslint` afterward). Three screens had a now-dead single-purpose
`styles.ts` (`container: { flex: 1 }`, superseded by `Screen`'s own background) —
`ComingSoonPane`, `ComingSoonScreen`, and `HelpDeskListScreen` — cleaned up as part of the
same pass (`HelpDeskListScreen/styles.ts` deleted outright, the other two files' dead
`container` key removed) once ESLint's `no-unused-vars` flagged them.

The only remaining `SafeAreaView` usages in `src/` now are inside RN's own `<Modal>`-based
pickers (`ProductPickerModal` ×2, `BranchPickerModal`, `ReturnProductPickerModal`,
`DemandPickerModal`, `ReviseDiscountModal`, `AddProductModal`,
`PackingMaterialPickerModal`, `ReviseReturnModal`) and `Screen` itself — left alone
deliberately: those are overlay pickers presented via `<Modal>`, not top-level navigable
screens, and are squarely inside the scope of the bottom-sheet conversion (next step)
rather than this glow rollout.

## Next steps (in order)

1. **Bottom-sheet conversion — done (Slice 13, `mobile-implementation-plan.md`).** All 8
   forms (05/06/07/08/12/17/22/25) now present via `@gorhom/bottom-sheet`'s
   `BottomSheetModal`, opened from their one parent list screen, with props instead of
   route params. `BottomSheetModalProvider` added at the app root in `App.tsx`. Not yet
   exercised on a real device/emulator — no device/emulator in this environment.
2. Roll `Screen` out to the remaining list/detail screens, starting with the ones most
   visited per role (Sales, Stock, Orders lists).
3. Audit Reports (23) copy against this spec's verbatim text, fix any wording drift.
4. Build Special Events' month-grid/Calendar view (18) — new primitive, no existing
   component to extend.
5. Read the five unread Finance route files, complete the endpoint table, then scaffold
   Finance navigation and build its screens slice by slice — same discipline as Branch
   and Production.
6. Production: Special Events (12) and Help Desk/New Query (14/15) next, per
   `mobile-production-plan.md`.
