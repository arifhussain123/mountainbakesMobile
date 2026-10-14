# Mobile Finance app — architecture audit (screens not yet built)

Source: `design UIandUX/mountainbakesFinance.html` (23 screens). Scope: the four finance
roles (`finance_admin`, `finance_manager`, `accountant`, `finance_auditor`), gated by a
real permission model — this is a materially bigger, higher-stakes domain than Branch or
Production (money is posted to an immutable ledger), so this pass is deliberately
audit-only: confirm the backend contract exists and is readable, do not build screens
yet. `navigation/FinanceDrawerNavigator` currently renders a single "coming soon" shell
for all four roles so a finance login lands somewhere coherent.

## The permission model (read from `backend/src/shared/types/finance.types.ts`)

This is NOT a simple role check — it's `requireFinance(permission)`, checked per
endpoint, against `FinancePermission = 'view' | 'create' | 'approve' | 'adjust' |
'configure'`:

| Role | Permissions |
|---|---|
| `finance_admin` | view, create, approve, adjust, configure (everything) |
| `finance_manager` | view, create, approve |
| `accountant` | view, create |
| `finance_auditor` | view only |
| `super_admin` | view always; write permissions only if Finance Settings' `allowSuperAdminWrite` is on (off by default) |

**This means the mobile UI must hide/disable actions per permission, not per role** — a
button wired to "approve" must check the signed-in user's actual permission, not assume
`finance_manager` always can (an `allowSuperAdminWrite`-style settings change could, in
principle, alter grants without a role change, though today the matrix above is static
per role). Every screen below needs this checked before any write action is wired.

## Screen → endpoint map (confirmed to exist; none invented)

| # | Screen | Endpoint(s) | Permission | Notes |
|---|---|---|---|---|
| 01 | Finance Dashboard | `GET /finance/dashboard`, `/finance/pending-approvals`, `/finance/dashboard/monthly`, `/finance/dashboard/records` | view | All in `finance.routes.ts`. |
| 02 | Daily Ledger | `GET /finance/ledger`, `/finance/ledger/summary`, `/finance/ledger/:id` | view | Immutable rows — no update type exists by design; a correction is a reversing/adjustment entry (`adjust` permission, separate endpoints at lines 269/314/349 of `finance.routes.ts`, not yet read in detail). |
| 03 | Cash Transfers | `GET /finance/cash-transfers`, approve/reject endpoints | view / approve | This is Finance's **review** side of the Branch app's Cash Deposit (Slice 5) — `finance-cash-transfers.routes.ts`, confirmed `requireFinance('view'/'approve')`, not yet read past the `router.use`/`GET /` lines. |
| 04–05 | Income & Expense / New Entry | `finance-income.routes.ts` — `GET /`, `POST /` (`create`), approval endpoint (`requireIncomeVerifier`, a separate guard from plain `approve` — not yet read) | view/create/approve | `requireIncomeVerifier` needs its own read before building 05's submit flow. |
| 06–11 | Payroll / New Payslip / New Advance / Add Employee / Resignation / Salary Ledger | `finance-payroll.routes.ts` — `GET /ledger`, `/ledger/payments`, and (unread) employee/payslip/advance/resignation endpoints | view/create/approve/configure (employee records likely `configure`) | Only the ledger-read endpoints have been confirmed so far; the six screens here need a full read of this file before any one of them is built. |
| 12–14 | Partner Transactions / New Partner Advance / Partner Detail | `finance-partners.routes.ts` — `GET /partners` (`view`), a `configure`-gated write seen at line 63 (not yet identified which action) | view/create/configure | Not yet read past the top of the file. |
| 15 | Company Transaction Details | `finance-branch-share.routes.ts` — `GET /balances`, `GET /` | view | Branch share split, not yet read past the `GET` routes. |
| 16–17 | Ledger Heads / New Ledger Head | `GET /finance/heads` (view), `POST /finance/heads` (configure), `PUT .../:id` (configure) | view/configure | In `finance.routes.ts`. `finance_admin` only, per the permission table above. |
| 18 | Daily Closing | `GET /finance/closing`, `/finance/closing/history`, `POST /finance/closing` (`approve`) | view/approve | In `finance.routes.ts`. This is Finance's own closing, distinct from the Branch app's Daily Sale Record (Slice 8) and from the unbuilt Branch Closing (20) screen — do not conflate the three. |
| 19 | Finance Reports | `finance-reports.routes.ts` — `GET /`, `GET /export` | view | Confirmed to exist and be `requireFinance('view')`-gated — unlike the Branch/Production roles, Finance DOES have its own reports endpoint. |
| 20 | Audit Trail | `GET /finance/audit` | view | In `finance.routes.ts`. |
| 21–22 | Finance Help Desk / Finance New Query | `finance-tickets.routes.ts` — `requireFinance`, `requireFinanceHelpDeskAdmin`, `requireFinanceHelpDeskParticipant` (three distinct guards, not yet read in detail) | varies | This is a SEPARATE ticket system from the Branch/Production `support.routes.ts` Help Desk already built (Slice 10) — confirmed by the distinct `finance_ticket`/`finance_ticket_message` attachment entities seen in `attachment.types.ts` during Slice 3/5. Do not reuse `supportService` here. |
| 23 | Finance Settings | `GET /finance/settings` (view), `PUT /finance/settings` (configure) | view/configure | In `finance.routes.ts` — this is where `allowSuperAdminWrite` itself lives; `finance_admin` only for writes. |

## What this audit has NOT done (be explicit, don't claim more than this)

- Has not read `finance-payroll.routes.ts`, `finance-partners.routes.ts`,
  `finance-branch-share.routes.ts`, `finance-income.routes.ts`, or
  `finance-tickets.routes.ts` past their first few lines — only confirmed they exist,
  are mounted, and gate on `requireFinance`. Each needs its own full read (schemas,
  response shapes, the exact fields a form must send) before any screen in that group
  is built, the same discipline every Branch/Production slice followed.
- Has not read any request schema (`CreateXSchema`) for this domain — unlike every
  Branch/Production endpoint reused so far, none of these payload shapes are confirmed
  yet.
- Has not designed the mobile navigation shell beyond the placeholder
  `FinanceDrawerNavigator` — no routes, types, or screen scaffolding exist yet for any
  of the 23 screens. The Branch/Production pattern (scaffold all routes up front, then
  build slice by slice) should be followed once the full endpoint map above is complete.

## Recommended next step

Treat this as its own multi-slice build, structured exactly like `mobile-production-plan.md`
and the original Branch plan: finish reading the five unread route files, write the full
endpoint table (no gaps), present the permission-matrix implication to the owner if
anything about `allowSuperAdminWrite` or the Help Desk's admin-only actions needs a
product decision, then scaffold navigation and build slice by slice — Dashboard first
(it only needs endpoints already confirmed above), Daily Ledger / Reports / Audit Trail
next (same), Payroll / Partners / Income last (need the unread files first).
