# Mobile Finance app — build plan

Source: `design UIandUX/mountainbakesFinance.html` (23 screens). Scope: the four finance
roles (`finance_admin`, `finance_manager`, `accountant`, `finance_auditor`), gated by a
real permission model — this is a materially bigger, higher-stakes domain than Branch or
Production (money is posted to an immutable ledger, and the Help Desk can directly amend
or soft-delete a posted financial record). The full backend audit below is now done;
building proceeds slice by slice, same discipline as `mobile-production-plan.md`.
`navigation/FinanceDrawerNavigator` currently renders a single "coming soon" shell for all
four roles so a finance login lands somewhere coherent; role dispatch in
`RootNavigator` already routes every finance role there.

## The permission model

Two layers, not one role check:

1. **`requireFinance(permission)`** — `FinancePermission = 'view' | 'create' | 'approve' |
   'adjust' | 'configure'`, via `financeCan(role, permission, allowSuperAdminWrite)`:

   | Role | Permissions |
   |---|---|
   | `finance_admin` | view, create, approve, adjust, configure (everything) |
   | `finance_manager` | view, create, approve |
   | `accountant` | view, create |
   | `finance_auditor` | view only |
   | `super_admin` | view always; every other permission ONLY if Finance Settings' `allowSuperAdminWrite` is on (off by default) |
   | anything else (branch_manager, production_user, …) | nothing, including view |

2. **Three narrower guards that do NOT follow the table above**, each a deliberate
   divergence — build the mobile UI's per-action visibility off these, not off
   `FinancePermission`:
   - **`requireIncomeVerifier()`** (income approval's verify step only): a fixed allow-list
     `['super_admin', 'finance_admin', 'finance_manager']` — notably excludes `accountant`
     (who otherwise has `create`) and ignores `allowSuperAdminWrite` entirely (verification
     posts no money, so it's deliberately not locked behind the write toggle).
   - **`requireFinanceHelpDeskAdmin()`** (administer a Finance Help Desk query — edit,
     amend, respond, assign, change status, restore, recreate, correct/delete the
     underlying record): passes for **`super_admin` only** — not even `finance_admin`. This
     is a deliberate reversal from an earlier migration; the Help Desk is the one sanctioned,
     fully-audited channel for `super_admin` to touch finance records, so it is NOT gated by
     `allowSuperAdminWrite`.
   - **`requireFinanceHelpDeskParticipant()`** (post a message, request a reopen): passes for
     `super_admin`, `finance_admin`, `finance_manager`, `accountant` — excludes
     `finance_auditor` (read-only) and is, again, not gated by `allowSuperAdminWrite`.

**The mobile UI must check the actual permission/guard for the action on screen, never
infer it from the role name** — e.g. a "Verify" button checks the verifier allow-list, not
`create`/`approve`; a Help Desk "Edit"/"Respond"/"Delete Record" action is `super_admin`-only
regardless of how senior a Finance role appears.

## Screen → endpoint map (every endpoint read in full; nothing invented)

| # | Screen | Endpoint(s) | Guard | Notes |
|---|---|---|---|---|
| 01 | Finance Dashboard | `GET /finance/dashboard`, `/pending-approvals`, `/dashboard/monthly`, `/dashboard/records` | view | `finance.routes.ts`. Monthly dashboard composites production figures (demand/share/received/return/discount) against ledger income/expense per branch per month — two different data families shown side by side, never summed into one number (the dashboard's own note: "Production figures are not combined into a single net figure"). |
| 02 | Daily Ledger | `GET /finance/ledger`, `/ledger/summary`, `/ledger/:id` | view | **Strictly read-only from the UI's point of view** — a correction is `POST /ledger/:id/adjust` (`adjust`, reverses and optionally re-posts), `PATCH /ledger/:id` (`adjust`, edits the same voucher in place) or `DELETE /ledger/:id` (`adjust`). All three need `adjust` (finance_admin only, or super_admin+toggle). |
| 03 | Cash Transfers | `GET /finance/cash-transfers`, `GET /:id`, `PUT /:id/approve`, `PUT /:id/reject` | view / approve | Finance's review side of the Branch app's Cash Deposit. Approval posts an RV- receipt under `INC-BRANCH-CASH` (+ a second one under `INC-FUEL` if fuel charges were entered). |
| 04–05 | Income & Expense / New Entry | `finance-income.routes.ts`'s `entriesRouter` — `GET/POST /income/entries`, `PUT/:id`, `/:id/submit`, `/:id/approve`, `/:id/reject` | view/create/approve | One form for both income and expense — **type is never client-sent**, it's derived server-side from the chosen ledger head. Duplicate-income detection on create (409 `duplicate_income`, resubmit with `confirmDuplicate:true`). |
| — | *(Branch Income approvals — a separate three-step queue, not its own numbered screen but belongs beside 04–05)* | `GET/POST /income`, `/import`, `/:id`, `/:id/verify`, `/:id/approve`, `/:id/reject` | view / **verifier allow-list** / approve | `pending_verification → pending_approval → approved/rejected` (verify step only exists while Finance Settings' `requireAdminVerification` is on). |
| 06–11 | Payroll / New Payslip / New Advance / Add Employee / Resignation / Salary Ledger | `finance-payroll.routes.ts` — employees, resignations, salary revisions, salaries, advances, salary ledger (`GET /ledger`, `/ledger/payments`) | view/create/approve/configure | **Ledger is read-only** (405 on any write). `baseSalary` is NEVER directly editable — only via `POST /employees/:id/salary-revisions`. Payslip creation lets the user pick specific outstanding advances to recover (`recoverAdvanceIds`, prefilled from `/employees/:id/advance-summary`) — not inferred. A resignation blocks creating/approving any payslip for a month after it. |
| 12–14 | Partner Transactions / New Partner Advance / Partner Detail | `finance-partners.routes.ts` (`/api/finance/partner-expenses`) — partners, partner expenses (advance/draw), share summary | view/create/approve/configure | Partner profile fields (`name`, `sharePct`) are fixed at seed time, not editable — only biodata fields are. "Partner Detail" = `GET /share-summary`, a computed view (ledger balance × sharePct − advances/draws paid), not a stored document. |
| 15 | Company Transaction Details | `finance-partners.routes.ts`'s `/ledger`, `/ledger/transactions` AND `finance-branch-share.routes.ts`'s `/balances`, `/` (list), create/update/submit/approve/reject | view/create/approve | Two distinct things share this one screen slot: the partner × month ledger grid (read-only), and Branch Share payments (a real document workflow — approval can post **two** ledger entries: the share payout and, separately, a bonus). `listBranchSharePayments`'s `total` is just `payments.length`, not a true count — pagination UI must account for that. |
| 16–17 | Ledger Heads / New Ledger Head | `GET/POST /finance/heads`, `PUT /:id` | view/configure | A head is never deleted, only deactivated (FK is `ON DELETE RESTRICT`) — no delete action exists or should be built. |
| 18 | Daily Closing | `GET /finance/closing`, `/closing/history`, `POST /closing` | view/**approve** (not configure — closing a day is a sign-off, same class of act as approving a voucher) | 409 if pending approvals exist for that date — the UI should surface *which* approvals are blocking, if feasible, rather than just the generic conflict message. |
| 19 | Finance Reports | `GET /finance-reports`, `/export?format=pdf\|excel\|csv` | view | **Ten reports, one shared shape** (`FinanceReport`: columns/rows/totals/summary) — the screen can be ONE generic report viewer driven by `type`, not ten bespoke ones. `type ∈ ['daily_cash_book','general_ledger','income_statement','expense_report','profit_loss','company_share','branch_share','salary','partner_expense','trial_balance']`. |
| 20 | Audit Trail | `GET /finance/audit` | view | Read-only log of every write across the whole module (ledger, heads, settings, closings) — not ticket-specific (that's its own `auditTrail` on a ticket, see below). |
| 21–22 | Finance Help Desk / Finance New Query | `finance-tickets.routes.ts` (`/api/finance/tickets`) | view / `requireFinanceHelpDeskParticipant` / **`requireFinanceHelpDeskAdmin` (super_admin only)** | A SEPARATE ticket system from the Branch/Production Help Desk (`support.routes.ts`) — different table, different reference types (`ledger_entry`, `income_approval`, `finance_transaction`, `salary_payment`, `employee_advance`, `partner_expense`, `branch_share_payment`, `order`, `cash_transfer`), optimistic-concurrency versioning on nearly every mutation. A Finance role (even `finance_admin`) can only report/view/discuss/request-reopen — never administer, amend a query, correct/delete the underlying record, or truly reopen one. Only `super_admin` can. |
| 23 | Finance Settings | `GET/PUT /finance/settings` | view/configure | This is where `allowSuperAdminWrite` itself lives — a `finance_admin` can flip the one toggle that changes what `super_admin` may do everywhere else in the module. |

## Shared vocabulary this build reuses everywhere

`FinanceAccount` (`cash`/`bank`), `FinancePaymentMethod` (7 values), `FinanceDocStatus`
(`draft→pending_approval→approved/rejected`, plus `posted`/`locked` for what's in the
ledger), `EDITABLE_DOC_STATUSES = ['draft','rejected']` (the one rule every document
list/detail screen enforces identically: an edit action only renders in these two
statuses), `LedgerEntry`/`LedgerSourceType` (what every approval ultimately posts),
`Attachment` (two-step upload: `POST /api/attachments` first for an id, then pass it in
`attachmentIds`; `url` is a ~1hr signed URL, never cached).

## What this build will NOT attempt to literally reproduce

The Dashboard mockup (screen 01) includes a 31-day dual-bar chart and a 6-month
multi-series SVG line chart (Demand/Company Share/Received/Balance). Per this repo's own
UI rule (CLAUDE.md §14/§26 — never reproduce the desktop screenshot literally, and never
display fake values), these render as the same touch-interactive bar style already built
for Branch's `SalesChart`/`SalesVsExpensesBar`, not a pixel clone, and only once real data
confirms the shapes above.

## Build order (unchanged reasoning from the original audit, now backed by full contracts)

1. **Navigation scaffold** — routes/types for all 23 screens, drawer + stacks, up front
   (same pattern as Branch/Production's own Slice 1). **Done.**
2. **Dashboard (01)** — needs only already-confirmed `view`-level endpoints. **Done**
   (today's composite from `GET /finance/dashboard`; the mockup's monthly multi-chart view
   is deliberately deferred — see below).
3. **Daily Ledger (02) / Reports (19) / Audit Trail (20) / Settings (23)** — same, all
   `view`/`configure`-only reads plus one simple settings form. **Done.** Ledger is
   view-only this slice (list + entry detail sheet) — the three `adjust`-gated correction
   actions (reverse/edit/delete) are `finance_admin`-only and deferred to their own pass.
   Reports renders all ten `FinanceReport` types from one generic viewer (chip picker +
   fixed date-range presets, no date-picker library in this app); PDF/Excel/CSV export is
   deferred — no file-download/share library exists yet. Settings is read-only unless the
   signed-in user's permission (`financeCan(role, 'configure', allowSuperAdminWrite)`)
   allows writes.
4. **Cash Transfers (03)** — view/approve, small and self-contained. **Done** — list
   (Pending/Approved/Rejected tabs) + detail (amount breakdown, proof-of-deposit photo,
   approve-with-note or reject-with-reason). Approve/reject actions are gated by the
   signed-in user's actual `approve` permission, not their role name.
5. **Ledger Heads (16–17) / Daily Closing (18)** — `configure`/`approve`, small. **Done.**
   Heads: grouped list (toggle active via a Switch, never a delete — heads are deactivated
   only), create/edit as one bottom sheet (code/type locked once created). Closing: today's
   figures + a Close Day action (gated on `approve`) + 30-day history.
6. **Income & Expense (04–05)** — `view/create/approve`, moderate (duplicate-detection UX).
   **Done** — this covers exactly what mockup screen 04 shows: the manual documents queue
   (`entriesRouter`) with All/Pending Approval/Posted/Draft/Rejected tabs, inline View/
   Approve/Reject, and a New Entry sheet (type → filters ledger-head chips, business date
   fixed to today, amount, description, account, payment method, notes, a required receipt
   photo, Save as Draft / Submit for Approval). **Not built, and NOT shown in this mockup
   frame**: the separate three-step Branch Income approval queue
   (`pending_verification → pending_approval → approved/rejected`, `GET/POST
   /finance/income`) and its duplicate-detection confirm-resubmit flow on manual-entry
   create (409 `duplicate_income`) — flagged for its own pass if/when the owner wants it
   surfaced on mobile (today it's web-only).
7. **Payroll (06–11)** — the largest single group: employees, resignations, salary
   revisions, payslips (with advance recovery picking), advances, salary ledger.
   **Done.** Payroll (06): 3 tabs (Salaries/Advances/Employees), quick approve/reject on
   pending items. New Payslip (07): employee picker, gross/bonus/deduction, computed net,
   optional outstanding-advance recovery checklist (not in the mockup frame, added because
   the backend's `recoverAdvanceIds` mechanism needs *some* UI to be usable — prefilled from
   `/employees/:id/advance-summary`), required receipt photo. New Advance (08): same shape,
   advance/bonus/loan → "Paid now" total. Add Employee (09): name/department/designation/
   base salary (creation-only, per `UpdateEmployeeSchema` excluding it)/phone. Employee
   Resignation (10): folded into an Employee Detail screen (profile card + resignation form
   when active, resignation-on-file + Cancel when not) rather than its own top-level route,
   since the backend's `GET /employees/:id` profile is the natural home for both. Salary
   Ledger (11): read-only summary stats + per-employee 12-month cell grid, search/status
   filters. `baseSalary` is never directly edited anywhere in the UI — only via the
   create-employee form (once) or a future Salary Revision screen (not built this pass;
   `createSalaryRevision`/`listSalaryRevisions` are wired in the API layer but have no screen
   yet — flagged as a small follow-up, not silently dropped).
8. **Partners (12–14) / Company Transaction Details (15)** — partner profile, partner
   advance/draw workflow, share summary, branch share payments (two-entry approval).
   **Done**, with one scope correction found while reading the mockup closely: screen 15
   "Company Transaction Details" is the **partner ledger** (`GET /partner-expenses/ledger`),
   not Branch Share Payments — "Approved partner transactions per month... raised and
   approved in Partner Transactions" is verbatim in the mockup, and no mockup frame shows
   Branch Share Payments at all. So **Branch Share Payments
   (`finance-branch-share.routes.ts`'s create/submit/approve/reject, the two-ledger-entry
   posting) was not built — it has no mockup screen to build against.** Screen 12 "Partner
   Transactions" turned out to be 4 tabs, not a single list: Advances, Draws, Share Summary
   (the `PartnerShareSummary` reconciliation), and Partners (the fixed-four partner master —
   name/sharePct are seed-time fixed, only biodata fields are editable, which is screen 14
   "Partner Detail" folded in as an edit sheet rather than its own route, same reasoning as
   Payroll's Employee Resignation). Screen 13 "New Partner Advance / Draw" is one form with
   a type toggle, used from either the Advances or Draws tab.
9. **Finance Help Desk (21–22)** — by far the most complex screen pair: reference-first
   query creation, drafts, messaging with auto status-flip, optimistic concurrency
   throughout, and (super_admin only) edit/amend/respond/assign/status/restore/recreate/
   correct-record/delete-record/reopen. Deliberately last — it reads and can MODIFY the
   records every other slice above will have already built. **Done, scoped to
   view/report/discuss/request-reopen** per the owner's explicit decision: mobile never
   calls the `super_admin`-only admin actions (edit a query, amend/correct/delete the
   underlying record, restore, recreate, assign, change status, truly reopen) — those stay
   web-only. List (21): 6-stat grid (Pending/In Review/High Priority/Waiting
   Finance/Resolved/My Drafts), Queue/My Drafts toggle, search. New Query (22):
   reference-first (Reference ID + Find, auto-fills subject/queryType/amount server-side
   when found) or Subject+QueryType when raised without one, Save Draft/Submit. Detail: the
   message thread (own bubble color per side), a draft's own Submit action, and — only on a
   terminal ticket (resolved/rejected/closed) — a Request Reopen form, which the UI is
   explicit sends a REQUEST (202, status unchanged) rather than actually reopening it, since
   this app never calls that endpoint as `super_admin`.

## All 23 screens are now built

This completes the Finance mobile app build started in this session. Every screen in
`mountainbakesFinance.html` has a corresponding, wired React Native screen, verified clean
(`tsc`/`eslint`/`jest`) after every slice. Two deliberate, documented scope decisions remain
open for the owner, not silently resolved:
- **Branch Share Payments** (`finance-branch-share.routes.ts`) has no mockup screen and was
  not built (see the note under Partners/Company Transaction Details above).
- **Finance Help Desk's `super_admin`-only admin surface** was deliberately excluded from
  mobile per the owner's decision in this session — confirm that decision still holds before
  considering the Help Desk "fully built" rather than "built to its agreed scope."

## Open items worth a decision before Slice 9 (Help Desk) is built

- Should the mobile Help Desk even expose the `super_admin`-only admin actions (edit,
  amend, correct-record, delete-record, restore, recreate, assign, status change), or
  should a `super_admin` on mobile be pointed at the web app for those? They are the most
  destructive actions in the entire Finance module (one of them soft-deletes a posted
  financial record), and a phone screen is a meaningfully worse surface for a
  multi-field correction form with optimistic-concurrency conflicts to resolve.
