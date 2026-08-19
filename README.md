# Mountain Bakes — Mobile

React Native (bare CLI) client for the Mountain Bakes bakery ERP. It is a **third client of the existing backend**, alongside the web app — not a standalone system.

```
mountainbakes/
├── mountainbakes-server/     Express REST API · :3001   ← authoritative business logic
├── mountainbakes-frontend/   Next.js static-export PWA · :3000
└── mountainbakes-mobile/     this project
```

## Architecture in one paragraph

The app signs in **directly against Supabase Auth** and sends the resulting JWT to the Express API as `Authorization: Bearer`. The API holds the service-role key and owns every privileged read and write; it authorises each request itself against the JWT's `app_metadata` claims. The app never queries a business table directly. Local SQLite plus a sync queue provide offline capability; the server stays authoritative for money and stock.

Read [`docs/mobile-architecture-audit.md`](docs/mobile-architecture-audit.md) before writing feature code — it records the real endpoint surface, the role model, the 2 AM business-day rule, and the idempotency gap that governs what can safely be done offline.

## Requirements

| | |
|---|---|
| Node | 22+ (developed on 24) |
| JDK | 17 |
| Android SDK | `ANDROID_HOME` set; platform-tools on `PATH` |
| Xcode | 15+ (macOS only — iOS is unverified on this machine, see Status) |
| Package manager | **npm** (see below) |

> The siblings use pnpm. This project deliberately uses **npm**: React Native autolinking is most reliable against npm's flat `node_modules`, and pnpm's symlinked layout needs `node-linker=hoisted` to work with native modules at all.

## Setup

```bash
npm install
cp .env.example .env.development     # then fill it in
```

`.env.development` and `.env.production` are **not committed**. `react-native-config` bakes them into the binary at **build** time — changing a value on a running app does nothing; rebuild.

| Variable | Notes |
|---|---|
| `ENVIRONMENT` | `development` / `staging` / `production` |
| `API_URL` | Express origin, no trailing slash. **Android emulator reaches your host at `10.0.2.2`, not `localhost`.** |
| `SUPABASE_URL` | Same project the web app uses |
| `SUPABASE_ANON_KEY` | Public key. Safe to ship. |
| `WEB_URL` | Web app origin. Password-recovery emails link to `<WEB_URL>/reset-password`. |
| `SENTRY_DSN` | Optional; crash reporting stays off when blank |

**Never** put `SUPABASE_SERVICE_ROLE_KEY` or any secret here — everything in this file is readable from the APK.

## Running

The API must be running alongside it; nothing starts both.

```bash
cd ../mountainbakes-server && pnpm dev    # :3001, start first
```

```bash
npm start                # Metro
npm run android          # build + install debug
npm run ios              # macOS only
```

## Verifying

```bash
npm run verify           # typecheck + shared-mirror check + tests
npm run typecheck
npm test
npm run lint
npm run shared:check     # src/shared must match the server's copy
npm run build:android    # release APK
```

### `src/shared/` is a mirror — check it

`src/shared/` (Zod schemas, TS types, business-date utils) is a **byte-for-byte copy** of `mountainbakes-server/src/shared/`, which the web app also mirrors. **Nothing mechanically enforces this** — not even a failing build. A schema edited in one tree and not the others makes client and API validation drift apart silently, and a stale `timezone.ts` would bill sales to the wrong business day.

```bash
npm run shared:check     # run after any shared/ change or sibling pull
```

Re-sync with:

```bash
rm -rf src/shared && cp -r ../mountainbakes-server/src/shared src/shared
```

## Project layout

```
src/
├── components/   MB* component set (common, cards, feedback)
├── config/       env.ts — build-time config, fails loud when misconfigured
├── database/     SQLite: versioned migrations + runner
├── navigation/   root/auth/app navigators; role → tab mapping
├── screens/      auth screens; placeholders for the rest
├── services/
│   ├── api/      axios client, error normalisation, Idempotency-Key plumbing
│   ├── supabase/ auth ONLY — no business queries
│   ├── storage/  Keychain-held key + encrypted MMKV
│   └── query/    TanStack Query client and cache policy
├── shared/       MIRROR of the server's shared/ — do not edit in isolation
├── store/        Zustand: auth, settings, network (device state, not server state)
├── theme/        design tokens; light/dark behind one interface
├── types/        ambient declarations
└── utils/        money, business date, operation ids
```

### Testing notes

`@testing-library/react-native` v14 made **`render`, `renderHook` and `fireEvent` async** — all must be awaited. A missing `await` does not fail loudly; queries just return nothing and `result.current` is undefined.

Jest hoists `jest.mock()` above every `const` in the file, so a factory that closes over an outer variable captures it while still undefined. Build the mock **inside** the factory and read it back through the import (see `src/store/__tests__/authStore.test.ts`).

Reanimated 4 needs `resolver: 'react-native-worklets/jest/resolver.js'` in `jest.config.js` (already set) — its `.native` entrypoints call into a native module that throws under Jest.

## Things that will bite you

- **The business day rolls at 2:00 AM Karachi, not midnight.** A sale rung up at 01:30 belongs to the *previous* business date. Always use `businessDateStr()` from `@/shared/utils/timezone`; never `new Date()`.
- **Numeric fields arrive as strings.** PostgREST serialises `numeric` as JSON strings, so `grandTotal` can be `"1250.00"`. Run every monetary field through `toNumber()` or you will concatenate instead of adding.
- **There is no `{success, data}` envelope.** Bodies are resource-keyed (`{orders, total}`, `{user}`). Type each endpoint individually.
- **No endpoint paginates.** Constrain lists by date range and branch, or you transfer the whole table.
- **Role and branch come from the JWT**, never from a form or an API response. An unrecognised role gets *no* session — fail closed.
- **`branch_user` carries its manager's `branchId`.** Treat it as `branch_manager` for branch-scoped data or the shift user sees an empty shop.
- **Never say "Sale successful" for a locally-saved transaction.** Say "Saved offline — will sync automatically."

## Status

| Phase | State |
|---|---|
| 1 — Audit | **Done** — `docs/mobile-architecture-audit.md` |
| 2 — Foundation | **Done** — stack, theme, config, storage, API + auth clients, local DB + migrations, network detection, component set, navigation shell |
| 3 — Auth | **Done** — native splash, sign-in, Finance sign-in + TOTP, forgot password, forced change-password, protected sign-out |
| 4 — Read-only slice | **Done** — Products + Stock on real endpoints, six screen states, server-side debounced search, FlashList |
| 5 — Offline engine | **Done** — queue, drain, backoff, dependency ordering, idempotency keys (server-honoured as of migration 84), failure classification, Sync Center. Conflict *resolution* UI and reference-data mirroring remain |
| 6 — Branch | **Done** — Dashboard, Sales (POS), New Order, Stock, Expenses. All three writes are offline-first |
| 7 — Production | **Mostly** — Dashboard, Orders (review), Stock, print preview. Production Sales, preparation and returns remain |
| 8 — Admin / Finance | **Partial** — Admin Dashboard, Orders, Products, Reports (+export); Finance Dashboard and Ledger. Finance Income/Expenses remain |
| 9 — Performance | **Partial** — every unbounded list virtualised (FlashList), per-resource cache policy, debounced server-side search, memoised totals. No on-device profiling |
| 10 — QA | **Partial** — typecheck, lint, 231 tests, debug + release builds, secret scan, console-strip verified. No device or live-API testing |

Verified: `tsc --noEmit` clean · eslint clean (0 problems) · **231 tests passing** · Metro bundle builds · Android debug **and release** APKs build · release bundle scanned for secrets · `console.log` stripping proven by a probe build.

### Authentication

Two sign-in routes, because Finance is a separate product surface:

| | Main | Finance |
|---|---|---|
| Identifier | Email | Finance User ID (or email) |
| Resolution | — | `POST /api/auth/finance-lookup` → email |
| Second factor | — | TOTP when the account requires `aal2` |
| Admitted roles | All eight | The four finance roles |

Both then call `supabase.auth.signInWithPassword`. Role and branch come from the
session's `app_metadata` — never from the form. An account with no recognised
role is signed back out rather than given a default.

**Forced password change.** A session carrying `mustChangePassword` renders the
change-password screen and nothing else, above the navigators and outside
`NavigationContainer`, so no tab or back gesture reaches a business screen around
it. After `POST /api/auth/change-password` the app **must** call
`supabase.auth.refreshSession()` — the server clears the flag in `app_metadata`,
but routing runs off the claim in the JWT already held, so without the refresh
the gate loops forever.

**Password recovery** is Administrator-only, enforced server-side. The reset link
opens the **web** app's `/reset-password`, since no deep-link scheme is
registered here; set `WEB_URL` accordingly.

### Which screens are built

`src/navigation/__tests__/screenCoverage.test.ts` records exactly which tabs each
role can reach and which are still placeholders. It fails if a built screen is
wired to a tab the role does not have, and its `gaps` assertion is the honest,
machine-checked list of what remains.

**Sign-out** never deletes local data. When unsynced transactions exist it says
how many and asks for confirmation — they stay on the device and resume on the
next sign-in *on that phone*, which matters on a shared branch handset.

**Not verified:** iOS (developed on Linux — the iOS project exists from the template but has never been built and CocoaPods has never run), and live API calls against a running server.

### What the app currently does

Launches → validates config → opens encrypted storage → runs SQLite migrations →
restores any Supabase session → subscribes to connectivity → shows either the
sign-in screen or the role's tab navigator.

Working end to end: sign-in (main and Finance, with TOTP), forced password
change, and the **whole branch role** — dashboard, POS sales, production orders,
stock and expenses — plus the Sync Center. Sales, orders and expenses are all
offline-first. Production, Admin and Finance tabs render a placeholder naming the
phase they land in, deliberately, so an unbuilt screen is never mistaken for an
empty one.

### Selling

The POS request carries only `{productId, qty, discount}` per line — **no price,
no total**. The server resolves the current price, recomputes everything and
returns its own snapshot, which is what a receipt must be printed from. A price
change between opening the form and saving therefore cannot print a stale rate.
`src/utils/saleTotals.ts` is a *preview* for the cashier and reproduces the web
client's arithmetic exactly; tax applies to the net subtotal, after discount.

**Offline** is documented in [`docs/offline-sync.md`](docs/offline-sync.md).

## Backend changes this app needed

Offline writes required two additive, backward-compatible server changes. **Both
landed on 2026-08-18** — see §7 of the audit for the full record:

1. `Idempotency-Key` is honoured on the five offline-capable writes (order
   create, POS sale, production demand, expense, branch return). A repeat of a
   request that succeeded returns the original response instead of acting again.
2. Those endpoints accept the `businessDate` the device captured, bounded (no
   future dates, ≤7 business days back) and refused on a closed day.

Server side: migration `20260818000084_idempotency_keys.sql`,
`src/middleware/idempotency.ts`, `src/utils/clientBusinessDate.ts`.

**Migration 84 is applied** (2026-08-18) and verified against the linked database
with `pnpm verify:idempotency` in the server tree — 14 checks, all passing. The
server code is **not deployed yet**:

```bash
cd ../mountainbakes-server
git push heroku HEAD:main
```

Until that lands the app behaves exactly as it did — the header and the date are
sent and ignored — and nothing already queued is left unprotected when they start
being honoured.
