# The local SQLite database

What is stored on the device, what deliberately is not, and why. The sync
mechanics that read these tables are in `docs/offline-sync.md`.

Migrations live in `database/migrations/index.ts`, are versioned with SQLite's
own `PRAGMA user_version`, and are **append-only, forward-only and never
destructive**. An app update must not drop a table holding unsynced work, and
editing a shipped migration silently diverges the schema on every device that
already ran it.

## The proposed table list, evaluated

The brief listed fourteen candidate tables and said not to create them blindly.
Mapped against the server's real schema and against what this app actually does:

| Proposed | Verdict |
|---|---|
| `local_products` | **Exists.** Mirrors `products` for offline catalogue reads. |
| `local_categories` | **Exists.** Mirrors `categories`. |
| `local_orders` | **Rejected — no producer.** See below. |
| `local_order_items` | **Rejected.** Items live in `payload`; see below. |
| `local_sales` | **Exists.** Device-originated POS sales. |
| `local_sale_items` | **Rejected.** Items live in `payload`. |
| `local_stock` | **Exists.** Cached balances, advisory only. |
| `local_stock_movements` | **Added (migration 4).** It was a real hole. |
| `local_expenses` | **Exists.** |
| `local_production_orders` | **Exists.** Branch demands on central production. |
| `local_production_items` | **Rejected.** Items live in `payload`. |
| `sync_queue` | **Exists.** |
| `sync_conflicts` | **Exists, and is written to (migration 6).** Both sides of every disagreement with the server; never pruned. |
| `app_metadata` | **Exists.** Key/value bookkeeping. |

Plus one the list did not mention and the app needs: **`local_branches`**, which
already exists — a branch name has to render offline, and only the server knows
it.

### Why `local_stock_movements` was added

`writeOffline()` pairs a domain row with a queue row in **one transaction**,
precisely so neither can exist alone: a queue row with no domain row is a
transaction the app cannot show anyone, and a domain row with no queue row never
syncs.

`DOMAIN_TABLE` covered `sale`, `expense` and `production_order`. A branch return
— now a real screen — landed in `sync_queue` and nowhere else. Two consequences,
both real: "what did we hand back today" had no answer while offline, and the
record disappeared entirely once the queue row was pruned after a successful
sync.

`movement_type` is on the table because the queue entity is broader than the one
endpoint it maps to today. Every row is currently a `return`
(`POST /api/stock/return`); an adjustment would be another value, when the server
grows an endpoint for one — see `docs/screen-patterns.md` on why it has not.

### Why no `local_orders` / `local_order_items`

The `order` queue entity exists and points at `POST /api/orders`, and **nothing
in this app writes it**. A branch's "orders" are production demands
(`local_production_orders`); customer orders are raised on the web client. A
table now would be a schema commitment — permanent, since migrations are
append-only — to a shape nobody has designed against.

### Why no `*_items` tables

Line items live in the domain row's `payload`, which is **byte-for-byte the body
that gets POSTed**. There is no assembly step at send time, so the stored row and
the sent request cannot disagree — a class of bug that currently cannot exist.

Splitting items into rows buys exactly one thing: the ability to *query* them
offline ("today's top products with no signal"). Nothing does that today. When
something needs to, the items table is a migration, and the payload stays the
thing that is sent.

## The sync queue

Every offline mutation writes a queue row, in the **same transaction** as its
domain row. `writeOffline()` is the only way in, and there is no `if (isOnline)`
branch at submit time — branching would make the offline path the
rarely-exercised one, and that is the path staff in a basement shop actually use.

### The proposed columns, mapped

| Proposed | Actual | Note |
|---|---|---|
| `id` | `id` | autoincrement |
| `operation_id` | `client_operation_id` | renamed on purpose — see below |
| `entity_type` | `entity` | |
| `entity_id` | `entity_local_id` | the local row, not a server id it does not have yet |
| `operation` | `action` | `create` \| `update` |
| `payload` | `payload` | the exact JSON body that gets POSTed |
| `created_at` | `created_at` | |
| `attempt_count` | `attempt_count` | |
| `last_attempt_at` | **added, migration 5** | was genuinely missing |
| `status` | `status` | |
| `error_message` | `last_error_message` | plus `last_error_code`, which is what retry branches on |
| `priority` | `priority` | |

Three columns the proposal did not have, and each earns its place:

- **`business_date`** — captured on the device at creation. The server stamps the
  business day on receipt, so a sale rung up at 21:00 and drained at 07:00 would
  otherwise land on a day that has already closed.
- **`depends_on`** — a sale can depend on the order it belongs to. Without it the
  drain would send them in the wrong order and burn a retry budget on a request
  that cannot succeed yet.
- **`next_attempt_at`** — when the row may next be picked up, which is what the
  backoff needs. Distinct from `last_attempt_at`, which is when it was last
  tried; the drain reads the first, a human reads the second.

### Why `last_attempt_at` was added

`updated_at` moves on every transition — a manual retry reset, a conflict being
resolved — so it cannot answer "how long has this been stuck". The Sync Center
was showing a person *"3 attempts · Not enough stock"* with no way to tell
whether that was five minutes or three days ago, which is most of what decides
whether to act. It is stamped in `markSyncing`, where the attempt actually
happens, and it is nullable with no backfill: rows queued before the migration
have no recorded attempt time, and inventing one from `updated_at` would put a
precise-looking wrong number in front of the person triaging.

### Statuses

`pending · syncing · synced · failed · conflict` — the five proposed — **plus
two**.

**`blocked`**, for a row whose `depends_on` has not synced yet. It is skipped by
the drain rather than attempted and failed.

**`superseded`**, the terminal state of resolving a conflict in the server's
favour. Not `synced`, because the transaction never reached the server; not
`failed`, because nothing is outstanding and it must stop asking for attention.
It is never counted as unsynced and never pruned — the operator's entry is the
only record of what was actually rung up.

The distinction that matters most is between the ones that clear themselves and
the ones that do not. `pending`, `syncing` and `blocked` are work in flight;
`failed` and `conflict` are the server's judgement and never clear by waiting.
`resolveWriteOutcome` reads exactly that difference so a screen can say *refused*
rather than *on its way* — see `docs/screen-patterns.md`.

### The idempotency key

`client_operation_id` — a **UUIDv7 minted when the transaction is created**, not
when it is sent. The name is deliberate: it says where it came from. One value
serves as

- the domain row's primary key,
- `sync_queue.client_operation_id` (`NOT NULL UNIQUE`),
- and the `Idempotency-Key` header on **every** send attempt.

**It is never regenerated on retry.** That is precisely how a request the server
already processed becomes a second sale. The server honours the header on the
five offline-capable writes (its migration 84) and replays the original response
on a repeat.

`syncQueueContract.test.ts` asserts the schema carries it as `NOT NULL UNIQUE`,
that the drain's columns and indexes exist, and that the status union is exactly
the six.

## Money is TEXT, on purpose

`numeric(14,2)` arrives from PostgREST as a **string**, and every money column
here is `TEXT` so the exact decimal survives the round trip. Binding a float
would reintroduce the drift that server migration `20260719000001` removed by
moving off floats.

## What "essential operations offline" actually requires

Writes are covered: a sale, an expense, a production demand and a stock return
all go through `writeOffline()`, are durable in SQLite before anything is sent,
and carry a `client_operation_id` from creation.

**Reads are the weaker half.** `local_products`, `local_categories`,
`local_branches` and `local_stock` exist for exactly this, and
`referenceRepository.ts` can now save and read all four — but **nothing calls it
yet**, and TanStack Query has no persister configured despite a comment in
`queryClient.ts` referring to "the persisted cache". `gcTime: 24h` keeps data in
memory for a running process; it does not survive a cold start.

So today: a phone that has been online during the session can sell offline. A
phone restarted offline opens on an empty catalogue and cannot ring anything up.
Closing that is one wiring pass — each reference query writes through on success
and falls back to the mirror on a network failure — and it is the highest-value
piece of offline work left.

Two things it should pick up on the way:

- **`AppSettings`.** `useCatalogSettings` defaults tax to **off** when settings
  have not loaded. Offline after a cold start, that silently changes every cart
  total until the server recomputes it. It is a single JSON blob, so it belongs
  in `app_metadata` rather than a table of its own.
- **A staleness marker.** `referenceRepository` already returns `syncedAt` with
  every read. A catalogue from three days ago should say so — `MBHeader`'s
  `dataAsOf` is the slot.
