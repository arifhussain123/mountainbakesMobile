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
| `API_URL` | Express origin, no trailing slash. `localhost` works on Android only with **`adb reverse tcp:3001 tcp:3001`** (device *and* emulator); `10.0.2.2` is the emulator-only alternative. |
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
├── assets/       logo (raster), illustrations + product placeholder (vector)
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

### Assets

```
src/assets/
├── logo/          the OFFICIAL mark, @1x/@2x/@3x — do not redraw
├── icons/         intentionally empty; icons are Lucide (see its README)
├── illustrations/ empty-orders · empty-sales · empty-stock · error · offline
└── images/        product-placeholder
```

**The logo is the real brand asset**, not a placeholder — the same artwork the
web client serves from `public/assets/images/logo/logo.png`. There is no TODO to
replace it. Choose a variant with `logoFor(scheme)`; `-light`/`-dark` name the
**background** they sit on, not the colour of the art, which reads backwards at a
glance and is why picking a file by hand is discouraged.

One trap if you go looking: the web client also has a `logo.svg` beside that PNG
which is a completely different orange-gradient mountain glyph. It is a stale
placeholder that has diverged from the brand — match the PNG.

**Illustrations and the product placeholder are vector components, not files.**
They read `useTheme()`, so one drawing works on `bg` in both schemes instead of
needing a light and a dark raster each (ten files to keep in sync by hand). They
are decorative and hidden from screen readers — the heading and message beside
them already carry the meaning. Add one only through
`src/assets/illustrations/index.tsx`, whose shared frame, stroke weight and token
list are the style guide.

**Motion is feedback, never decoration** — durations and curves come from
`theme/motion.ts`, every tappable surface is `MBPressable` (0.98 scale plus a
small opacity shift, 120ms), tab switches are instant, and Reduce Motion is
honoured by suppressing the movement while keeping the change. Nothing bounces,
no header collapses on scroll, and the two loops in the app run only while the
work they report is in flight. [`docs/motion.md`](docs/motion.md) is the full
account.

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
| 5 — Offline engine | **Done** — queue, drain, backoff, dependency ordering, idempotency keys (server-honoured as of migration 84), failure classification, Sync Center, reference-data mirroring with read-through fallback, conflict detection + storage + resolution (safe resolutions gated on whether the operation may already have landed). Editing a payload to clear a stock conflict still needs the original entry form |
| 6 — Branch | **Done** — Dashboard, Sales (POS), New Order, Stock, Expenses. All three writes are offline-first |
| 7 — Production | **Mostly** — Dashboard, Orders (review), Stock, print preview, **Returns (accept/reject queue)**. Production Sales and preparation remain |
| 8 — Admin / Finance | **Partial** — Admin Dashboard, Orders, Products, Reports (range + branch filters, four breakdowns, scoped export) plus three statements pushed from it — Daily Sales, Top Products, Sales vs Expenses; Finance Dashboard and Ledger. Finance Income/Expenses remain |
| 9 — Performance | **Done** — lists virtualised (FlashList) with memoised rows and stable row callbacks; one app-wide Reduce Motion subscription instead of one per tappable surface; `lazy` + `freezeOnBlur` on tabs and stacks; every query key through `qk` (the branch dashboard and Reports no longer fetch one answer twice); previous data kept while a filter switches; the reference mirror replaced in one `executeBatch` instead of one call per row; the unsynced badge one statement instead of two; a drain clears the whole backlog and prunes settled rows. **No on-device profiling** — see [`docs/performance.md`](docs/performance.md) for what was measured versus reasoned about |
| 9b — Responsive | **Done** — one 600dp breakpoint (`useBreakpoint`), content-width caps on every screen, responsive dashboard stat grid. List+detail two-column not built |
| 9c — Charts | **Partial** — `MBTrendChart` (SVG bars) on the daily revenue card. `victory-native` + `@shopify/react-native-skia` were **removed**: `librnskia.so` was ~52 MB across four ABIs (~34% of the release APK) for a library nothing imported. The daily card is charted and Reports now draws every rollup — branch, product, payment, category — as `MBShareList` bars behind a dimension selector |
| 11 — v4 design | **Done** — theme retuned to the current `Mountain Bakes Mobile v4.dc.html` (ember `#EC6631` fill, deep `#3E1B00` mark, card lift restored), the floating nav bar's centre action button, and nine screens added: Stock ledger (day + history), Daily Sales, Top Products, Sales vs Expenses, Events, Help & Support with the query composer, and the production Returns queue. Four v4 screens are deliberately absent because nothing in the API backs them — see [`docs/screen-patterns.md`](docs/screen-patterns.md) → "Not built" |
| 10 — QA | **Partial** — typecheck, lint, 732 tests, debug + release build, secret scan, console-strip verified. The suite is silent: the standing `act(...)`, overlapping-`act`, "Query data cannot be undefined" and worker-exit warnings were each traced to a cause and fixed rather than muted (see [`docs/testing.md`](docs/testing.md)). **Live-API reachability verified** — all 19 GET endpoints the app calls answer `401` (route exists, guarded) against both the local dev server and the production Heroku dyno; zero `404`s, so no screen is wired to a route that does not exist. Still **no on-device run and no authenticated end-to-end pass** |

Verified: `tsc --noEmit` clean · eslint clean (0 problems) · **810 tests passing, no warnings** · production JS bundle builds (3.8 MB, 0 surviving `console.log`) · Android **debug APK builds clean** (`BUILD SUCCESSFUL`, 4 ABIs, `libop-sqlite.so` linked) · Android release APK builds clean at **102 MB** · release bundle scanned for secrets · no service-role key, no direct Supabase table access from the app.

**Release signing.** The template signed `release` with the committed **debug**
key. It now uses a real upload key when `MB_RELEASE_STORE_FILE` and its three
companions are set in `$GRADLE_USER_HOME/gradle.properties` (`~/.gradle/` unless
relocated), and warns loudly on every
build when they are not — so a debug-signed artefact cannot reach a store
unnoticed. Verified both ways with `:app:signingReport`. See
[`docs/troubleshooting.md`](docs/troubleshooting.md).

**"A worker process has failed to exit gracefully" is fixed, and it was a real
leaked timer.** An earlier note here called it a worker-pool artifact because
`--detectOpenHandles` reported nothing; that was wrong. `renderScreen` set
`gcTime: 0` on queries but not on mutations, and query-core defaults an unset
mutation `gcTime` to **five minutes** — a settled mutation calls
`scheduleGc()`, i.e. `setTimeout(remove, 300000)`. So the two
`ProductionOrdersScreen` cases that actually approve a demand each left a
five-minute timer in the worker. One option in `src/test-utils/render.tsx` fixes
it; `src/test-utils/__tests__/render.test.tsx` pins it and fails without it,
printing the `"gcTime": 300000` that proves the diagnosis.

The release APK is 102 MB, not the 152 MB an older build produced — that one
still carried `librnskia.so` in stale `android/app/build/` intermediates. Run
`npm run clean:android` after the dependency set changes, or when
`processReleaseManifest` fails on a merged manifest that "doesn't exist"; see
[`docs/troubleshooting.md`](docs/troubleshooting.md).

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
opens the **web** app's `/reset-password`. The app does register
`mountainbakes://` (see `docs/navigation.md`), but there is no reset screen behind
it — `AuthNavigator` has SignIn, FinanceSignIn and ForgotPassword only, and
`linking.ts` maps no reset path. Set `WEB_URL` accordingly.

### Which screens are built

`src/navigation/__tests__/navigationSurface.test.ts` records exactly what each of
the eight roles can reach — its tabs, in order, and its More list. It is also
where the single-path rule is enforced: no destination appears in two surfaces,
no More row is listed twice, and nothing in the account panel is also a tab or a
More row. A tab with no screen yet renders a placeholder naming the phase it
lands in, so an unbuilt screen is never mistaken for an empty one.
`docs/navigation.md` is the full account of the structure and why it is shaped
this way.

**Sign-out** clears cached server state and never deletes local data. When unsynced transactions exist it says
how many and asks for confirmation — they stay on the device and resume on the
next sign-in *on that phone*, which matters on a shared branch handset.

**Not verified:** iOS (developed on Linux — the iOS project exists from the template but has never been built and CocoaPods has never run), and live API calls against a running server.

### What the app currently does

Launches → validates config → opens SQLite and encrypted storage together →
loads settings → checks connectivity → restores any Supabase session → resolves
the access profile → starts the sync engine → warms the catalogue caches → shows
either the sign-in screen or the role's tab navigator. The sequence is declared
and tested in `src/services/boot/bootSequence.ts`; the two native opens overlap
because neither needs the other, and the last two steps are started rather than
awaited, so neither can hold the splash or fail the start.

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

Picking a product carries all six of search, product code, name, category,
price and **availability**. The search box matches name *or* code, on the server
and in the offline mirror alike. Availability is advisory — the server is the
only authority on stock and refuses an overdraw with a 409 — so an out-of-stock
product is still tappable, and a balance the device has never been told is drawn
as **nothing at all** rather than as zero. A tap adds one line; there is no
quantity prompt between the product and the cart. There is no barcode scanning
and no field to scan: see [`docs/screen-patterns.md`](docs/screen-patterns.md).

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
