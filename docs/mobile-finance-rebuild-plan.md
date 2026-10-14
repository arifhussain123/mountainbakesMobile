# Mobile Finance module — "financeApp.md" 8-phase plan

Separate plan from `mobile-finance-plan.md` (the earlier endpoint-audit doc — read that
first for which backend routes are confirmed/unread). This doc tracks the newer, fully
detailed 23-screen rebuild spec ("financeApp.md", pasted in full by the user), scoped
against `finance-screens.html` (not present in the repo — closest match is
`design UIandUX/mountainbakesFinance.html`; flag to the user if a different file was
meant). Finance has **zero existing screens** (`FinanceDrawerNavigator` is a static
"coming soon" placeholder) — this is greenfield, unlike the Branch/Production rebuilds.

Cross-reference: `docs/mobile-production-rebuild-plan.md` Step 4 already built the SQLite
offline write-queue + cache as **shared, app-wide infrastructure**
(`src/shared/offline/`), specifically because this spec's own rule ("if the repo already
has a different choice for any of these, keep the repo's choice") says not to fork it.
Finance's data layer (Phase 1.4) should wire its own feature modules to
`enqueueOfflineWrite`/`flushOfflineQueue`/`getCachedResponse` from `@/shared/offline` and
`@/api`, not stand up a second queue.

Architecture decisions carried over from the Production rebuild conversation (not
re-litigated per module):
- SQLite library: `@op-engineering/op-sqlite` (already installed).
- Theme: **confirmed — same as Production, a separate `src/finance/theme/`** (not an
  extension of `src/theme/` or `src/shared/theme/`). The app now has three parallel
  design-token systems, a known tradeoff carried from the Production decision, not an
  oversight.
- Forms: Finance's spec also asks for React Hook Form + Zod "for every form" — the same
  conflict Production's spec had, resolved there as "keep the existing `useXForm` hook
  pattern." Carrying that same resolution forward unless told otherwise.

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Design system, app shell, data layer | **In progress — 1.1 Tokens done**, 1.2 Shared components / 1.3 Navigation / 1.4 Data layer not started (offline queue dependency already satisfied — see above) |
| 2 | Core money flow (Dashboard, Daily Ledger, Cash Transfers — screens 01–03) | Not started |
| 3 | Manual entries (04–05) | Not started |
| 4 | Payroll (06–11) | Not started |
| 5 | Partners (12–15) | Not started |
| 6 | Setup and control (16–18) | Not started |
| 7 | Reports, audit, support, settings (19–23) | Not started |
| 8 | Hardening and final verification | Not started |

## Phase 1.1 detail (done) — tokens

New `src/finance/theme/` (separate from both `src/shared/theme/` and `src/theme/`):

- `colors.ts` — every token from the spec's table as a literal, plus the same `tint(hex,
  alpha)` helper `src/theme/colors.ts` has (duplicated, not imported — the three theme
  modules are deliberately independent). Finance's accent (`#FF6B35`) is fixed, unlike
  Production's — the spec never makes it a user setting here, so there is no
  `useAccentStore` equivalent.
- `typography.ts` — only `screenTitle` (24–26px range, 26 picked) and `subtitle` (11px)
  are actually specified anywhere in financeApp.md's Section 1.1; everything else (card
  titles, body, labels, KPI values) is left for Phase 1.2 to add once a real component
  needs a size, rather than inventing numbers with no spec backing. Same font gap as
  Production's rebuild: no Space Grotesk `.ttf` files exist in this repo.
- `radii.ts` — literal per spec, ranges kept as `{sm, lg}` pairs rather than one guessed
  value (same convention `src/theme/radii.ts` uses).
- No `spacing.ts` of its own — financeApp.md's token table gives no spacing scale at all
  (unlike its colors/typography/radii, each spelled out explicitly), so `index.ts`
  re-exports the app's existing 8pt-ish scale from `@/shared/theme/spacing` rather than
  inventing a fourth one with nothing in this spec to justify it.
- `index.ts` — `useFinanceTheme()`, the single accessor, mirroring `useProductionTheme()`.
- `ThemeShowcase.tsx` — dev-only, renders every color swatch and the status-tint samples.
  Not the full Phase-1 gallery the spec asks for (that needs 1.2's shared components
  first) and not wired into any navigator yet.

Verified: `npx tsc --noEmit` (clean), `npx eslint src App.tsx __tests__` (0 errors, 573
warnings — up from 560, same pre-existing categories), `npx jest` (10/10 passed,
unaffected by this change).

Not run: visual confirmation on a device — no device/emulator in this environment, same
gap as every UI change in this build.
