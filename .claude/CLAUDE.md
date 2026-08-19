# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The sibling `mountainbakes-server/` (Express + Supabase) and `mountainbakes-frontend/`
(Next.js static export) each have their own `.claude/CLAUDE.md`; the parent folder's
`CLAUDE.md` covers what spans all three. Read this one for anything in this tree.

## Commands

```bash
npm start                # Metro
npm run android          # debug build → device/emulator
npm run typecheck        # tsc --noEmit
npm run lint             # eslint (clean — keep it that way)
npm test                 # jest
npm run shared:check     # src/shared must equal the server's, byte for byte
npm run verify           # typecheck + shared:check + test — run this before calling anything done
npm run build:android    # release APK
npm run clean:android    # gradlew clean
```

**This project uses `npm`, not `pnpm`** — it has a `package-lock.json`, unlike both
siblings. `engines` asks for Node >= 22.11 (the siblings pin 24.x); do not "align"
them without a reason.

One test file, or one case:

```bash
npx jest src/services/sync/__tests__/syncManager.test.ts
npx jest -t 'names the date field per endpoint'
```

The API has to be running alongside: `cd ../mountainbakes-server && pnpm dev` (port
3001). Nothing starts both. On the Android emulator the host is **`10.0.2.2`**, not
`localhost` — that is what `.env.development` already says.

`react-native-config` bakes `.env.*` values into the binary at **build** time. Editing
`.env.development` and reloading Metro changes nothing; the app must be rebuilt.
`assertApiReachable()` in `src/config/env.ts` throws loudly on a missing value rather
than letting every request 404 quietly.

A Gradle build prints ~65 deprecation warnings. They come from sixteen third-party
native modules' own `build.gradle` files (skia, screens, nitro-modules, op-sqlite,
…) plus AGP's internal dependency declarations — **none from this tree**, which was
cleaned up. They become errors only in Gradle 10; the libraries will have moved by
then. Do not go patching `node_modules` over them.

**iOS has never been built.** The project exists from the template, CocoaPods has
never run, and development happens on Linux. Treat any iOS claim as unverified.

## Architecture

### A third client of the same API — never a second backend

```
this app ──REST──> mountainbakes-server ──> Supabase
```

The server holds the service-role key and owns every privileged write. This app holds
only the Supabase **anon** key and the signed-in user's session; it reads no
privileged table directly and computes no financial truth of its own. When an
endpoint is missing, the fix is in the server, not a Supabase call from here.

Auth is `supabase.auth.signInWithPassword` against Supabase directly, then the access
token rides on every API call as `Authorization: Bearer`. Role and branch come from
the JWT's `app_metadata` (`src/services/supabase/claims.ts`) — never from a form, and
never from anything the user can type. Two sign-in routes exist because Finance is a
separate product surface: e-mail for the main app, a Finance User ID (resolved via
`POST /api/auth/finance-lookup`) plus TOTP for Finance.

Navigation gating is UX, not a boundary. The API re-authorises every request.

### Every write is offline-first, through one code path

There is no `if (isOnline)` branch at submit time, deliberately: branching would make
the offline case the rarely-exercised one, and that is the case staff in a basement
shop actually rely on. A write always goes:

```
form → writeOffline() → SQLite row + sync_queue row (one transaction) → drain attempt
```

The user is told **"Saved offline"** unless the server confirmed within that drain, in
which case it is "saved". Never report a queued transaction as saved — that is how the
same expense gets entered twice.

`src/services/sync/syncManager.ts` drains the queue. Its failure classification is the
whole design: network/timeout/5xx back off and retry; **401 pauses the entire drain**
without burning the row's retry budget; 409 is recorded as a conflict for a human; a
4xx judgement parks the row as failed. **Nothing is ever deleted on failure** — a
parked row is still the only copy of a transaction the server never accepted. The
drain lock is claimed *synchronously* before any `await`, or two drains send the same
row twice.

### `client_operation_id` is the spine

A UUIDv7 minted when a transaction is **created**, not when it is sent, and reused as:
the domain row's primary key, `sync_queue.client_operation_id`, and the
`Idempotency-Key` header on every attempt. **Never regenerate it on retry** — that is
exactly how a request the server already processed becomes a second sale. The server
honours the header (its migration 84) on the five offline-capable writes and returns
the original response on a repeat.

### Business date is captured on the device

The day rolls at **02:00 Asia/Karachi**, not midnight (`@mb/shared/utils/timezone`). A
sale rung up at 21:00 offline and synced at 07:00 belongs to the evening it was made,
so the queue row carries the date and the send merges it into the payload. The field
is **named per endpoint** (`date` on expenses, `businessDate` elsewhere — see
`services/sync/endpoints.ts`); sending the wrong key is silently ignored, which is
precisely how a queued transaction lands on the wrong day with nothing appearing to
fail. The server bounds it (no future dates, ≤7 business days, closed days refused).

### `src/shared/` is a mirror of two other trees

It is byte-identical to `mountainbakes-server/src/shared/`, which
`mountainbakes-frontend/` also mirrors. Nothing enforces it mechanically — separate
repos, no shared package, no failing build. Editing a schema here means making the
identical edit in **both** other trees, and `npm run shared:check` is what catches a
slip. A stale copy of `timezone.ts` bills sales to the wrong day.

### Screens are resolved by role, not by name

`navigation/roleNavigation.ts` is the single source of truth for which tabs a role
gets. `resolveScreen()` in `AppNavigator.tsx` maps (role, tab name) → component,
because **the same tab name means different screens for different roles**: "Sales" at
the production counter allows a `staff` payment method a branch sale must never offer,
and "Dashboard" is four different screens. An unbuilt tab renders a placeholder naming
the phase it lands in, so an unbuilt screen is never mistaken for an empty one.

`navigation/__tests__/screenCoverage.test.ts` mirrors that routing table by hand and
its `gaps` assertion is the machine-checked list of what is still unbuilt. Update it
when a screen lands; an unexpected entry means a tab quietly stopped resolving.

`branch_user` is a **shift account carrying its manager's `branchId`**, not a branch of
its own — branch-scoped code must treat it and `branch_manager` identically
(`isBranchRole`) or the shift user sees an empty shop.

### Local database

`op-sqlite` over JSI, WAL, opened in `database/localDb.ts`. Migrations
(`database/migrations/index.ts`) are versioned with `PRAGMA user_version` and are
**append-only, forward-only and never destructive**: an app update must not drop a
table holding unsynced work, and editing a shipped migration silently diverges the
schema on devices that already ran it. Domain row and queue row are written in one
`transaction()` — either alone is a lost or a phantom transaction.

The database is **not** encrypted; it holds business records only. Session and tokens
live in MMKV encrypted with a Keychain-held key (`services/storage/secureStorage.ts`).

### API client conventions

`services/api/client.ts`. There is **no `{success, data}` envelope** — bodies are
resource-keyed (`{user}`, `{orders, total}`), so each caller unwraps its own shape and
the client unwraps nothing. Errors are `{error, details?}`. A 401 triggers exactly one
refresh-and-replay. The token is attached by an interceptor at **send** time, never
frozen onto a queued row — an overnight retry with a captured token would 401.

`services/api/errors.ts` turns everything into an `ApiError` with a `kind`, and that
`kind` is what the sync queue branches on. Changing the mapping changes retry
behaviour for real money.

### Startup order is deliberate

`config → encrypted storage → settings → SQLite migrations → session → network`
(`App.tsx`). Storage precedes session restore because the session lives in it; the
database precedes the session because signing in can trigger a drain immediately. A
bootstrap failure shows a retry, never an endless splash.

### Theme

Light and dark are two token sets behind one interface (`theme/`). Do not write
`isDark ? a : b` in a component; add or use a token.

## Other docs

`docs/mobile-architecture-audit.md` (the backend audit this app was built from — API
surface, roles, domain values, decisions), `docs/offline-sync.md`,
`docs/cache-policy.md`, `docs/testing.md`, `docs/troubleshooting.md`. `README.md`
carries the phase-by-phase status table and what is verified versus not.
