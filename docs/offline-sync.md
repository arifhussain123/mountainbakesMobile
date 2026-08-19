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
      conflict             409
      blocked              a prerequisite has not synced yet
```

`claimReady()` excludes any row whose `depends_on` has not reached `synced` —
never send a dependent before its prerequisite exists. Ordering is `priority`
then `created_at`; priority defaults per entity (orders 10 → production orders 20
→ sales 30 → expenses 40 → stock 50).

**Nothing is ever deleted on failure.** A `failed` or `conflict` row is still the
only copy of a transaction the server never accepted. Only `synced` rows are
pruned, after 7 days.

---

## Failure classification

The classification *is* the engine:

| Outcome | Handling |
|---|---|
| network / timeout / 5xx | Back off, stay `pending`, retry |
| **401** | **Pause the entire drain.** Do not consume the row's retry budget — an expired token is not the transaction's fault |
| 409 | Record a conflict; surface it to a human |
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

---

## Not yet built

- Conflict **resolution** UI. Conflicts are detected, stored and listed; choosing
  between local and server values is not implemented.
- The `sync_conflicts` table (migration 003) is created but not yet written to —
  conflicts currently live as `conflict`-status queue rows.
- Reference-data mirroring into `local_products` / `local_categories` /
  `local_stock`, so catalogue reads work fully offline. The tables exist; nothing
  populates them yet.
