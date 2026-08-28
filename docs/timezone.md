# Timezone

One zone: **Asia/Karachi**. Not the device's, not the server's, not UTC. Every
clock a user reads in this app is the Karachi business clock, and every instant
the app stores is timezone-free. The conversion happens at exactly two
boundaries, both named below.

This is the strategy document. `src/shared/utils/timezone.ts` is the
implementation, and it is a byte-identical mirror of the server's copy — see
[`local-database.md`](local-database.md) for what that mirror costs.

## Why plain `Date` math and not a timezone library

Asia/Karachi is a fixed **UTC+5** offset with **no DST since 2009**. That single
fact is what lets `timezone.ts` compute every boundary with arithmetic on a
`Date` instead of pulling in `date-fns-tz`:

```ts
function toKarachiClock(d: Date): Date {
  return new Date(d.getTime() + 5 * 60 * 60 * 1000);
}
```

A `Date` shifted by five hours has UTC fields that read as Karachi wall-clock
time. `getUTCHours()` on that value is the Karachi hour on **any** device, in any
timezone, with no ICU data involved — which matters on Hermes, where `Intl` is
incomplete. If Pakistan ever reintroduces DST this assumption breaks loudly and
everywhere at once, which is the right failure mode for something this load-bearing.

## Two families, and picking the wrong one is the bug

`timezone.ts` exports two parallel sets of helpers. They differ only in where the
day starts, and that difference is worth money:

| Family | Day boundary | Use for |
|---|---|---|
| `karachiDateStr` · `karachiTimeStr` · `karachiDayBounds` · `karachiRange` | midnight | **wall-clock display only** — "printed at", "as of" |
| `businessDateStr` · `businessDayBounds` · `businessRange` · `businessDaysAgoStr` | **02:00** | **every financial or operational date** |

The bakery trades 08:00 → 02:00 the next day, so the business day rolls at
02:00 Karachi (`BUSINESS_DAY_START_MINUTES = 120`): anything from 00:00–01:59
belongs to the **previous** business date. A 01:30 sale filed under the calendar
date is filed against a day it has nothing to do with. See
[`../README.md`](../README.md) and the business-date rules in the parent
`CLAUDE.md` for the domain reasoning.

Current usage, verified across both trees: **one** `karachi*` call site outside
`shared/` in this app — `OrderPrintPreview`'s `printedAt`, which is a wall-clock
stamp of when a slip was physically printed and correctly *not* a business date —
and **zero** `karachi*` call sites on the server outside its own `shared/`.

## Storage: one shape per layer, none of them ambiguous

An **instant** is stored timezone-free. A **business date** is stored as a bare
calendar date with no time and no zone. Nothing anywhere stores a local-time
string.

| | Instant | Business date |
|---|---|---|
| Postgres | `timestamptz` (119 columns) | `date` |
| SQLite (this app) | `INTEGER` — epoch ms from `Date.now()` | `TEXT` — `YYYY-MM-DD` |
| Wire (JSON) | UTC ISO string | `YYYY-MM-DD` string |

Epoch milliseconds are the point: an `INTEGER` has no timezone to get wrong, so a
queued row written on a phone set to `America/Denver` and drained from one set to
`Asia/Karachi` is the same instant either way. The `*ISO` helpers deliberately
return **UTC** ISO strings so they compare correctly against stored `createdAt`
values.

The business date is *not* derived from the instant at read time. It is captured
on the device when the transaction happens, stored on the row, and grouped on as
stored — the server's report queries group on the stored `business_date` column,
never on `created_at` recomputed after the fact. A row that syncs three days late
therefore cannot drift into a different day's figures.

## Display: one funnel

Every user-facing timestamp in this app goes through Karachi conversion. There is
no `toLocaleDateString`, no `toLocaleTimeString`, no `Intl.DateTimeFormat`, and
no bare `Date` accessor anywhere in the render path:

- **`dataAsOfFrom(query.dataUpdatedAt)`** (`utils/dataAsOf.ts`) → `karachiTimeStr`.
  This is the single funnel for "as of HH:mm" and is used on ~20 screens via
  `MBHeader`. It returns `undefined` for a query that has never resolved, because
  rendering the epoch as "05:00" is worse than saying nothing.
- **`karachiTimeStr` / `karachiDateStr` directly** — the print slip's `printedAt`,
  `mirrorStore`'s last-refresh label, and `useOrderWindow`'s `nowAt`.

A stale-data timestamp that quietly used the phone's timezone would be the one
clock in the app that disagreed with the rest, and on a device set to another
zone that is precisely the reading that makes someone think data is fresher — or
older — than it is.

## The three clocks, and where each is converted

| Clock | Trusted for | Converted where |
|---|---|---|
| **Device** | *when* a transaction happened (an instant) | `businessDateStr()` at write time turns it into a business date; the raw instant is stored as epoch ms |
| **Server** | whether that day will accept the write | `resolveClientBusinessDate` bounds the claimed date |
| **UTC** | storage and comparison only | never displayed; converted by `karachi*` helpers before it reaches a screen |

The device gets a say at all because a phone is not a browser at a counter: a
sale rung up at 21:00 with no signal and synced at 07:00 the next morning must be
filed against the evening it was made. The device knows *when*; the server
decides *whether*. It refuses a future date (a handset with a wrong clock must
not open a day that has not happened), refuses anything older than the seven
business-day sync window, and refuses a closed day. A refusal **parks** the
operation for a person — it is never silently re-dated and never discarded.

## The one place device-local time is used

`MBDateRangeField` reads a picked date back with `getFullYear()` / `getMonth()` /
`getDate()` — local accessors — and that is correct here. The value is a
**calendar day the user tapped**, not an instant, so there is nothing to convert:

```ts
toDate(str)          // 'YYYY-MM-DD' → local NOON
toBusinessDate(date) // local Y/M/D → 'YYYY-MM-DD'
```

The pair is symmetric and anchored at local noon, so no timezone shift can roll
the value to the previous day in either direction. Reading it back with
`toISOString().slice(0, 10)` instead would be UTC, and therefore wrong for the
two hours either side of midnight in Karachi — which is exactly the window the
business-day rule already makes delicate.

Three other sites do `toISOString().slice(0, 10)` (`StockScreen`,
`NewOrderScreen`, and the helper above's sibling). All three anchor on
`businessDateStr()` **first** and then do pure calendar arithmetic on the
resulting string at UTC noon or midnight — the business rule is applied before
the maths, so none of them reintroduce a midnight boundary.

## What would break this

- Reaching for `karachi*` where a business date is meant. Silent: everything
  looks right except for records made between midnight and 02:00.
- `new Date().toISOString().slice(0, 10)` as a business date. Wrong twice — UTC
  rather than Karachi, and midnight rather than 02:00.
- Any `toLocale*` or bare `getHours()` in a render path. Correct on a developer's
  machine in Karachi, wrong on a device set to another zone.
- Editing `src/shared/utils/timezone.ts` in one tree only. Nothing enforces the
  mirror mechanically; `npm run shared:check` is what catches it, and a stale
  copy bills sales to the wrong day.
- Making `BUSINESS_DAY_START_MINUTES` settings-driven. It is a fixed constant on
  purpose: changing it would silently reclassify which business day every
  existing midnight–2 AM record falls into.

## Verified

`src/common/helpers/__tests__/businessDate.test.ts` pins the boundary directly — *"is 120
minutes past midnight"*, *"rolls over exactly at 02:00"*, *"bills after-midnight
trade to the PREVIOUS business date"*, *"differs from the plain calendar date in
the midnight–2 AM window"*, *"places a 01:30 sale inside the previous day bounds
and outside the next"*. `dashboardRange`, `offlineWrite`, `payloadValidation`,
`syncManager` and `useOrderWindow` cover the rest of the chain.

The wrapping order window has a second, blunter guard: `NewOrderScreen`'s tests
pin the clock rather than reading it, because the window closes at 02:00 and an
unpinned suite is green in the afternoon and red overnight. See the timing
convention in [`testing.md`](testing.md).

Not verified: nothing here has been exercised against a running backend, and no
device has been set to a non-Karachi timezone and driven through a write. Both
are read-the-source-and-assert-against-mocks results.
