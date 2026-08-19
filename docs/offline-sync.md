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
→ sales 30 → expenses 40 → stock 50).

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

## Conflicts

A conflict is not "the request failed". It is the server saying **the world moved
while this sat in the queue** — stock sold by another branch, the business day
closed, the record deleted, the operator's permission changed. Retrying cannot
fix any of those, so the operation is stored with both sides of the disagreement
and put in front of a person.

```
detected → classified → stored (both sides) → shown → a person resolves it
```

`services/sync/conflicts.ts` classifies; `sync_conflicts` stores; the Sync
Center's Conflicts tab shows; `services/sync/resolveConflict.ts` applies the
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
stores it, `services/sync/endpoints.ts` merges it into the payload as
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
