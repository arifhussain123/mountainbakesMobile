# Offline & Sync — as implemented

What is actually built, and the reasoning behind the parts that look arbitrary.

---

## Shape

```
UI → useCreateExpense (etc.)
        ↓  ONE local transaction
   domain row  +  sync_queue row
        ↓  (online + authenticated)
   sync manager → API client → Express → Supabase
```

Reads go to the API through TanStack Query. Writes go to SQLite **and** the queue,
in a single transaction — either one without the other is a defect with a name:
a domain row with no queue row never syncs; a queue row with no domain row is a
phantom the user cannot see or correct.

**One code path regardless of connectivity.** `writeOffline()` always runs, then a
drain is attempted. Branching on `isOnline` at submit time would make the offline
case a separate, rarely-exercised path — and that is the path staff actually rely
on in a shop with no signal.

### The one transaction that does not take this path

The **production counter sale** posts straight to
`POST /api/orders/production-sale` and is never queued. It is the only write in
the app that does not, and the reason is the endpoint rather than the screen —
it is missing both halves of what makes a queued write safe:

| | `/api/orders/pos` (branch) | `/api/orders/production-sale` |
|---|---|---|
| `idempotent()` middleware | yes, `sale.create` | **no** |
| `businessDate` in the schema | yes, `optionalBusinessDate` | **no** |

Without the first, a retry after a timeout does not replay an answer — it rings
up a second sale, which is precisely what `client_operation_id` exists to
prevent everywhere else. Without the second, Zod strips the date a queued row
would send and the handler stamps `businessDateStr()` at the moment it *drains*,
so a 21:00 sale synced at 07:00 lands on the wrong business day with nothing
appearing to fail.

So `ProductionSalesScreen` sends it live and fails loudly, and it says so before
a cart exists rather than at checkout: the FAB is disabled with no connection,
and `MBHeader`'s `offlineNote` replaces the strip's default sentence — which
promises the transaction is saved on the device and would, here, be the exact
lie that gets a sale rung up twice.

Making it offline-capable is a **server** change first — `idempotent('sale.create')`
on the route and `businessDate: optionalBusinessDate` on the schema, matching the
branch POS. After that it is an entry in `api/sync/endpoints.ts` and a
`writeOffline({entity: 'sale'})` call, and nothing else moves.

The production **returns review** is also unqueued, for a different reason: it is
a decision about a server record other people are acting on, not a transaction
originating on the device. See `ProductionReturnsScreen`.

---

## Identity: `client_operation_id`

A UUIDv7 minted when a transaction is **created**, not when it is sent. It is
simultaneously:

- the domain row's primary key,
- `sync_queue.client_operation_id` (UNIQUE),
- the `Idempotency-Key` header on every send attempt.

**It is never regenerated, including on retry.** Regenerating on retry is exactly
how a request the server already processed becomes a second sale.

v7 rather than v4 because it is time-ordered: the queue drains in creation order
under a plain `ORDER BY`, and the id itself carries a creation timestamp.

### What the server does with it

Landed in server **migration 84** (`idempotency_keys` + `claim_/complete_/release_idempotency_key`)
and `src/middleware/idempotency.ts`, on the five offline-capable writes: order
create, POS sale, production demand, expense and branch return.

| Repeat of… | Answer |
|---|---|
| a request that succeeded | the **original** response, with `Idempotency-Replayed: true`. Nothing runs again. Stored as `jsonb`, so every field and value is the original — only key ORDER may differ, which no client reads positionally |
| a request still in flight | `503` + `Retry-After: 5` → the queue backs off and retries |
| a request whose earlier attempt died mid-flight (>5 min) | `409` → parked as a conflict for a person to check |
| the same key with a **different body** | `422` → parked as failed; it is a client bug |
| a request that failed without changing anything | the key is **released**, so a later retry is a real attempt |

That last row is what keeps a 409 "stock has changed" recoverable: storing the
refusal would mean the queued sale could never succeed, only replay its own
rejection. The exception is a branch return that committed some products before
hitting a shortfall — that response *is* stored, because re-running it would
return those units twice.

A request with **no** `Idempotency-Key` header passes straight through. The web
app sends none and is unaffected.

---

## Business date

Captured **on the device, at creation time**, and stored on both the domain row
and the queue row.

The server stamps the business day **on receipt** unless told otherwise. A sale
rung up at 21:00 and synced at 07:00 would otherwise be billed to the following
morning. The day rolls at **02:00 Asia/Karachi**, not midnight.

The request field is **named per endpoint** and is not guessable:

| Entity | Field |
|---|---|
| expense | `date` (`CreateExpenseSchema`) |
| order, sale, production_order, stock_movement | `businessDate` |

Sending the wrong key is silently ignored — which is precisely how a queued
transaction lands on the wrong day with nothing appearing to fail.

**The date is bounded, not trusted** (`resolveClientBusinessDate` on the server):
a future date is refused outright, so does anything older than the seven-day sync
window, and a **closed** business day is refused exactly as it is for a
back-dated write from the web app. A refusal parks the operation with the
server's reason in the Sync Center — the transaction is never dropped, and never
silently re-dated.

---

## Queue states

```
pending → syncing → synced
             ↓
      pending (backoff)    transient failure
      failed               server rejected it, or retries exhausted
      conflict             409 / 403 / 404 — the world moved
      blocked              a prerequisite has not synced yet
      superseded           a person resolved the conflict in the server's favour
```

`claimReady()` excludes any row whose `depends_on` has not reached `synced` —
never send a dependent before its prerequisite exists. Ordering is `priority`
then `created_at`; priority defaults per entity (orders 10 → production orders 20
→ special orders 25 → sales 30 → expenses 40 → stock 50).

**Nothing is ever deleted on failure.** A `failed` or `conflict` row is still the
only copy of a transaction the server never accepted. Only `synced` rows are
pruned, after 7 days.

`superseded` is the terminal state of resolving a conflict in the server's
favour. It cannot be folded into either neighbour: `synced` would claim a
transaction reached the server when it never did, and `failed` would keep asking
for attention that has already been given. It is not counted as unsynced, and it
is never pruned — it is the record of what the operator actually entered.

---

## Failure classification

The classification *is* the engine:

| Outcome | Handling |
|---|---|
| network / timeout / 5xx | Back off, stay `pending`, retry |
| **401** | **Pause the entire drain.** Do not consume the row's retry budget — an expired token is not the transaction's fault |
| **409 / 403 / 404** | **Conflict.** Store both sides in `sync_conflicts`, park as `conflict`, surface it to a human. Never resolved automatically |
| 4xx validation | The server has judged it. Park as `failed`; retrying cannot change the answer |

Backoff is a fixed schedule with ±20% jitter: `2s, 8s, 30s, 2m, 10m, 30m (cap)`,
parking after 8 attempts. Fixed rather than pure exponential so the tail stays
bounded; jitter so four branches reconnecting on the same wifi do not hit the API
in lockstep.

---

## Three problems the web app documented, and how each is handled here

The web service worker keeps its write queue **disabled** and names three reasons.
All three apply to mobile:

1. **No idempotency keys** → a key is minted at creation and sent on every
   attempt, and the server honours it (migration 84).
2. **Frozen `Authorization` header** → the token is attached by the API client's
   interceptor at **send** time, never stored on the queue row. An overnight
   retry uses a fresh token.
3. **Business day stamped on receipt** → captured on device, sent explicitly.

---

## Safety properties

- **One drain at a time.** The lock is claimed *synchronously* before any
  `await`; checking a flag and then awaiting before setting it leaves a window
  where two drains both claim the same row and send it twice.
- **Killed-app recovery.** Rows stranded in `syncing` are reclaimed to `pending`
  at the start of each drain. Safe because every send carries an idempotency key.
- **Sign-out preserves work.** Local data is never cleared. When unsynced work
  exists, sign-out states the count and asks for confirmation — the work resumes
  on next sign-in *on that phone*, which matters on a shared handset.
- **No polling.** Drains fire on reconnect, on foreground, and on sign-in. A
  drain that finds nothing costs a database round-trip and, on a locked-down
  network, a failed request that burns retry budget for no reason.
- **A drain clears the backlog, not one batch of it.** It keeps claiming while a
  batch comes back full, and stops the moment one comes back short — a short
  batch is the queue saying it is empty, and asking again could only spend a
  round-trip to be told so. Ten batches of 20 is the cap.

  This matters *because* there is no polling. A drain used to send exactly 20
  and stop, so a branch that rang up an evening with no signal reconnected, sent
  20, and left the rest waiting for someone to background and reopen the app
  twice more. Nothing was lost, but "it will sync automatically when you
  reconnect" was not true.
- **Settled rows are pruned, unsettled ones never.** After the work, a drain
  deletes `synced` rows older than a week. `failed`, `conflict` and `superseded`
  stay forever — they are the only copy of a transaction the server did not
  accept, or the record of what an operator actually rang up. Pruning is
  best-effort: a drain that moved real work is not reported as failed because a
  cleanup DELETE did not run.

  Until this was wired, `pruneSynced` was written, tested, and called from
  nowhere. Every operation a device ever sent stayed in `sync_queue` for the life
  of the install — tens of thousands of rows on a busy handset, each carrying its
  request payload as JSON, and every claim and every badge count reading past all
  of them.

---

## What the user is told

Never "Sale successful" for a locally-saved transaction:

| State | Copy |
|---|---|
| Server confirmed | "Expense saved." |
| Queued | "Saved offline — it will sync automatically when you reconnect." |
| Offline | "Offline — your work is saved on this device" |
| Needs attention | "N need attention" → Sync Center |

Telling someone a transaction is saved while it sits in a queue is how the same
expense gets entered twice.

---

## Sync Center

Tabs: Pending · Failed · Conflicts · Completed. Per operation: entity, business
date, operation id (quotable in a support ticket — it is the key the server
dedupes on), attempt count, last error. Actions: **Retry**, **Retry all**. There
is deliberately no Discard.

The **Conflicts** tab is not a list of queue rows like the others. It reads from
`sync_conflicts`, which keeps both the operator's entry and the server's answer,
and offers only the resolutions cleared as safe for that conflict type. Some
conflicts have no queue row left to show at all — a sale the server priced
differently succeeded, and the disagreement is about what it became.

---

## Return photos

A stock return carries one **required** photo — one per submission, not one per
product. It is the only queued write that is two requests, and the first of
them has no idempotency, so the order and the bookkeeping are the design.

### What is stored, and where

Nothing is uploaded when the photo is chosen, and nothing is uploaded at submit
either — online or not. One code path, as everywhere else.

- **The picker shrinks it.** `react-native-image-picker` is asked for
  `maxWidth` / `maxHeight` = `RETURN_PHOTO_MAX_DIMENSION` (1280) and `quality` =
  `RETURN_PHOTO_QUALITY` (0.7), and resizes and re-encodes natively. It never
  upscales. **When its resize fails it returns the original file and reports
  success**, so `common/utils/image/returnPhoto.ts` refuses anything over
  `RETURN_PHOTO_MAX_BYTES` (1 MB) — that check is the only thing standing
  between a failed resize and a 6 MB frame in the queue. The original is never
  sent as a fallback.
- **The hook copies it out of the cache.** The picker writes into the app's
  cache directory, which Android may empty whenever storage is short.
  `useCreateStockReturn` copies the file to

  ```
  <DocumentDir>/return-photos/<uuid>.jpg
  ```

  *before* `writeOffline`, and deletes the copy again if that write fails. If
  the copy itself fails nothing is queued: the photo is required, so a return
  without one is not a return.
- **The path rides in the payload.** No column and no table — the queued JSON
  carries it, in both `sync_queue.payload` and `local_stock_movements.payload`:

  ```jsonc
  {
    "items": [{ "productId": "…", "qty": 3 }],
    "reason": "Unsold at close",
    "attachmentIds": [],                 // filled in by the drain
    "localPhoto": {                      // client-only, never sent
      "uri": "file:///data/user/0/…/files/return-photos/<uuid>.jpg",
      "mimeType": "image/jpeg",
      "width": 1280,
      "height": 960,
      "sizeBytes": 148000
    }
  }
  ```

No permission is declared for any of this. The camera is opened through the
system capture intent, which needs no `CAMERA` permission *as long as the app
does not declare one* — declaring it and not holding it is what makes the
intent throw. The gallery is the Android photo picker, which needs no storage
permission.

### Drain order

`api/sync/returnPhotoStep.ts`, called from `sendOperation` for every row and a
no-op for all but a `stock_movement` that has a `localPhoto`:

```
1. attachmentIds already filled?  → skip to 5
2. local file missing?            → park as failed (photo_missing)
3. POST /api/attachments          (multipart: entity=branch_return, width, height, photo)
4. write the returned id into the row's payload   ← before anything else
5. POST /api/stock/return         (payload minus localPhoto, plus businessDate)
6. markSynced → delete the local file
```

**Step 4 comes before step 5, and that is the whole point.** The upload
endpoint takes no `Idempotency-Key`, so uploading on every attempt would stage
a new photo each time the return's response was lost. Worse, the server
fingerprints the return's body under its key: a retry carrying a *different*
attachment id is a different body, refused as a key mismatch (422) rather than
replayed. With the id on the stored row, every later attempt — including one
after the app was killed between steps 4 and 5 — uploads nothing and sends
byte-for-byte the body the first attempt sent. `queue.updatePayload` does the
write, moving the queue row and the domain row in one transaction and touching
nothing else about the operation: same `client_operation_id`, same status, same
attempt count.

`localPhoto` is stripped from the body. A device path is none of the server's
business, and leaving it in would make the fingerprint depend on it.

### What each failure does

| What happened | What the row does | The local file |
|---|---|---|
| Upload fails on network / timeout / 5xx | backs off and retries — the ordinary transient path | kept |
| Upload gets a 401 | drain pauses, retry budget untouched | kept |
| Upload refused by the server (400, 413) | parked as `failed` with the server's message | kept |
| Local file missing at upload time | parked as `failed`, code `photo_missing`; **no photo-less return is sent** | — |
| Id could not be written back (step 4) | the upload is discarded (`DELETE /api/attachments/:id`, best-effort), the return is **not** posted, the row retries | kept |
| Return fails on network / timeout / 5xx | backs off; the retry re-sends the same body and key, no second upload | kept |
| Return answers 409 `attachment_unavailable` | stored `attachmentIds` cleared, ordinary backoff, next attempt re-uploads from the file. **Not** a conflict | kept |
| Return answers any other 409 / 403 / 404 | recorded as a conflict, exactly as before | kept |
| Return answers 400 (`photo_required`, validation) | parked as `failed` | kept |
| Return accepted | `synced` | **deleted** |

`attachment_unavailable` is the server saying the staged upload is gone — it
sweeps unused ones after 14 days — and it says so before moving any stock and
without keeping the idempotency key. That is not something a person can
resolve, so it is the one 409 that is not raised as a conflict. It is still
bounded: it spends the same retry budget as a network failure, so a server that
keeps answering it parks the row rather than looping. A row with a stale id and
**no** `localPhoto` has nothing to re-upload from and is a conflict like any
other.

**The file is deleted in exactly one place**: after `markSynced`. Never on a
failure, because until the server has accepted the return that file is the only
copy of the photo — the same rule the queue row itself lives by.

### Rows queued by an older build

A `stock_movement` with no `localPhoto` passes through the step as the same
object and is sent as one POST, exactly as before. Whether the server still
accepts it is the server's decision: with `RETURN_PHOTO_REQUIRED` on it answers
400 `photo_required` and the row parks as `failed`, which is correct — the
branch has to raise it again with a photo, and the Sync Center row is how they
find out.

### What is not handled

- **A conflict closed with `keep_server`, or a row left parked forever, leaves
  its file behind.** Nothing sweeps `return-photos/`. The files are ~150 KB
  each and a parked return is rare, but it is a leak with no bound. The fix is
  a sweep at boot that deletes any file no unsynced row points at.
- **A photo-less row cannot be given a photo.** Sync Center offers Retry, which
  re-sends the payload as stored; there is no "attach a photo to this queued
  return" action.
- **Compressed sizes are not measured.** `RETURN_PHOTO_TARGET_MAX_BYTES`
  (200 KB) is a budget the picker's single pass is expected to land near at
  1280px and quality 0.7, not one this app enforces: the picker has no
  iterate-to-budget mode, and the only hard line is the 1 MB ceiling. In
  `__DEV__` the utility logs original vs optimised size and the reduction;
  release builds strip `console`.

## Conflicts

A conflict is not "the request failed". It is the server saying **the world moved
while this sat in the queue** — stock sold by another branch, the business day
closed, the record deleted, the operator's permission changed. Retrying cannot
fix any of those, so the operation is stored with both sides of the disagreement
and put in front of a person.

```
detected → classified → stored (both sides) → shown → a person resolves it
```

`api/sync/conflicts.ts` classifies; `sync_conflicts` stores; the Sync
Center's Conflicts tab shows; `api/sync/resolveConflict.ts` applies the
choice.

### The one safety rule

Every send carries `client_operation_id` as its `Idempotency-Key`, and the server
dedupes on it. That gives a hard invariant:

- Re-sending with the **same** key is always safe — the server replays its
  original answer instead of executing again.
- Re-sending with a **new** key bypasses the dedupe and **executes**.

So `resend_as_new` — which mints a fresh id because the payload or business date
was changed by the person resolving it — is offered **only for conflicts where
the operation certainly never landed**. Everything that may have partially
committed is restricted to `retry` (same key) and `keep_server`.
`applyResolution` checks this against the policy rather than trusting its caller,
so a UI bug cannot double-commit a stock return. When in doubt the classifier
answers "may have landed": an operation wrongly assumed dead is a duplicate sale,
one wrongly assumed live is a person checking a screen.

### What is recognised

Every type below is matched against a response the server actually sends; none is
speculative. An unrecognised 409 falls through to `unknown_conflict`, which takes
the cautious branch.

| Type | Source | May have landed |
|---|---|---|
| `stock_changed` | 409 `Stock has changed…` — `/api/orders`, `/api/orders/pos` | no |
| `return_exceeds_stock` | 409 `Return quantity cannot be greater…` — `/api/stock/return` pre-check | no |
| `partially_committed` | 409 from `/api/stock/return` mid-loop, with a `committed` array | **yes** |
| `already_in_flight` | 409 from the idempotency middleware — a stale in-progress claim | **yes** |
| `duplicate_operation` | 422 `This Idempotency-Key was already used…` | no |
| `business_day_closed` | 403 from `assertBusinessDayOpen` | no |
| `permission_changed` | 403 otherwise | no |
| `record_deleted` | 404 | no |
| `already_modified` | 409 status-transition refusals (already reviewed / submitted) | **yes** |
| `price_changed` | detected on **success** — see below | **yes** |
| `unknown_conflict` | any other 409 | **yes** (cautious) |

`partially_committed` is checked **before** the generic stock branch on purpose:
that response also carries shortfall `details`, so a classifier reading those
first would call it an ordinary stock conflict — and ordinary stock conflicts are
cleared for `resend_as_new`, which would move the already-committed products a
second time.

### Resolutions

| Resolution | What it does |
|---|---|
| `retry` | Requeue under the **same** operation id. Safe by construction |
| `resend_as_new` | Mint a new UUIDv7, update the queue row **and** the domain row in one transaction, requeue. Gated on the rule above |
| `keep_server` | Close the local row as `superseded`. Never deletes it |

`keep_server` is available for every conflict type — the server is authoritative
for money and stock, so accepting its version is always a way out. The conflict
record stores which choice was made, and `resend_as_new` stores the id it was
reissued as, so the two records stay linked for reconciliation.

### Price drift: the conflict with no error

The one conflict detected on a **successful** response. The server prices a
queued sale at commit time rather than from the business date it carries (see
**Known defect** below), so an offline sale that syncs after a price change is
booked at the new price while the customer paid the old one. The request
succeeds, which is exactly why nothing else catches it.

The drain compares the payload's `grandTotal` against the server's and records a
`price_changed` conflict on a mismatch. **The sale stands** — the server is
authoritative for money. What this buys is that the discrepancy reaches
reconciliation instead of surfacing weeks later as an unexplained variance.

Because that operation's queue row is `synced`, the queue's own attention count
misses it. `countUnresolvedNotInQueue()` adds exactly the conflicts no queue row
is already reporting, so it is counted once and never twice.

---

## Not yet built

- **Editing a payload to clear a conflict.** `resend_as_new` carries an edited
  payload when given one, and the Sync Center uses it for the one edit it can
  make unambiguously — re-dating a closed-day conflict to the current business
  day. Correcting quantities to clear a stock conflict needs the original entry
  form, which is not wired to the conflict card; the button is not shown for
  those rather than shipped as a no-op that fails again.
- Reference-data mirroring into `local_products` / `local_categories` /
  `local_stock`, so catalogue reads work fully offline. The tables exist; nothing
  populates them yet.

## Known defect: a queued sale is priced at drain time, not at sale time

**This is a server bug with a money consequence, recorded here because the
symptom appears offline and looks like a sync problem.**

A sale rung up offline carries the business date it was made on. The queue row
stores it, `api/sync/endpoints.ts` merges it into the payload as
`businessDate`, the server accepts it, and `resolveClientBusinessDate` bounds it.
All of that works, and `syncManager.test.ts` pins it.

What the server then does with it is the problem. In `orders.routes.ts`,
`buildOrderItems(items)` selects `products.price` — the price **live at the
moment of commit** — and is never passed the business date resolved two lines
above it. So:

```
Monday   09:40  sale rung up offline, 12 × Milk Rusk @ 100 = 1200
Tuesday  00:00  price changes to 120
Wednesday       device reconnects, queue drains
                → committed as 12 × 120 = 1440
```

The customer paid 1200. The books say 1440, and the till was never short — the
discrepancy is invisible at the counter and only shows up in reconciliation.

The exposure is however long a row can sit in the queue: a shift offline, a
backoff sequence, or a parked row waiting on a person.

### Why it cannot be fixed here

`OrderItemSchema` accepts `productId`, `qty` and `discount`. There is no
`unitPrice`, so the device cannot send the price it charged — and it should not
be trusted with one if it could. Money is the server's to decide.

### The fix

Server-side: pass the resolved `businessDate` into `buildOrderItems` and resolve
each unit price from `product_price_history` as of that date, falling back to
`products.price` only when no history row precedes it. The table, its
`effective_date` and the activation job already exist — see
`price.service.ts`. It affects `POST /api/orders/pos` and every other caller of
`buildOrderItems`.

Until that ships, treat any sale that synced across a price change as suspect —
but they are no longer silent. The drain compares the payload's `grandTotal`
against the server's on every accepted sale and records a `price_changed`
conflict when they differ, so an affected sale names itself in the Sync Center
instead of turning up as an unexplained variance at reconciliation. Detection is
not a fix: the sale is still committed at the server's total, because money is
the server's to decide.

---

## Known defect: no geofence position is ever sent, and the conflict it raises is mislabelled

**Latent.** It does nothing today and stops every guarded write from this app on
the day an admin turns geofencing on. Recorded here because the symptom is a
queue full of conflicts, which reads as a sync problem and is not one.

Three write endpoints on the server are wrapped in
`requireInsideGeofence(action)` — `POST /api/stock/return` (`stock.return`),
`sale.create` and `order.create`. It is mounted per route rather than globally
and only ever guards writes, so reads are unaffected: a manager stuck in traffic
can still open reports and read stock.

The middleware takes the caller's position from the **`X-Geo-Position`** header
(`GEO_POSITION_HEADER`, `shared/utils/geo.ts`). **This app never sets it.**
`src/shared/utils/geo.ts` is mirrored here — the header name, the encoder and
`evaluateGeofence` itself — and nothing in `src/api/` references any of it.

With the feature on and the branch configured, `evaluateGeofence` reaches

```
if (!isValidGeoPoint(position)) return deny('no_position');
```

and the middleware answers **403**. `geofencing_enabled` defaults to `false`
(`20260802000048_branch_geofencing.sql`), which is the only reason writes work
today.

### What the queue does with it, which is mostly right

A 403 is a **conflict**, not a `failed` row — see *Failure classification*. The
row parks as `conflict`, both sides are recorded in `sync_conflicts`, and it
surfaces in the Sync Center rather than dying quietly. `classifyConflict` sends
it to `permission_changed`, whose `mayHaveLanded: false` is **correct**: the
middleware runs before the route handler, so nothing was written and there is
nothing to double-post. The transaction is still on the device.

So the queue's safety properties hold. What fails is the explanation.

### Why it is worse than a plain refusal

`permission_changed` says *"Your role or branch changed after this was entered,
and the server will not accept it from this account."* None of that is true — a
branch manager standing in their own shop is told their permissions changed, and
sent to an admin who will find nothing wrong with the account.

The policy then offers `retry`, which is the right resolution for a real
geofence denial (walk back inside and send again) and is unreachable here: the
app cannot produce a position at any point, so every retry returns the same 403.
That is an invitation to keep tapping a button that cannot work, which is worse
than a refusal that says so.

The server's own wording does not rescue it either. `geofenceMessage` for
`no_position` reads *"Allow location access for this site and try again"* —
written for the browser, and pointing at a permission prompt this app never
raises.

### The fix

Client-side, and it is not a patch:

1. A location permission and a library to read a fix.
2. Capture at **send** time, in the API client's interceptor — never stored on
   the queue row. This is the same rule the `Authorization` header already
   follows and for a sharper reason: a fix written when the row was created is
   stale against the server's `geofenceMaxPositionAgeSec` by the time an
   overnight retry drains, and `evaluateGeofence` denies `'stale'` as firmly as
   it denies `'no_position'`.
3. A decision, before any of the above, about what an offline write does when no
   fix is available — the case the queue exists for is a basement shop, which is
   also where GPS is worst.

Two things are worth doing whether or not that ships. `classifyConflict` can
recognise a geofence 403 by its `geofence` response body, which carries
`outcome`, `distanceKm` and `radiusKm`, and name it as its own conflict type
instead of borrowing `permission_changed`'s wording. And a `no_position` verdict
should not offer `retry` from this app until the app can send one.
