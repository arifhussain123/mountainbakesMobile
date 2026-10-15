# Bug / gap findings — whole-app audit

Code-level audit only (see `docs/mobile-responsiveness-audit.md` for why no on-device pass
was run). Each entry: Problem, Root cause, Affected files, Fix applied (or proposed),
Verification.

## 1. New Finance mutations have no idempotency key (P1 — fixed and verified)

- **Problem**: every Finance write endpoint built this session (Cash Transfer
  approve/reject, Income & Expense create/approve/reject/submit, Ledger Head
  create/update, Daily Closing close-day) calls `apiClient.post`/`put` without an
  `Idempotency-Key` header. A double-tap, a retried request after a timeout, or the
  existing offline-queue retry worker (if it were ever pointed at these) could, in
  principle, post the same voucher twice.
- **Root cause**: `generateIdempotencyKey()` + a `useRef`-held key (one per form
  session, confirmed pattern in `useCashDepositForm.ts`, `useNewSaleForm.ts`,
  `useReturnItemsForm.ts`, `useNewExpenseForm.ts`, `useCreateOrderForm.ts`) was the
  established convention for every money/stock-moving Branch mutation before this
  session, but the new Finance hooks (`src/api/hooks/useFinanceApi.ts`) were written
  calling `financeService.*` directly without threading one through.
- **Affected files**: `src/api/hooks/useFinanceApi.ts`, `src/api/services/financeService.ts`,
  and every Finance screen that calls a create/approve/reject mutation
  (`FinanceCashTransferDetailScreen`, `FinanceIncomeExpenseListScreen` +
  `NewFinanceTransactionSheetContent` + `FinanceTransactionDetailSheet`,
  `FinanceLedgerHeadsScreen`, `FinanceClosingScreen`).
- **Fix applied**: added an optional `idempotencyKey` parameter to the six money/state-moving
  `financeService` functions (`closeFinanceDay`, `approveFinanceCashTransfer`,
  `rejectFinanceCashTransfer`, `createFinanceTransaction`, `approveFinanceTransaction`,
  `rejectFinanceTransaction`), threaded it through their `useFinanceApi` mutation hooks'
  variables objects, and generated real keys at each call site:
  - Single-record detail screens (`FinanceCashTransferDetailScreen`, `FinanceClosingScreen`,
    `NewFinanceTransactionSheetContent`'s form hook) use a mount-time `useRef`, same pattern
    as `useCashDepositForm`/`useNewSaleForm`/etc.
  - `FinanceTransactionDetailSheet` is reused (not remounted) across different entries as the
    list screen's `selected` state changes, so its keys are `useMemo`'d on `entry.id` instead.
  - `FinanceIncomeExpenseListScreen`'s quick-approve acts on a different entry each press from
    one hook instance, so it keeps a `Map<entryId, key>` rather than a single ref.
- **Verification**: `tsc --noEmit` (0 errors), `eslint src` (0 errors, same 737 pre-existing
  warnings as the repo-wide baseline before this fix — two new `react-hooks/exhaustive-deps`
  errors appeared from the first `useMemo` attempt and were corrected by folding `entry.id`
  into the generated key's prefix instead of only listing it as a dependency), `jest` (10/10).
  Not independently verified against a live server (no network calls made in this audit).

## 2. Everything else checked this session

No other concrete bugs were found at the code level. Specifically checked and found clean:
- `tsc --noEmit` across the whole repo: 0 errors.
- `eslint src` across the whole repo: 0 errors (737 pre-existing-style warnings, same
  categories throughout — inline styles, `no-void`, unstable nested components in 3
  tab-bar files — none newly introduced this session).
- `jest`: 10/10 passing, both existing suites.
- No hardcoded API base URLs other than the single Railway HTTPS URL.
- No secrets/keys in client code.
- No missing `FlatList` `keyExtractor`.
- No `Dimensions.get()` misuse.
- Safe-area handling is centralized, not duplicated per-screen.

See `docs/ui-design-audit.md` for the full per-screen design-fidelity findings (Branch,
Production, Finance) and `docs/railway-api-audit.md` for the backend-integration detail
behind finding #1 above.
