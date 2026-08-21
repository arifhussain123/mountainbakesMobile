# Performance

What was optimised, why it was the thing to optimise, and — just as important —
what was measured versus what was reasoned about.

> **Nothing here was profiled on a device.** There is no Android handset or
> emulator in this environment, so no frame timings, no Systrace, no Hermes
> sampling profiler. Every change below is either a *structural* fix (work that
> provably did not need to happen at all) or a *count* fix (round-trips and
> re-renders that can be counted by reading the code). Where a number appears it
> was measured from build output, not from a running app. Treat the ordering of
> impact as an argument, not a benchmark.

The target device is not a developer's phone. It is a shared branch handset in a
shop, often on a poor connection, frequently offline for hours.

## What was actually measured

| | |
|---|---|
| Production JS bundle | **3.8 MB** (`react-native bundle --dev false`, Metro 0.84.4, 32 assets) |
| `console.log` calls surviving into it | **0** — `babel-plugin-transform-remove-console` confirmed on a real production bundle, not inferred from config |
| Native libraries in the release APK | see the Sentry finding below; sizes read from `android/app/build/intermediates/stripped_native_libs/release` |
| Android **debug** APK | `BUILD SUCCESSFUL in 11m 59s`, 246 MB across four ABIs (unstripped debug symbols; the release APK is 102 MB) |
| Live API reachability | 19/19 GET endpoints the app calls answer `401` on both the local dev server and the production dyno — **zero 404s**, so nothing is wired to a route that does not exist |
| Unused dependencies reaching the bundle | **none** — `drizzle-orm`, `axios-retry`, `date-fns`, `date-fns-tz`, `@gorhom/bottom-sheet`, `@tanstack/react-query-persist-client` and `@react-native/new-app-screen` all return zero hits in the bundle, which is what settles the question below about removing them |

---

## Startup: the two native I/O paths overlap

`App.tsx` ran its bootstrap as four sequential `await`s — encrypted storage,
settings, SQLite migrations, session. The **ordering constraints are real but
narrower than that shape implied**: settings and the session live in encrypted
storage, and the database has to be open before the session because signing in
can trigger a drain immediately. Nothing ties storage to the database. One is
Keychain plus MMKV, the other is SQLite opening a file and running migrations,
and both are native I/O the JS thread does nothing but wait on.

```ts
await Promise.all([initStorage().then(hydrateSettings), initDatabase()]);
await bootstrapAuth();
```

The wait is now the slower of the two rather than their sum, and every
constraint above still holds — settings are chained onto storage, the session
waits for both. `Promise.all` rather than two bare promises awaited in turn:
the latter leaves a window where one has rejected and nothing is listening yet,
which Hermes reports as an unhandled rejection — a red box on a start that was
already failing, in front of the retry the user needs to see.

The single boot timeout around the whole sequence is unchanged. It is a budget
for what the user is waiting through, and per-step timeouts would let several
slow steps add up to a wait none of them individually exceeded.

---

## Rendering: nothing re-renders that has not changed

### One OS subscription instead of one per tappable surface

`useReducedMotion()` is read by `MBPressable`, and `MBPressable` is every
tappable surface in the app. The old implementation mounted an
`AccessibilityInfo` listener **and** fired an async `isReduceMotionEnabled()`
read in each caller's `useEffect`. Scrolling a catalogue therefore attached a few
hundred native listeners and fired a few hundred async bridge reads of one
process-wide boolean, each costing a state update when it resolved.

It is now module state behind `useSyncExternalStore`: one listener, one read, one
snapshot shared by every consumer, ref-counted so it detaches when the last one
unmounts. See `docs/motion.md`.

### List rows are memoised, and their props are stable enough for it to matter

Every list screen already had a named row component. None was memoised, so a
parent re-render — a keystroke in the search box, a refetch, a sync count moving
— re-rendered every visible row.

Wrapping them in `React.memo` is only half of it. `memo` bails out on equal
props, and a handler built inside `renderItem` is a new function on every render:

```tsx
// Before — memo could never bail out
<UserRow onPress={() => navigation.navigate('UserForm', { userId: item.id })} />

// After — one stable handler for the whole list; the row binds it internally
<UserRow user={item} onOpen={onOpen} />
```

Rows now take the item plus a stable callback and close over the item themselves.
Theme changes still reach them, because context bypasses `memo`.

Two screens drove this:

- **POS (`SalesScreen`)** — `useCart` returned a fresh object literal every
  render, so the `onAdd` callback that depended on it was new every render, so
  `renderItem` was new every render, and every visible product row re-rendered on
  every keystroke *and* every tap. The cart object is memoised and the screen
  depends on `cart.addProduct` (stable) rather than on the cart.
- **New order (`NewOrderScreen`)** — each row got a `qty => setQty(item.id, qty)`
  closure, so one stepper tap re-rendered every row rather than the one whose
  quantity moved. The stable setter is passed whole.

### Two lists were not virtualised at all

The README claimed every unbounded list was on `FlashList`. Two were not:
**Expenses** and the **Sync Center** were mapped `ScrollView`s, which mounts
every row before the first one is on screen. Both are longest exactly when it
hurts most — the expense range chips reach "This month", and the Sync Center
holds one row per transaction of a shift worked offline. Both are `FlashList`
now, with memoised cards and module-scope key extractors and separators.

### Two more lists were not virtualised either

The same defect, found in two more places after the first sweep:

- **Return stock (`StockReturnScreen`)** — a mapped `ScrollView` over every
  product the branch holds stock in, which at close of day is most of the
  catalogue. It carried a second, worse problem: the **Reason field lived in the
  same scroller and the same component state**, so every keystroke in it
  re-rendered every product row. Typing "unsold at close" was seventeen
  full-list renders on the handset least able to afford them. It is a
  `FlashList` now, with the field in `ListFooterComponent` where it visually
  was, a memoised `ReturnLine`, and the stable `setQty` passed whole.
- **Production orders (`ProductionOrdersScreen`)** — a mapped `ScrollView` over
  every demand from every branch, longest on the counter's busiest morning.
  `MBOrderCard` was *already* `React.memo` and could never bail out, because
  `onReview={() => setReviewing(order)}` built two new closures per card per
  render. The card now takes the order back (`onReview: (order) => void`) and
  binds it internally, so the screen holds one stable handler for the whole
  queue and a status-chip tap re-renders the chips rather than thirty demands.

`CategoriesScreen` is still a mapped `ScrollView` and stays one: a bakery has a
dozen categories, the screen's own subtitle counts them, and virtualising a
bounded set buys nothing.

### Illustrations and the product placeholder are memoised

An illustration is thirty-odd vector nodes and it sits inside an empty or error
state that re-renders with its screen. Redrawing a static picture because a query
refetched is work with no visible effect but the frames it costs.

---

## Navigation: a screen that is not on screen does no work

`lazy` and `freezeOnBlur` are both set explicitly on the tab navigator, and
`freezeOnBlur` on every native stack. A tab mounts when first opened rather than
at sign-in (five tab roots mounting at once is five parallel requests, four
unasked-for), and a tab or covered screen stops re-rendering until it is looked
at again. State, scroll position and in-flight requests survive — only rendering
is deferred. Full reasoning in `docs/navigation.md`.

`stackScreenOptions(reduceMotion)` is now memoised at each call site; a fresh
options object made React Navigation re-resolve every screen's options on each
render of the stack.

---

## Queries: one request, one cache entry

Several screens hand-rolled their keys, which is exactly what `qk` exists to
prevent. The concrete costs:

- The branch dashboard and the Reports screen made the **same**
  `GET /api/reports/summary` request under `['reports','summary',period]` and
  `['reports','summary','export-view',period]` — two entries, two requests, two
  copies of one answer going stale independently, on two screens the same manager
  moves between.
- `GET /api/production-orders` was read under three different keys. That also
  broke invalidation: `invalidateQueries(['production'])` after reviewing a
  demand could not reach a list stored under `['productionOrders']`, so the
  screen that had just changed kept showing the state before the change.

Every key now comes from `qk`, and a key names the request rather than the screen
asking it. The full before/after table is in `docs/cache-policy.md`.

**Switching a filter keeps the previous answer.** Every query behind a chip row
or a date range carries `placeholderData: previous => previous`. Changing a
filter is the same screen being asked a different question; without this the
result unmounts, the layout collapses to a skeleton and refills a moment later.

---

## Database: one native call instead of one per row

The reference mirror replaced a collection with a `transaction()` containing an
`await tx.execute()` per row. For a 400-product catalogue that is 400 JSI
crossings and 400 promise resolutions on the JS thread — all of them while the
user watches a spinner on first sign-in or a pull-to-refresh.

`replaceCollection` builds a single `executeBatch`: the DELETE plus one
parameterised INSERT run against every row, executed inside one transaction on
the native side. The atomicity that made the loop a transaction in the first
place is preserved — a mirror is never left half-replaced for a screen to read —
and the empty case (a collection the server now reports as empty) still empties
the mirror, which `productFetch.test.ts` pins.

`getUnsyncedSummary()` ran two `COUNT(*)` passes over `sync_queue` to answer two
questions about the same rows. It is one statement now. This is the query behind
the sync badge in every header, re-run after every drain.

---

## Sync: a drain clears the backlog, and settles its own litter

Two defects, both invisible until a branch actually worked a shift offline:

**A drain sent 20 operations and stopped.** The engine deliberately does not poll
— it drains on reconnect, foreground and sign-in — so a branch that rang up an
evening with no signal reconnected, sent 20, and left the rest waiting for
someone to background and reopen the app twice more. Nothing was lost, but "it
will sync automatically when you reconnect" was not true. A drain now keeps
claiming while a batch comes back full, stops the moment one comes back short,
and is capped at ten batches.

**`pruneSynced` was written, tested, and called from nowhere.** Every operation a
device ever sent stayed in `sync_queue` for the life of the install — tens of
thousands of rows on a busy handset, each carrying its request payload as JSON,
and every claim and every badge count reading past all of them. A drain now
prunes settled rows after its work. `failed`, `conflict` and `superseded` are
never pruned; they are the only copy of a transaction the server did not accept.

The drain stays **sequential within a batch**. Rows carry `depends_on`, and
sending a dependent before its prerequisite exists on the server is precisely the
ordering the queue exists to preserve. Parallelising it would be faster and
wrong.

---

## Weak connections: the two changes that decide how the app feels

The target device is a shared branch handset on a poor connection. Both fixes
here are about **not waiting to learn something already known**.

### A known-offline read goes straight to the mirror

`readThrough` fired the request regardless and let it fail. With a 20-second
client timeout, a shop that had been offline all afternoon watched every screen
sit on a skeleton for twenty seconds before showing data that was on the phone
the whole time. It now reads the mirror first when NetInfo says there is no
usable connection, and does not touch the network at all.

`isOnline` is deliberately **optimistic** — `null` reachability counts as online,
see `networkStore` — so this only skips the request when NetInfo is *sure*. A
captive portal or a dying signal still goes through the request path and the
timeout, which is the only way to find out. Nothing mirrored and no connection
throws `kind: 'offline'` rather than returning an empty list, because "no
products" and "we are offline with nothing saved" are different facts and only
one of them is about the catalogue.

### A read and a write no longer share a deadline

| | Budget | Why |
|---|---|---|
| Write (POST/PUT/PATCH/DELETE) | 20s | already queued locally, so every extra second is another chance it lands now rather than on the next drain — patience costs nothing |
| Read (GET/HEAD) | **8s** | the SQLite mirror is behind it, so a long timeout does not buy fresher data, it buys a longer skeleton in front of data the phone already holds |

Set in the request interceptor, and only when the call site has not asked for
something specific — the report export keeps its own budget. Eight seconds is
well past a healthy round trip on a bad connection and well short of a user
deciding the app has hung: a read that is merely slow still completes, and one
that is not going to complete stops pretending sooner.

---

## Background sync: three moments, and deliberately no timer

The drain runs on reconnect, on foreground, and on sign-in — the three moments
work can actually move. There is **no polling timer**: a drain that finds nothing
costs a database round-trip and, on a locked-down network, a failed request that
burns retry budget for no reason.

What this does **not** do is sync while the app is backgrounded or killed. That
needs Headless JS and WorkManager (a native dependency, a new permission surface,
and a second execution context for the queue to be claimed from) and it was not
added here. The gap it leaves is narrow: the queue drains the instant the app is
foregrounded, and nothing is ever lost in the meantime — a parked row is still
the only copy of a transaction the server never accepted. **This is a product
call rather than a performance one**, and it is listed under next steps rather
than quietly skipped.

---

## Images

There are three raster images in the app and they are all the logo; everything
else — illustrations, the product placeholder — is vector drawn from theme
tokens, which is why there is no light/dark raster pair to keep in sync.

Each `<Image>` now sets `fadeDuration={0}`. Android cross-fades an image in over
300ms by default, which is a reasonable guess for a photograph arriving over a
network and wrong for a raster that ships inside the APK and is already decoded —
on the splash screen it put a delay in front of the first thing the user sees.

---

## What was looked at and deliberately left alone

- **Persisting the TanStack Query cache.** `@tanstack/react-query-persist-client`
  is a dependency and is still not wired. The SQLite reference mirror already
  covers the reads that must work offline and does it more honestly: a mirrored
  read reports *its own* age, so a screen can say how old its figures are. A
  restored query cache would show the same stale numbers with a fresh-looking
  `dataUpdatedAt`.
- **Parallelising the drain.** See above — `depends_on` ordering forbids it.
- **Indexing `local_products(name)` for the mirror's `ORDER BY`.** A sort of a few
  hundred rows is microseconds, and migrations are append-only and forever. Not
  worth a permanent schema commitment.
- **Debouncing the local search boxes.** Orders, Users, Stock and Production
  Stock filter an already-downloaded list with a `useMemo` per keystroke, and
  that is correct: there is no request to save, filtering a few hundred rows is
  microseconds, and a debounce would only add lag to something currently
  instant. The debounced boxes (Products, POS, New Order, Expenses) are the ones
  that hit the **server** on each change.
- **Removing unused dependencies.** `drizzle-orm`, `axios-retry`, `date-fns`,
  `date-fns-tz`, `@gorhom/bottom-sheet`, `@tanstack/react-query-persist-client`
  and `@react-native/new-app-screen` are declared and imported by nothing. All
  are pure JS and none appears in `android/app/build/generated/autolinking/`, so
  Metro never bundles them — grepping the production bundle for each returns
  zero hits. Removing them would buy `npm install` time and **nothing at runtime
  or in the APK**. Tidy-up, not optimisation, so it was not made under this
  heading.

---

## One finding worth acting on, deliberately not acted on here

`@sentry/react-native` **is** autolinked. Its native libraries ship in every
APK — 3.0 MB across the four ABIs, measured from
`android/app/build/intermediates/stripped_native_libs/release` — and **no
JavaScript in this app imports it**. `src/config/env.ts` reads `SENTRY_DSN` into
`env.sentryDsn`, `.env.example` carries the key, and nothing consumes either.

This is the same shape as the `librnskia.so` problem the README records: a native
library paying rent in the binary for a feature that is not switched on.

It was left in place because the evidence says it is *planned* rather than dead —
the env plumbing exists and the architecture audit already specifies that "Sentry
must scrub `Authorization` headers and customer phone numbers before release".
Deleting it would undo an intention, which is a product call and not a
performance one. **Either wire it up or drop the dependency**; shipping the
native library while the README claims crash reporting "stays off when blank" is
the one state that is wrong whichever way the decision goes.
