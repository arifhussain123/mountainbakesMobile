# Screen patterns

What a screen in this app is made of, and the rules that stop four screens
becoming four designs. Navigation structure — tabs, More, the drawer,
header chrome — is in `docs/navigation.md`.

## Dashboard

```
header (title · branch · sync pill)
period chips
─────────────── scroll ───────────────
2-column stat grid          ← the day's position, read in one glance
quick actions               ← the four jobs of a shift
breakdown card
top products / payment methods
```

Money is the largest type on the screen (`type.money`), and nothing shares its
line — the stat tile's glyph sits up beside the label instead.

**Quick actions sit above the breakdown, not below it.** A figure tells an
operator how the day is going; the action row is how the day gets done, and it
is why most people opened the screen at all.

### `MBStatCard`

`label · value · subtitle? · icon? · deltaPct? · onPress?`

Two departures from the brief's prop list, both deliberate:

- **`deltaPct`, not `trend` + `trendDirection`.** One number, and the direction
  is derived from its sign. Two props invite a tile that says `+5%` with a
  down arrow, and there is no version of that which is not a bug.
- **`label`, not `title`.** It is `label` at every existing call site and in the
  accessible name; renaming it buys nothing.

The delta is coloured by direction **and** carries an arrow glyph. Colour alone
is not a signal — `trendUp` / `trendDown` / `trendFlat` are what a colourblind
operator reads. `components.test.tsx` asserts the glyph, not the colour.

The subtitle rides in the tile's accessible name (`"Sales: Rs. 1,250, vs last
week"`) so a screen reader gets the whole tile in one stop rather than a number
and an unattached qualifier.

## Quick actions

Declared in `roleConfig.ts` as `QUICK_ACTIONS`, resolved by `quickActionsFor()`,
rendered by `MBQuickActions`.

**They are accelerators, not a surface.** An action may only point somewhere the
role **already has** — a tab it carries, or a row already in its More list.
`quickActionsFor` drops anything else and `navigationSurface.test.ts` asserts
nothing is ever dropped: a dropped action means the config named a place that
role cannot go, which is a bug in the config rather than a card to hide quietly.

They add no destination; they are a shorter path to one. That is the same
property the drawer now has — it is *derived* from the tabs and the More list
rather than declared beside them — and it is what keeps the number of places a
destination is declared at exactly one, however many places it can be reached
from. See `docs/navigation.md`.

**Only `branch` has a set** — six, in the order a shift uses them: New Sale, New
Order, Orders, Stock, Add Expense, Returns. New Order is among them again because
v5 removed the navigation bar's centre action button, which used to carry it
everywhere and was the reason it was left off this row. The other three role
groups have none, and that is the honest state: nobody has said what an admin's
or a production user's are, and plausible-looking guesses train staff to stop
looking at the row. `MBQuickActions` renders nothing rather than filler.

## FAB

One per screen, maximum, and only for that screen's single dominant create
action. Never a FAB and a header add button — two controls competing to be the
one obvious thing, and staff learn neither.

`MBFab` is on **Expenses**, where it replaced a full-width button sitting in a
band above the list. That band cost a row of content on every screen every day
to hold a control used twice a shift.

**Exactly one "Add expense" control is on screen at any moment**, and which one
depends on state:

| List state | Control |
|---|---|
| loading | FAB |
| error | FAB |
| loaded, empty | the empty state's action — it sits where the eye already is |
| loaded, empty **because of a filter** | FAB — see below |
| loaded, has rows | FAB |

**An empty filter is not an empty list**, and on a filtered screen they are two
states with two sentences. "There are no demands" and "none of your demands is
refused" call for different things: the first is an invitation to create one,
the second is an instruction to change the filter, which is already on screen
above the message. So the filtered-empty state carries **no action** and the FAB
stays where it was — moving the create button into a state the user can leave by
tapping a chip would put it somewhere new every time they browsed.
`BranchDemandsScreen.test.tsx` pins both sentences and the FAB in each.

The FAB stays up while the list is loading on purpose. Recording an expense does
not depend on the list, and making an operator wait for a fetch before they can
log one is how a slip of paper becomes the system of record.

**New Sale and New Order get no FAB**: those screens *are* the create action, and
a FAB on a form is a button that opens the screen you are already on.

**Both Sales screens are lists, and therefore both have one.** The production
counter's is what it has taken today (`GET /api/orders/production-sales`); the
branch's is the day's register (`GET /api/orders` over the business-day bounds).
Each keeps its till behind a modal because there is a real resource to come back
to after a sale. Both follow the Expenses rule exactly: the empty state carries
the instruction while there is nothing to scroll, the FAB takes over once there
is, and only ever one of them is on screen.

*(The branch's Sales tab used to be the POS itself, and this section used to say
so. See `docs/navigation.md` → "Sales is a register".)*

It is also the app's one **disabled** FAB, which `MBFab` gained for it. A counter
sale cannot be queued (see `docs/offline-sync.md`), so with no connection there is
genuinely nothing for a tap to do — and dimming says the counter is shut until
the signal returns, where hiding would leave an operator hunting for a button
that was there five minutes ago. A control the *account* may never use is a
different matter and does not belong on the screen at all.

## Lists

`FlashList` everywhere, card rows, pull-to-refresh, search debounced (~300ms,
`ProductsScreen` has the test), filters as chip rows.

A **ranked list states every figure on every row**, with the ranked one in the
value column and the others on the subline, so switching the ranking *moves* a
number rather than dropping it. `TopProductsScreen` is the case: ranking by units
used to print the count twice — subline and value — and never show what the
product earned, which made "rank 1 by units" and "biggest earner" indistinguishable
on the one screen whose whole job is telling them apart. Totals sit above the
list as the denominator the ranks are read against, and they are labelled with
**what they total** — there, the server's top ten rather than the period, because
nothing says `topProducts` is computed on the same basis as `totalRevenue`.

`MBStatCard` formats its value as **currency by default** (`currency = true`).
That is right on the dashboards it was built for and wrong on a tile counting
units, orders or returns — left off, a count renders as "Rs. 12". Pass
`currency={false}` on every non-money tile; `BranchReturnsScreen.test.tsx`
asserts no `Rs.` reaches a screen whose endpoint returns no money, and it is
what caught this.

A chip may carry a **count** (`FilterChip.count`), and it may do so only on a
row filtering a set the screen already holds. A count beside a filter that
refetches is a promise the screen cannot keep — it is either the previous
answer's figure or a second request, and both go stale the moment the list does.
It is counted over the **whole** set rather than the current result, because the
count says what tapping the chip would show; counting the filtered view leaves
every unselected chip reporting the selected one's number. `0` draws, and is the
point: a filter that would empty the screen is worth knowing about before you
tap it. `BranchDemandsScreen` is the worked example — it fetches the endpoint's
seven-business-day window once and narrows in memory, which is what makes the
counts honest and the chips instant.

"Everywhere" is now literal. Expenses and the Sync Center were mapped
`ScrollView`s, which mounts every row before the first one is on screen — and
both are longest exactly when it hurts most: a month of expenses at a busy
branch, and one row per transaction of a shift worked offline.

**Rows are memoised and take a stable handler**, which is the half that is easy
to miss. `memo` bails out on equal props, and `onPress={() => go(item.id)}` built
inside `renderItem` is a new function for every row on every render — so the
memoisation never fires and a keystroke in the search box re-renders the whole
visible list. Rows take the item plus one handler shared by the list, and bind it
themselves:

```tsx
<UserRow user={item} onOpen={onOpen} />   // not onPress={() => …}
```

**Server-side pagination is not implemented, and cannot be from here.**
`GET /api/orders` takes `status`, `from`, `to` and `branchId` — there is no
`page`, `limit` or `offset`, and the `total` in `{orders, total}` is just the
length of the array it ships. Paging is a server change first
(`mountainbakes-server/src/routes/orders.routes.ts`), then a client one. Adding
`onEndReached` against an endpoint that returns everything would re-render the
same rows and look like it worked.

### The ruled list card

The shape v4 draws more than any other, and now one component:
`MBListCard` + `MBListRow`. Recent orders, the day's transactions, the expense
ledger, the payment breakdown, top sellers, the report index, the settings
groups, the FAQ list — eight screens, one object.

What makes it a component rather than an `MBCard` with children is a **one-step
weight difference**: the rule between two rows is `divider`, which is a shade
lighter than the card's own `border`. Rule the rows with the card's edge colour
and each row reads as its own card — the screen becomes a stack of boxes and the
grouping the card was drawing disappears. `divider` exists for this and is used
nowhere else.

The card also gives up its vertical padding to the rows, so a rule runs the full
width of the *content* and each row owns its own 48dp touch height. The last row
is not ruled; a trailing rule draws a line under the card's bottom padding and
reads as a row that failed to render.

A row is **one accessibility node**, not four. Read out cell by cell a
transaction becomes "#4821, Cash, 4 items, 18,400" as four unrelated
announcements, and the relationship between them — which is the whole row — is
lost. `MBListRow` joins every visible part in reading order.

### Tables

No horizontally scrolling desktop tables anywhere, and none is planned. Every
horizontal `ScrollView` in the app is a chip row — a filter, a period, a business
day — never data.

A desktop table becomes one of five things here, chosen by what the data is:

| Desktop shape | Mobile shape | Where |
|---|---|---|
| Row of columns | **Card** with a flexing label and a right-aligned figure | every list |
| Rows of one object | **Ruled list card** (`MBListCard` / `MBListRow`) | transactions, expenses, the report index |
| Multi-measure row | **Compact data row** (`MBDataRow`), or a wrapping cell strip | Reports, Breakdown |
| Ranked table | **Share list** — label, inline secondary, amount, proportion bar | `MBShareList`: top products, branches, payment methods |
| Headline + working | **Expandable row** — headline always, detail on tap | Stock |
| Reconciling columns | **Ledger table** (`MBLedgerTable`) | the stock ledger, and nothing else yet |
| Full record | **Detail screen** | Product detail, price history, the print docket |

**`MBLedgerTable` is the one genuine table, and the stock ledger is why.**
Everywhere else a repeated record is a card, because the reader is looking for
*one* of them. There they are reading **down a column** — previous balance, what
came in, what sold, what is left — and the only question is whether those
reconcile. Cards put each row's numbers wherever their labels happen to leave
them, which is exactly the layout that makes four numbers impossible to add up by
eye. Every figure is `type.number`, which is tabular, so a column of them does
not jitter as values change.

Two things keep it off a horizontal scroller, which would hide the last column —
and the last column is the balance:

- **The date is a row heading, not a column.** On a table whose rows are days the
  date is not a fifth number competing for width, it is what the row *is*.
  Stacking it buys back a whole column.
- **The money figure sits under its quantity**, not beside it. Ten numbers per
  row on a 360dp screen is not a table anyone reads across.

A missing cell prints an em dash rather than staying blank: "nothing happened"
and "we have no figure" look identical when both are empty, and only one of them
reconciles.

### The hero block

`MBHeroCard` — a deep-brown inverse surface carrying the one figure a screen
exists to produce, with two or three qualifiers under it. v4 draws it on Sales,
Reports, Daily Sales and Sales vs Expenses.

A white tile cannot do that job on a page of white tiles: it would be the same
object as the four cards below it, only larger. Inverting the surface is what
makes it read as *the answer* rather than as the first of several. It is
`secondary` rather than `primary` for the reason in `common/theme/colors.ts` — the ember
is a fill for things you press, and a full-width block painted with it reads as
an enormous button.

Its `stats` are **qualifiers of the headline** — how it splits, how many
transactions made it — capped at four by the layout. Four unrelated numbers that
happen to fit is what `MBStatGrid` is for. The whole block is one accessibility
node, for the same reason a list row is.

### Meters

`MBMeter` — stock against its reorder level, on the stock card.

The **track** matters as much as the fill: a bar drawn as a fill alone tells you
a length, not a proportion, and 8 units is a sliver whether the shelf holds 20 or
200. Three rules, each of which is a wrong statement if inverted:

- **Zero draws nothing**, and one unit draws a visible stub. "Out" and "nearly
  out" must not look the same, and they do if a small fill rounds to sub-pixel.
- **No reorder level draws nothing either.** A bar is a proportion, and with no
  denominator the proportion is unknown rather than small — a stub there says
  "nearly out" about a product nobody has set a level for, which is the one
  reading that would send someone to reorder it.
- **The tone is the caller's and the word is always printed.** The meter has no
  opinion about whether a number is good: 8 units is a crisis for bread and a
  full shelf for wedding cakes. Colour is never the only signal.

The Finance ledger is the clearest case: seven desktop columns (head,
description, voucher, date, debit, credit, balance) become one card — the head
and description flex on the left, the amount and running balance stack on the
right, the voucher and date drop to a meta line. Direction is carried by a glyph
*and* a colour *and* the accessible name, so it survives a monochrome reading.

**Expandable rows exist for the headline/working split, and Stock is why.** Its
card carries a five-cell movement strip — opening, received, sold, returned,
adjusted — that reconciles to the balance. Drawn under every row it roughly
doubled the card height: a phone showed about four products at a time instead of
seven, so finding the one that is out of stock in a 90-line catalogue meant twice
the scrolling. The question the screen is opened for is "what have I got, and
what is about to run out"; *how* the balance got there is a second, rarer
question. The headline is now the tap target and the working is one tap away.

Two things that pattern must get right, both pinned by tests:

- **The open state belongs to the screen, not the card.** FlashList recycles row
  components, so state held inside one travels to whichever item reuses that
  instance. It is a `Set` of product ids at the screen, passed down as a prop.
- **A chevron is not available to a screen reader.** The row carries
  `accessibilityState={{ expanded }}` and a hint that says what a tap will do.

Nothing animates the expansion. The glyph turns from right to down and the rows
appear — the direction *is* the state, so there is no change left for motion to
report, and `docs/motion.md` is clear that motion is feedback rather than
decoration.

## Sheets and modals

`@gorhom/bottom-sheet` is a dependency and **nothing uses it**. Filters are chip
rows, and the three flows the brief wants in sheets — the expense form, the
production review, the print preview — are full-screen `Modal`s today. One of
them is even called `ReviewSheet` inside a `<Modal>`.

Converting them is worth doing and is not a like-for-like swap: a sheet has to
be safe-area aware, scrollable, swipe-to-close, backdrop-dismissible and focus
trapped, and the expense form in particular is a keyboard-heavy form that
behaves differently at half height. That is its own change with its own testing,
not a side effect of this one.

The chip filters are a separate question and the answer may be "leave them": a
sheet that hides three options behind a tap is worse than three visible chips.
Reach for a sheet when a filter set outgrows a row.

Modals are for **confirmation of destructive or financial actions** — and there
is exactly one confirmation in the app today: signing out with unsynced work,
which uses a native `Alert.alert` with `style: 'destructive'` and a `cancel`
button (`useSignOut`). A platform alert gets the destructive colour, the button
order and the default focus right on each OS for free, which is more than a
hand-built dialog would.

When a custom confirmation is built — the first one will be a cancel or a
refund — the rules are: the destructive button is `colors.danger`, it is not the
default focus, and it is not adjacent to Cancel without spacing. A finger
reaching for Cancel must not be able to land on it.

## Reporting the outcome of a write

There is **no success screen**, and the reason is the offline case rather than
effort. A success screen wants an outcome, a reference number, a total and two
next actions. For a queued transaction two of those do not exist: the server
reference is assigned by the server, which by definition has not seen it, and
"View" has nowhere to go until an order detail screen is built. A screen with
two empty slots and a made-up reference is worse than a line of true text.

What ships instead is a banner — one component, `MBWriteOutcome`, for all four
writes (sale, expense, order, stock return). The wording is the part that
matters, and it comes from `writeOutcomeCopy`, a pure function so the rules can
be asserted without rendering:

| Outcome | Title | Detail | Status |
|---|---|---|---|
| server confirmed inside the drain | "Sale completed." / "Expense saved." | — | — |
| queued | **"Saved offline"** | "Your sale is stored on this device and syncs on its own when the connection returns." | "Waiting to sync" |
| refused | "Not accepted" | the server's own words + "waiting in Sync Center — do not ring it up again" | — |

**The offline case gets three lines and the others get one.** A confirmed write
needs no explanation; the thing the person expected to happen happened. A queued
one is the opposite — nothing they can see has changed on the server — so it
answers the three questions someone standing at a counter actually has, in the
order they have them: *what happened* → *is it safe* → *what happens now*. A
bare "Saved offline" reads as a **failure** to a cashier who has never seen it
before, and the recovery from that belief is ringing the sale up again.

The status line is separate from the sentence on purpose: "will sync" is a
promise, and a status is a fact about right now. It appears **only** where the
outcome is genuinely still in motion — a refused write is not waiting for a
connection, it is waiting for a *person*, and calling that "waiting to sync" is
the lie the whole module exists to avoid.

**A queued transaction is never reported as saved, and a refused one is never
reported as queued.** Those are the same defect pointing in opposite directions:
one invites a duplicate, the other guarantees nobody looks at a sale the server
threw away. `MBWriteOutcome.test.tsx` pins both directly;
`ExpensesScreen.test.tsx` and `SalesScreen.test.tsx` assert them through the
rendered screen, including that the success text is *absent* in the queued case.

A screen reader gets **one** announcement, not three: the title carries an
`accessibilityLabel` joining all three lines, and the detail and status are
`accessible={false}`. Stopping on each separately would read a status stripped
of the sentence that gives it meaning.

Build the success screen when there is an order detail screen to send "View" to
and the queued case has something honest to put in the reference slot.

## Typography and money

### The scale

`display · h1 · h2 · h3 · body · bodyStrong · cardTitle · label · caption ·
number · mono · money · moneyLg`

Set to the v6 design. Two faces — Playfair Display for the brand (`display` and
`tagline` only) and Plus Jakarta Sans for everything else — plus IBM Plex Mono
for identifiers, which v6 itself never draws. **All three now ship**, as Android
font resources under `android/app/src/main/res/font/` rather than in
`assets/fonts/`: the asset path resolves only `normal` and `bold`, and this scale
uses 400/600/700/800 as four distinct steps. `npm run fonts:check` holds the
family names in `typography.ts` against the registrations in
`MainApplication.kt`, because a mismatch there falls back to the system sans
silently.

One caveat, and it is the OS: `minSdkVersion` is 24 and React Native only applies
a numeric weight from API 28, so on Android 7.0–8.1 the five weights collapse to
regular and bold. The 400-vs-800 contrast that carries the hierarchy survives;
the finer 500 and 600 steps do not.

Four notes where it departs from the brief's list:

- **`number` is the tabular figure token** — the body face at 15/700 with
  `tabular-nums`. `mono` is a different thing and the split is deliberate: `mono`
  is a **monospace** face for identifiers a person reads character by character
  (order numbers, voucher numbers, operation ids); `number` is for quantities
  that sit in a column and must align.
- **`cardTitle` is 15/800 — the same size as `bodyStrong`, two weights heavier.**
  That pairing is what the list rows are built on: an order number outranks the
  branch and timestamp beside it by weight rather than by size, so the row stays
  one line tall. v4 uses it on every card it draws.
- **No `bodySm`.** `label` (13/700) and `caption` (12/400) already cover the two
  sizes below `body`, and a third would be picked at random.
- **No `button`.** `MBButton` draws `label` at `sm` and `bodyStrong` at `md`; a
  `button` token would have to be two tokens to say the same thing, and an alias
  is the kind of second name that drifts.

**Five weights, not four.** v4 added `extrabold` (800) and sets every heading,
KPI figure and card title there while dropping body copy to 400–600; the gap
between those two is what gives a dense screen its hierarchy. Rendering the
headings at 700 collapses it. The rule that no single *screen* uses more than
three weights still stands.

**A financial value outranks its label.** `MBDetailRow` used to be five
byte-identical local copies, each drawing a 15px label against a 13px figure —
the label outranking the number it was labelling. It is now one component: a
13px muted label against `type.number`.

### `MBMoney`

The only component that renders currency.

`formatCurrency` is still the formatter and is still used directly in two places
where money appears **inside a sentence or an accessible name** — `"Cash sale,
Rs. 1,250"`, `bal Rs. 4,020`. The rule is about the standalone figure a person
reads as an amount; that is what has to be consistent in symbol, grouping and
alignment.

**Representation:** Postgres `numeric(14,2)` — decimal amounts, **not** integer
minor units (migration `20260719000001` moved off floats). PostgREST serialises
`numeric` as a JSON **string**, so `"1250.00"` is normal input and `toNumber`
coerces it. `MBMoney` performs no arithmetic; totals are computed once in
`utils/saleTotals.ts`, mirroring the server's order of operations.

**The symbol is a prop, not something the component fetches.** Reading settings
inside `MBMoney` would put a `useQuery` inside every money figure in the app —
one subscription per list row — and would make a leaf that renders a string
require a `QueryClientProvider` to mount. The screen already holds the settings.

### `estimate` is a fact about this app

`POST /api/orders/pos` **recomputes** subtotal, discount, tax and grand total
from the line items using the server's own tax settings; it does not store the
total the client sent. The device works from cached `AppSettings`, so a stale
`gstEnabled` / `gstRate` produces a counter display that differs from the sale
the server records. `useCatalogSettings` says the same thing from the other
side: tax defaults to OFF before settings load, because "the server recomputes
and returns the authoritative figure either way".

So the cart total carries `estimate`, and nothing else does. A price read off a
product and an expense the operator typed themselves are not estimates, and
marking them would make the word mean nothing by the time it matters.

The other half of the brief's rule — "after confirmation, the server's value
replaces them" — is **not** implemented, and needs plumbing that does not exist:
the drain reports `synced | queued`, not the response body, so nothing carries
the server's grand total back to the screen. Threading it through
`syncManager` is the change; until then the confirmed figure is simply not
displayed, which is better than displaying the device's number as if the server
had agreed to it.

## Selling: picking a product at the till

Six things decide whether a cashier can find a product fast, and the till carries
all six:

| | Where it comes from |
|---|---|
| **Search** | Server-side (`?search=`), debounced 300ms. The list is never pulled into memory to be filtered locally — no endpoint here paginates |
| **Product code** | The same search box. The server matches `name.ilike` **or** `sku.ilike`, and the offline mirror does `name LIKE ? OR sku LIKE ?` — so reading a code off a tray works online and off |
| **Product name** | Row headline |
| **Category filter** | A horizontal chip row, hidden entirely when the tenant has no categories — an "All" chip on its own filters nothing and only costs the list its room |
| **Price** | `MBMoney` on the row |
| **Availability** | Balance and level under the price, from `useStock()` |
| **What is already rung up** | The row's own "N in cart" line, and a warning when N exceeds the balance |

### Availability is advisory, and "unknown" is not "none"

The till used to say nothing about stock, so the first anyone heard of an
overdraw was a 409 parked in Sync Center hours after the customer left. The
balances were already on the device — `useStock()` is branch-scoped server-side
and reads through the SQLite mirror — so this was presentation, not a new
dependency, and it works with no signal.

Two rules it must not break:

- **It never blocks a sale.** The server is the only authority on stock and
  refuses an overdraw with a 409. A stale mirrored balance must not stop a
  cashier selling something that is physically in front of them, so an
  out-of-stock product is still tappable.
- **A balance the device does not have is drawn as nothing at all.** Not `0`,
  not "Out of stock". A phone that has never mirrored stock knows nothing, which
  is not the same as knowing there is none — and getting that wrong would stop a
  cashier selling what is in their hand. `undefined` and `0` are different
  states all the way down to the row.

Wording is a word plus a colour, never a colour alone: "Out of stock", "3 left",
"40 in stock". Thresholds come from `stockLevel()` in `@mb/shared`, the same
helper the API and the web client use, so the three cannot drift.

**The row is loud instead of restrictive**, and that is the compromise the "never
blocks" rule buys. It carries three things a cashier acts on — what is left, how
many of it are already in the cart, and, when the second exceeds the first, that
the sale is over stock ("2 in cart · more than the 1 on record"). Making the
balance a hard ceiling would be the other answer, and it is the wrong one here:
the mirror can be hours old, so it would refuse real sales on a phone that has
been offline through a shift, and a device that has never mirrored stock would
have to be treated as unlimited anyway or the till would lock up entirely. What
the warning buys is that the 409 is **foreseeable at the counter** rather than
arriving hours later as a parked row somebody has to notice.

The row is one accessible element, so anything outside its label is inaudible.
The label is therefore the whole answer — `"Add Milk Rusk, Rs. 100, 3 left,
2 in cart, over stock"`.

### Two stages, and the bar that does not move

v6's screen 07b draws the till as one long sheet: a product dropdown, a quantity
box, an "Add item" pill, then customer, method, cash and totals under it. Adding
three things that way is a chore — pick in a modal, type a quantity, press Add,
repeat — and counter work is tap-driven. So the till is two stages instead:

```
items    search (or category) → tap a product to add → cart lines with qty and discount
payment  recap → method → cash pad → customer → Save sale / Save & share
```

**One tap is one unit.** There is deliberately no quantity step between tapping a
product and the cart: a tap adds one, tapping the same product again increments
that line rather than adding a second (`useCart` keys lines by product), and
quantity and discount are adjusted with the stepper in the cart where the running
total is visible. A quantity prompt per product would put a modal between a
cashier and a queue for the common case, which is one of a thing.

**The cart is the price list's header, not a second screen.** What has just been
rung up sits immediately above what can be, in the same scroll. Payment is a
stage of its own because taking cash needs the room — a keypad-sized field and
the notes that were handed over.

**`SaleSummaryBar` is pinned to both stages**, and that is the point of it: a
cashier working a queue is not reading the screen, they are hitting a position.
The total and the button that moves the sale on never move, and the figure being
charged is never off screen when the button that charges it is pressed. Going
back a stage is the header's arrow and **not** a third control in the bar — a
second way to do exactly what the back arrow does is a button competing with the
platform's own affordance. The cart survives the trip, so a correction costs one
tap out and one back.

The payment stage's recap is therefore **read-only**. A number is fixed where it
was entered; letting it be changed in two places is two places to look when a
total is wrong.

### The discount is a percentage on screen and rupees in the payload

`OrderItemSchema.discount` is a number of rupees — the server knows nothing about
percentages. The line stores **both**: `discount` is the resolved figure that
gets sent, and `discountPct` sits beside it so the percentage can be re-applied
whenever the quantity changes.

That second field is not a convenience. Resolving "10%" once against the gross at
the moment it is typed and then freezing the rupee figure means ringing up a
second unit silently turns it into a 5% discount — the cashier sees the number
they typed and the customer is charged something else, on the screen used most
often. `useCart.setQty` recomputes it; `setDiscount` (a flat amount) clears the
percentage so the next quantity change cannot overwrite what was just typed.

### The cash pad: notes ADD, Exact SETS

Tendering is cumulative — two five-hundreds and a hundred is three taps, not a
sum done in the head and typed in — so each note button adds its value to what is
already received. `Exact` is the opposite operation, which is why it is a
separate key rather than another note: it means "the customer gave the amount",
a *replacement*, and it is the commonest single case at a counter.

**An empty field is not a short payment.** Blank means the tender was not
recorded, which is a normal thing to skip; the key is then omitted from the
payload entirely and the server does not ask. Only an amount that has been
entered and does not cover the total is short — that shows **Still due** and
disables both finishes, because a sale saved with money missing is a till that
will not reconcile at close and nobody will know which sale it was.

Two numbers, never one signed one: "Cash returned 752" and "Still due 250" are
different sentences at a counter, and a negative change figure makes the cashier
do the sign in their head while somebody waits.

### Save & share, because nothing here prints

v6's footer says Save sale / Save & print. **There is no printing in this app.**
`react-native-print` is unusable — its `react-native-windows` peer is mandatory
and pins RN 0.84.1 — and rendering a real PDF belongs on the server, which
already depends on `pdfkit` and has no endpoint for it. `OrderPrintPreview`
reached the same wall for the production slip and settled on `Share.share` with
plain text, so the till does the same and there is one story about printing in
this app rather than two.

The slip refuses to pretend twice over:

- **It has no sale number.** The write path returns this device's
  `client_operation_id` and an outcome, not the server's order id — and a queued
  sale genuinely does not have one yet. A reference invented here is one a
  customer would quote back at a counter that has never heard of it.
- **Its figures are the till's.** `POST /api/orders/pos` recomputes every total
  from the line items with the server's own tax settings, and the device is
  working from cached `AppSettings`. Same `estimate` rule as the summary bar,
  carried through to the one artefact that leaves the device.

**A refused sale never reaches the slip.** It is parked in Sync Center waiting
for a person, and a receipt for it is how a customer walks out holding proof of a
sale the business has no record of. That case leaves exactly as Save does, so the
refusal is read on the register with everything that follows from it.

### Payment method is `MBSelect`, not a bespoke picker

v6 draws a 2×2 grid of tiles. `MBSelect` is a wrapping row of chips over a short
fixed enum, which lands two-up on a phone and is the same control — and its own
file names the payment method on the sale form as one of the two duplicates it
was extracted to stop. The labels come from `PAYMENT_METHOD_LABEL` in
`common/constants/`, which replaced three spellings of the same four constants:
the register had one map, the production counter a lower-case variant, and the
till rendered the raw enum with `bank_account`'s underscore showing.

`staff` cannot appear at a branch till: `PAYMENT_METHOD_VALUES` does not contain
it, which is what makes both `/api/orders/pos` and this screen reject an unpaid
hand-out with no extra check.

### One till, two counters

Everything above is `common/till/`, and the production counter
(`ProductionSalesScreen`) draws from the same set. That promotion is the folder
rule — code a second feature needs moves to `common/` — but the reason it was
worth doing is what the two had already drifted into while they were copies. The
counter's cart line had **no typed quantity field** and **no way to remove a
line**, it spelled the four payment methods in lower case where the register used
Title Case, and it carried the same frozen-percentage discount bug. None of that
was a decision; it was two files that stopped being the same file.

What is genuinely each till's own stays in its own feature, in a hook:

| | Branch (`useNewSale`) | Production counter (`useCounterSale`) |
|---|---|---|
| Endpoint | `POST /api/orders/pos` | `POST /api/orders/production-sale` |
| Offline | **Offline-first** — `writeOffline`, three outcomes | **Live, never queued** — no `idempotent()`, no `businessDate` |
| Branch | Sent, from JWT claims | Never sent; server pins the sentinel branch |
| Methods | Four | Five — `staff` takes no money and needs a comment |
| Balance | Branch stock, "40 in stock" | Central pool, "40 in pool" |
| Reports to | The register, by navigating with the outcome | A banner on its own list |
| Slip figures | The till's own | **The server's** |

That last row is the one asymmetry worth naming. The counter posts live and is
answered with the server's own subtotal, discount, tax and grand total, so its
slip prints numbers nobody can disagree with and carries a real sale number. The
branch till's write path returns an outcome and nothing else — so even a
**synced** branch sale prints this device's arithmetic over cached
`AppSettings`, which a stale `gstRate` can put at odds with the sale actually
recorded. `SaleSlip.authoritative` is the difference, and it drives both the
`estimate` mark and the closing sentence on the slip. `confirmed` is the
neighbouring flag and means something else: whether the server has the sale at
all.

**Two flags that look alike and are not**, so: `confirmed: false` is a queued
branch sale (no number, nobody upstream can see it); `authoritative: false` is a
sale whose totals this device worked out. A synced branch sale is `confirmed`
and not `authoritative`, which is exactly the case a single flag would get wrong.

One more asymmetry, deliberate: **short cash disables both finishes, a missing
staff comment does not.** The difference is whether the reason is already on
screen. Short cash draws "Still due Rs. 150" in red directly above the buttons,
so a dead button has its explanation attached. A missing comment is an *absence*
— a button that will not press above an empty, optional-looking field reads as
the app being broken — so that one is pressed, refused, and explained at the
field.

### Barcode scanning: no, and not because it is hard

**There is nothing to scan.** No `barcode`, `ean`, `gtin` or `upc` field exists
on the product — not in `@mb/shared/types/product.types.ts`, not in any server
migration. `sku` is an internal code (`MB-001`) and `stockCode` is `STK-######`;
neither is a scannable retail barcode, and bakery lines sold loose or by the tray
do not carry one.

Adding it would mean, in order: a schema change and backfill on the server,
somebody physically labelling the products, and only then a native camera
dependency, a runtime permission, and the APK weight that comes with an ML
barcode reader. The first two are not client work and the third is worthless
without them.

The search box already accepts the product code, which is the part of scanning
that actually pays — so the workflow is served today. Revisit if the business
starts printing barcodes.

## Reports

### Two filter rows, and they cost different things

```
Today · Yesterday · 7 days · This month · Custom     ← changes the question (a request)
All branches · Saddar · Gulberg · …                  ← changes the question (a request)
─────────────────────────────────────────────────
Branch · Product · Payment · Category                ← changes the view (free)
```

The top two rows are sent to the server. The third is not: `/api/reports/summary`
returns **all four rollups in the one response** — `branchData`, `topProducts`,
`paymentMethodBreakdown`, `categoryBreakdown` — so switching between them is a
re-render, not a round trip.

Keeping that split visible in the layout is the point. Drawn as one
undifferentiated wall of chips every tap looks equally expensive, and the ones
that are actually free stop being used. The range row sits at the top in
`primary`; the branch and dimension rows are `accent`, the same call Products
makes where categories sit above statuses.

### One range vocabulary, one control

`MBRangeFilter` is the chip row, and the dashboard and Reports both use it.
They did not: the dashboard had these chips and Reports had four hand-rolled
ones carrying raw `ReportPeriod` values, so **"Week" on one screen and "7 days"
on the other were different windows** — `weekly` is the calendar week to date,
seven days is the last seven — and a manager moving between the two had no way
to know. Forty lines of identical chip markup existed twice, which is the state
`MBFilterChips` was extracted to stop.

It is not `MBFilterChips` because the Custom chip does two things a filter chip
does not: it **relabels itself** with the chosen window (`1 Aug – 19 Aug`), so
the current range is readable without opening anything, and it reveals a date
field beneath the row.

`resolveRange()` in `utils/dashboardRange.ts` owns the translation, and it
exists because the server takes a **named period or an explicit `from`/`to`,
never both** — `getDateRange()` in `reports.routes.ts` ignores the range whenever
the period is one of its four names. Screens hold a chip key; only that helper
turns one into a request. Sending `{period: 'daily', from, to}` is not a stricter
question, it is silently a different one.

### Branch is a filter for an admin and nothing at all for a manager

A branch manager is pinned to their own branch **by the server**, off the JWT,
and must not send `branchId` — so they get no branch row, no branch list fetched
(`useBranches({enabled})`), and no **Branch** dimension either: it would be one
bar, always, naming the shop they are standing in.

For an admin, `branchId` is part of the query key. One session scopes to Saddar
and then Gulberg inside the same minute, and without it in the key the second
chip is served the first shop's takings.

### Category had to be built, not derived

`topProducts` carries a `categoryName` and is capped at **ten**. Folding it into
categories on the device would report a slice of each category's revenue under
the category's own name — a wrong number that reads exactly like a right one,
on a screen whose figures get written down. This app computes no financial truth
of its own, so the fix went where the missing endpoint was: `categoryBreakdown`
is now computed server-side over every line in range.

It is **optional** in `ReportSummary`, because the app ships on its own cycle and
a handset can be newer than the API it is talking to. Absent is reported as *this
server does not report category totals yet*, never as an empty list — "no
categories sold" and "your server is older than your phone" are opposite facts
and only one of them is about the bakery.

### Nothing loads a large dataset, and that is arranged rather than lucky

- The endpoint returns **aggregates, never orders**. A month of sales and a day
  of sales differ by a few kilobytes.
- **One breakdown is mounted at a time.** All four arrive together; four bar
  lists stacked in a `ScrollView` would mount every row of all four before the
  first is on screen.
- The daily rows are capped at fourteen **and the cap is stated** — *Latest 14 of
  31 days · export for the full range*. The chart takes the same slice, so the
  picture and the figures under it always describe the same days. A silent
  `.slice(-14)` on a custom quarter is a screen that looks like a complete answer
  to a question nobody asked.
- **There is no Year chip.** The summary route pulls every order in range *with
  its line items* into the dyno and aggregates in Node, uncapped and unpaginated
  — a year is the one range here big enough to matter, and Custom covers whoever
  truly needs it.

### Sales vs Expenses: calendar periods, and a bucket that has not happened

The screen answers "how is this month going", so the periods are the ones a
manager says out loud: **Week** is Monday to Sunday, **Month** is the calendar
month in seven-day slices from the 1st, **Quarter** is three months bucketed by
month. That also matches the server's own vocabulary — `businessRange` in
`@mb/shared` is calendar-aligned in exactly the same way — which is what lets the
export send `period=weekly|monthly` instead of a custom span, so three downloads
in a folder are distinguishable.

`comparisonPeriods.ts` is the whole calendar and is deliberately pure: the bar
scale, the totals, the averages and every "was 24%" are derived from it, so an
off-by-one there is a wrong number on every card at once. It is tested without a
renderer for that reason.

**A bucket you have not reached is not a zero.** On the 8th of November a quarter
holds October, November, and December still to come. Drawn as a zero, and
averaged over, an ordinary quarter reads as a collapse in trade — and it is the
sort of wrong that gets screenshotted. So `ColumnGroup.future` draws a hairline
track on the `border` token with a dimmed label, and the caller excludes those
buckets from every total and average. Both halves are required: the chart telling
the truth while the cards above it do not is worse than either alone.

Three states, not two, and the chart already had the first pair: a **zero** draws
a two-pixel stub in the series colour ("closed, and we measured it"), **absent**
is off the end of the data, and **future** is the hairline. A day with no row is
absent from `dailyData` rather than zero-valued — the server merges order-days
with expense-days and lists nothing for a day that had neither — so a quiet
Tuesday and a Tuesday that has not happened are the same absence in the data and
are told apart only by the calendar. That is why the bucket carries the flag
rather than the summing function trying to infer it.

#### The comparison is truncated, or it lies once a month

"Was 24%" needs a previous period, which is a second request — the response
carries no comparison. That previous window is bounded to **the same number of
elapsed days**: five days of November against the 1st–5th of October, never
against the whole of it. Untruncated, this screen reports a 70% collapse on the
8th of every month, on the one screen a manager opens to find out whether
something is wrong. Ratios would survive the untruncated version and totals would
not, so both come from the same bounded window rather than two — one range means
two figures on a card cannot be describing different spans.

The caption says which: `vs the same 5 days last month` while the period is
running, `vs last month` once it is over. Margin is compared in **percentage
points** (24 → 26 is "up two points"), not as a percentage change, which would be
the true-but-useless "8% up".

#### Rising expenses and rising sales are not the same news

`SeriesCards` inverts the colour logic for the expenses card: the same arrow
glyph means the opposite thing, so up is red there and green on sales. Colouring
both by direction alone paints a month where spending jumped 40% the same green
as one where takings did — not a subtle misreading, the wrong answer to "how are
we doing". Colour is never the only carrier: the sign is in the text and the
accessible name says which way it went in words.

The two cards carry the series swatches, read from `theme.colors.series[0]` and
`[1]` — the same two the chart fills its columns with. That is what lets the
chart go without a legend of its own, and it is why there is no separate series
palette: `colors.series` **is** it. A hex at a call site would be right in one
colour scheme, which is what `npm run theme:check` exists to stop, and would
bypass the ramp's asserted separation in `contrast.test.ts`.

#### Net is a subtraction, and the ratio is the actionable half

`NetCard` puts both operands under the figure as supporting stats, so the
arithmetic can be checked against the two cards above rather than believed.
Deriving net here is **not** a second definition of profit: the server's
`totalProfit` is literally `totalRevenue - totalExpenses`, so the subtraction is
its definition rather than a rival one.

Alongside the margin it gives **spent per rupee taken**. A margin says how the
month ended up; the ratio says what it cost to get there, in the units the person
setting a budget actually uses. Loss-making buckets are named in a sentence
rather than left in the chart — two bars a few pixels apart is exactly the
comparison the eye gets wrong, and that week is the one thing on the screen that
has to be acted on.

**Empty is a real state.** A period with nothing in it says so rather than
rendering zeroed cards: a margin of no sales is undefined rather than 0%, "Rs.
0.00 spent per rupee" is not a fact, and a chart of flat stubs looks exactly like
a chart of a terrible month.

One reconciliation note survives from the previous build and a second was added.
The **category split** still comes from `GET /api/expenses`, because
`categoryBreakdown` in the summary is sales by *product* category — what was
sold — and would be a wrong number under a heading about spending. And the
bucketed totals are checked against the server's headline figures: `dailyData`
groups on each order's stored `business_date` while the query bounds
`created_at`, so an order written either side of the 02:00 rollover can land a
day outside the window. The cards match the bars, and the screen says so when the
two differ by more than a rupee rather than leaving someone to reconcile them by
hand and conclude the app is wrong.

### The export carries the filters, or it is a wrong number with a paper trail

`useExportReport` takes the same `{period, from, to, branchId}` the screen is
showing. It used to send `period` alone, which was harmless while the only
options were the four named periods and became a defect the moment Custom
arrived: the server ignores `from`/`to` for a named period and uses them for
everything else, so a custom range that did not forward them would export **the
current month** under a file named `custom` while the screen showed the fortnight
the user picked. The file is what gets mailed to head office. It is named for the
window it covers now (`2026-08-01_2026-08-14`), because three files called
`custom` in a downloads folder are indistinguishable.

## Product administration

Super-admin only. Every endpoint behind these screens is `requireRole('super_admin')`
on the server; the app hides the affordances behind the `admin` capability as
convenience, not as a boundary.

```
Products (tab)
├── ProductsList        search · category · status · FAB
├── ProductDetail       the seven fields, and the two administrative acts
├── ProductForm         create / edit          (modal)
├── PriceChange         the versioned endpoint (modal)
└── PriceHistory        the audit trail
```

Create and price-change are **modals** because both are short detours that end by
returning to what you were looking at. Detail and history are **cards** — places
you go, and may move between.

### The rule: a price change must never alter a historical sale

It cannot, and the enforcement is the server's:

1. **`POST /api/orders/pos` snapshots the price.** It reads `products.price` when
   the order is written and stores it on each `order_items` row as `unit_price` /
   `line_total`. Those rows are the record of what was actually charged, and a
   later price change cannot reach them. It is also why ringing up a sale sends
   only `productId`, `qty` and `discount` — never a price. `SalesScreen.test.tsx`
   asserts that.
2. **`PUT /api/products/:id` deletes `price` before it touches the table.** The
   only way to move a price is `POST /api/products/:id/price`, which appends an
   immutable `product_price_history` row through the `apply_price_change`
   Postgres function — version number, effective date, reason, author.

The client mirrors both, so a mistake is a compile error rather than an edit that
silently does nothing:

- `ProductEditPayload` is `Omit<UpdateProductPayload, 'price'>`, and
  `useUpdateProduct` takes only that.
- `ProductFormScreen` renders the price field **only when creating**. A new
  product has no history; an existing one's price is the head of a versioned
  series.
- `productsService.test.ts` asserts an edit carries no `price` key, and that a price
  change goes to the two-segment path and never to `PUT`.

`PriceChangeScreen` also says it in words, on the screen, above the button: *"Sales
and orders already recorded keep the price they were charged at."* An admin typing
a new price is entitled to know whether they are about to rewrite the past.

### Three outcomes, reported as the server gives them

`POST /:id/price` answers `active`, `scheduled` or `skipped`, and the screen
reports which — never a flat "Saved". A future effective date **schedules** the
change for that business date; reporting that as done is how someone walks away
believing today's till has the new price. An unchanged price is `skipped` and
writes no history row.

### Deactivate, don't delete

`DELETE /api/products/:id` exists and this app does not call it. A product that
has ever been sold is referenced by historical order rows; deactivating removes it
from every picker and leaves those rows — and the reports built on them —
untouched. The confirm says so.

### Online-only writes, deliberately

The catalogue is the one place this app does **not** use `writeOffline()`.
Offline-first exists for transactions a shop floor records during a shift, where
the alternative to queueing is losing the record. Editing the catalogue is an
administrative act done from a desk; queueing it would let two admins edit the
same product offline and have the later drain silently win. A failure here is an
error message and a retry.

### Not supported: product images

The brief asks for them "where supported". They are not: there is no image column
on `products`, no upload endpoint, and nothing in the API returns one. Adding a
placeholder that never fills would be a control that lies. `ProductPlaceholder` in
`assets/images` is ready for the day the server grows one.

## Stock

```
Stock (tab)
├── StockList     health · day · category · search · the seven figures per product
└── StockReturn   hand units back to production   (modal, branch roles only)
```

### The seven figures are the server's, not the app's

`GET /api/stock?date=` returns one `StockRow` per product carrying **opening,
newQty (Received), sold, returned, adjustment (Adjusted) and balance (Closing)**,
and the app renders them without recomputing anything. The row reconciles:

```
opening + received − sold − returned + adjustment = closing
```

`adjustment` stays **signed** — the direction is the information, and it is what
makes the identity hold. `opening` is derived as `balance − the day's net
movements`, so it is the balance at the start of that business day rather than a
stored snapshot.

The server also echoes back the date it used, and the subtitle shows *that*
rather than the app's idea of today. The business day rolls at 02:00
Asia/Karachi, so at 01:00 an evening shift and a naive "today" disagree — and the
one that counts is the server's.

### Day filter: seven business days, not a calendar

`Today` is sent as **no date at all**, so the server picks the current business
day itself. The picker stops at seven days back because that is the server's
bound on a queued transaction — beyond it there is nothing a branch can still
act on, only a report to read, and a date picker implying otherwise invites a
hunt for an "edit" that does not exist.

The product filter reads the catalogue rather than the stock rows: a stock row
carries no category, and `useProducts` is a call every other screen already
makes.

### Low stock

`stockLevel()` in `@mb/shared/utils/stock` — the same function the API uses for
validation and notifications, so a branch and the server cannot disagree about
what "low" means. Four bands (`out` / `critical` / `moderate` / `healthy`), and
each row shows **a word as well as a colour**: the level has to be readable
without distinguishing red from green.

The list is filtered by health and **lands on Low**, which is the reason the
screen gets opened during a shift. Low is every band that is not `healthy` —
not a threshold chosen here, but exactly the set the cards already draw a
warning colour and a warning word for. Narrowing it to `critical` would be
worse than arbitrary: `MBStockCard` labels `moderate` "Low", so a Low filter
that dropped it would hide the rows visibly saying Low.

The cost of landing there is that a stock **count** — the other thing this list
is read for — starts one tap away, which is why All sits directly above the list
carrying its own total rather than behind a menu. Both chips carry counts,
measured after category and search (different axes, still applied) and before
health (the axis being counted). "Everything is above the line" is its own empty
state, because a shop with nothing low is not a shop with nothing in it.

Rows are ordered **emptiest shelf first**, sorted stably so two products on the
same balance keep the catalogue order the server sent and the list does not
reshuffle under a thumb as sales move balances.

**There is no per-product reorder point, and that is a server question.** v6's
screen 08 grades each product against its own reorder quantity and says not to
use a global threshold, since turnover differs by an order of magnitude across a
bakery's catalogue. No such field exists on any product type, and the only
grading in the system is the shared one above — which drives the server's own
low-stock notifications. Inventing a per-product threshold on the phone would put
a second, disagreeing definition of "low" in front of the one person who can act
on it: a product marked Low here that the server never warned anyone about.
Getting there needs a column, an admin screen to set it, and `levelOf` moving
into the mirror — in that order, and not from this repo.

**There is no stock-adjust endpoint either.** The stock surface is `GET /stock`,
`GET /stock/audit`, `POST /stock/return`. An adjustment in this system is an
*admin* correction from the Support Center (see `StockRow.adjustment`); the
branch's write against its own shelf is a return, which is the FAB below. An
Adjust control here would be a button that 403s.

### The ledger's closing card states the change in units AND value

`StockDayScreen` reports `balance − opening` as both figures, never one. They
move in opposite directions on ordinary days — a shop selling cheap volume lines
while taking in a delivery of celebration cakes ends with fewer items on the
shelf and more money sitting on it — so either figure alone reports that day as a
clean gain or a clean loss, and both readings are wrong. `signedQty` /
`signedAmount` in `utils/money.ts` are what put the `+` on; they are for a
**change**, never for a balance, where a `+` would imply it was gained today.

Neither figure is toned. Colour here would have to answer "is less stock good?",
and the screen cannot know — selling the shelf down is the point of the shop, so
a red closing change on the best day of the week is an alarm wired to a threshold
nobody set. Same rule `MBStatCard.tone` states for its own tiles: the sign
carries the direction.

**A day where nothing moved is a real state.** The balance carries straight
through, the ledger still draws both ends, and a sentence says which of the two
causes it is — a shut shop, or sales that have not synced. A table of zeroes with
nothing beside it reads as a fetch that went wrong. Tested on the quantities
rather than the amounts: quantity is what moved, and an amount can be zero on a
real movement of a zero-priced line.

### Returns are offline-first, and carry the transaction ID

`POST /api/stock/return` is already a queue entity (`stock_movement`), so the
return goes through `writeOffline()` like every other thing a shift records —
one code path, no `if (isOnline)` at submit.

**The unique transaction ID is the `client_operation_id`**: a UUIDv7 minted when
the return is *created*, reused as the domain row's primary key, the queue row's
id, and the `Idempotency-Key` header on every attempt. The outcome card shows it,
because a queued return has no server reference yet and that is the only
identifier anyone can quote.

The picker is the stock list itself — a branch returning at close of day is
answering "what is left on the shelf", and the quantity is capped at the balance.
Overdrawing is the server's documented failure for this endpoint, and catching it
before submit is the difference between a correction now and one a day later.

**Three outcomes, not two.** This is the write most likely to be refused, so it
uses `resolveWriteOutcome`, which reads the queue row rather than the drain
tally:

| Outcome | What the branch is told |
|---|---|
| `synced` | "Returned to production." |
| `queued` | "Saved offline … **The stock has not moved yet.**" |
| `refused` | The server's own words — they name the products |

A refusal never clears by waiting. Reporting it as queued would leave a branch
believing units are on their way back while the shelf still holds them.

Returning is offered on **today only**, and to **branch roles only** — the server
derives the branch from the caller, so an admin has no branch to return from. The
modal is not registered for other roles rather than registered and hidden.

### Two things the brief asks for that the API cannot do

- **Adjustment.** There is no stock-adjustment endpoint. Adjustments exist —
  `stock_history.type = 'adjustment'`, which is why the column is on the row —
  but they are made through the **Support Center** (`PATCH /api/support/:id/figures`,
  super-admin, attached to a ticket), deliberately: a correction to a branch's
  figures is an audited act with a reason and a reviewer, not a field someone
  edits. Building a free-form adjustment screen here would mean inventing an API
  and routing around that audit trail.
- **Transaction history.** `stock_history` is append-only and complete, and
  **nothing exposes it for reading**. `GET /api/stock/audit` is a different thing
  despite the name — it returns *blocked sale attempts*, sales the server refused
  for insufficient stock. A per-product movement list needs a new server endpoint
  over `stock_history` (branch, product, date range); the client work after that
  is a screen.

## Production orders (branch demands)

### The statuses are the backend's. The proposed ones do not exist.

The brief proposed `Waiting · Reviewed · Prepared · Delivered · Returned ·
Cancelled`. The server has none of those. `BranchProductionOrderStatus` is:

| Value | What it means |
|---|---|
| `pending` | branch submitted, Production has not reviewed |
| `awaiting_verification` | Production sent it out — **no stock has moved yet** |
| `verified` | branch counted what arrived — **stock moves at this step** |
| `approved` | Production's final sign-off; status only |
| `rejected` | Production refused it |
| `cancelled` | the branch withdrew it, before review (migration 73) |

Three of the proposed names describe steps this workflow does not have, and the
one it most needs — `verified` — is missing from them entirely. Stock moves on
the **branch's count**, not on Production's dispatch, so the pool is debited once
for the quantity actually received and branch stock never claims goods nobody
confirmed. `rejected` and `cancelled` are kept apart because only one of them is
a fulfilment failure.

`branchDemandStatuses.test.ts` pins the set by hand, so adding a state fails the
test and sends someone to look at what the server does with it.

### Raising one: v6's screen 20, and why the review survived it

```
New Order → quantities in the table → required date → Submit → Review → Confirm and send
```

The screen is v6's screen 20 and it is three blocks, in this order:

- **The order's own facts, stated not asked** — branch, ordered by, business day,
  Karachi time, and "Order no.: assigned on submit". Every cell comes from the
  session or the clock. `branchId` is never *sent* — the server derives it from
  the token — but the person filing a demand should see whose name it goes under,
  and on a `branch_user` shift account this is the only place the shop is named.
  An order number is deliberately not generated here: the server assigns it, and
  one invented on the device is a second identity for a demand that already has
  `client_operation_id`, shown to someone who would then quote it to Production.
- **The product table** — one card ruled between rows, the shape `MBListCard`
  draws, assembled around a `FlashList` because the catalogue is hundreds of
  rows. Each row is a name over `Category · stock N · Rs. rate`, with the
  quantity stepper as the one fixed column. v6 lays rate and stock out as their
  own columns on a 390pt canvas with a 114pt stepper; this app's stepper is
  `layout.stepperSize` per button, 18pt wider, which at 360dp leaves the product
  name under 90pt — so the two figures join the caption line rather than the name
  being truncated to fit them.
- **The footer** — the required date, the three totals, and Clear / Save draft /
  Submit.

**The required date is in the footer, next to the button it gates.** It is
required server-side and is not defaulted there, because a demand with no
required date is what the field exists to prevent and defaulting it would file a
made-up commitment under the branch's name. It is empty on a fresh screen for the
same reason — a pre-filled delivery date is a commitment nobody chose that
submits without ever being read. Put the field at the top, above a scrolling
catalogue, and a branch that fills a basket and presses Submit gets an error
about a control that is no longer on screen: the error and the fix in two
different places.

**Its message is on the field; everything else is in the footer.** An error under
the box you have to fix is already pointing at it, while a footer alert about a
date sends the reader looking for one. The footer keeps what is about the demand
as a whole — an empty basket, a closed order window, a write that failed.

**Save draft is not a write.** It goes to `app_metadata` on the device (see
`docs/local-database.md`), needs no required date, and must never reach the
queue — a draft that syncs is an order nobody placed. It leaves the form exactly
as it is afterwards, because a draft that cleared the screen would look like a
submit to anyone glancing at it. A stored draft is put back on the next mount
with a line saying nothing was sent, and a submit clears it: otherwise the next
launch offers the same demand to someone to send a second time.

**Clear is confirmed and Submit is not**, which is the right way round. Submit
already goes through the review, where the whole demand is on screen and the
button says what it does. Clear destroys a basket that may be twenty lines built
over ten minutes, with nothing to read afterwards and no undo.

#### The review is a step, not a formality

v6 submits straight from the footer. That works on a mock with eight products;
here **Submit validates and opens the review**, and the request happens on the
confirm. The difference is the list. A cart is short and stays on screen. The
order list is hundreds of rows filtered by a debounced server-side search, so a
branch that sets three quantities under "rusk", searches "cake" and sets two more
has, at the moment it presses the button, **no way to see the demand it is about
to commit**. This write is offline-first and goes to central production. It is
exactly the kind that must not be sent blind.

The review is a full-screen modal over the table rather than a sheet: it is a
screen that happens to arrive over another, and at that size a floating panel is
a screen with wasted edges.

Two consequences fall out of that list:

- **The basket carries the product name and its rate, not just an id.** Once the
  search moves on, a picked product is no longer in `products.data` at all, and a
  review built from the visible rows would silently omit it — nor could the
  amount be worked out for a product the screen can no longer see. Selection
  captures what the rest of the flow needs at the moment it happens.
- **Quantities stay editable on the review.** A review that can only be accepted
  or abandoned sends someone back to hunt for a product in a filtered list to
  change one number, and the fastest correction is the one you can make where
  you noticed the mistake.

Remarks are collected here rather than earlier, and they are **per line, because
the schema puts them there**: `ProductionOrderItemSchema.remarks` is on the item
and there is no order-level field. One shared box used to stamp its text onto
every line, so a note meant for one product ("thin icing") was submitted as an
instruction about all eight — asserting to Production something the branch never
said.

The submit error is rendered in **one** footer at a time — the review's while it
is open, the table's after Back. The review is a modal over a screen that stays
mounted, so rendering it in both would put the same `role="alert"` in the tree
twice and a screen reader would read it twice.

#### Money is shown and not sent

v6 draws a rate on every row and three totals — Selected, Total qty, Total
amount. `CreateProductionOrderSchema` carries none of them: a demand is products,
quantities, remarks and a date. So the figures are the device's own arithmetic
over catalogue prices that may be hours stale, and they are marked
`MBMoney estimate` because that is exactly what they are — there to let a branch
sanity-check the size of what it is asking for, not to be quoted. Putting a rate
in the payload would send a key Zod strips silently, which is worse than not
sending it: it reads like it works.

The totals are set in `accent`, not in the orange v6 uses. That orange is this
app's `primary`, which is a **fill** and never carries type — 3.04:1 on a card,
against the 4.5:1 a figure someone acts on needs. `accent` is the mark, and it is
the brand colour that is actually readable.

Two things v6 draws that are deliberately absent for the same reason: the
masthead's **Return items** and **Discount** pills. Neither is a field on a
production order in this app's mirrored schema, and a toggle that changes nothing
is worse than no toggle. (The server tree has since grown branch discount claims
— its migration 92 and `discount.schemas.ts` — which `src/shared/` here has not
mirrored yet. That is where the pill becomes real, and it is a schema change
first.) Special (one-off, free-text) items and packing materials *are* in the
schema and are simply not built here yet.

The order window is checked **before anything is written**. The server refuses a
late demand either way, but queued, that refusal arrives hours later as a parked
row — the branch believing it ordered, Production never seeing it, and the only
trace a Sync Center entry someone has to notice.

What comes back is the banner from **Reporting the outcome of a write** above,
and it says one of three things: *Order submitted to production.* if the drain
landed it, *Saved offline* if it is still queued, or the server's own words if it
was refused. The basket, the date, the review and the stored draft are all
cleared on the way — leaving any of them up is how the same tray gets ordered
twice.

### One workflow, two actors

`ProductionOrdersScreen` (the counter: review, print) already existed.
`BranchDemandsScreen` is the **other side of the same orders** — the branch
raised them and could not see what happened next; its half of the Orders tab was
a placeholder holding the create button. That placeholder is now gone, and
`BranchDemandsScreen` owns the create action it was keeping alive.

Withdrawing uses a **modal, not `Alert.prompt`** — that API is iOS-only and this
app runs on Android, where it silently does nothing. Only a `pending` demand can
be withdrawn; once units are in motion the way back is a return. The reason is
mandatory server-side, and the demand stays visible as `cancelled` rather than
vanishing off a summary Production is planning against.

### Two of the requested fields are deliberately dead

`previousBalanceQty`, `totalRequiredQty` and `remainingBalanceQty` are on the
item type and are **historical only**. Server migration 74 removed carry-forward
entirely: a demand is now the fresh demand alone. New rows are written with
`previousBalanceQty = 0`, `totalRequiredQty = qty`, `remainingBalanceQty = 0`,
and nothing computes with them. They stay readable because orders approved before
that migration genuinely were approved against previous balance + new demand.

**Do not add them back into a demand.** The type says it in capitals: doing so is
precisely the bug migration 74 fixed. So the demand list shows demand quantity
and, where they differ, the changed quantity — not a carried balance.

"Amount", "Previous Balance" and "Previous Order Amount" exist, but as **money on
the print slip**, not fields on a demand: `GET /api/production-orders/:id/previous-balance`
returns `{amountToCollect, deliveredValue, returnsValue, companySharePct}`, is
super-admin/production only, and bills the immediately preceding *delivered*
order. `OrderPrintPreview` already renders it. A demand itself carries quantities,
not prices.

### Verification cannot be done from this app

`PUT /api/production-orders/:id/verify` — the step where stock moves — requires
`attachmentIds` **and the schema makes it required, not optional**: the photo is
the only independent record Production gets of a delivery it can no longer
inspect.

This app has no attachment upload and no camera or image-picker dependency at
all, so calling it would 400 every time. The demand card says so on the affected
rows — *"Count this in on the web app to receive the stock"* — rather than
offering a button that cannot work.

Building it means: an image-picker or camera dependency, Android camera and media
permissions, a multipart upload service against `/api/attachments`, and then the
verify screen. That is its own piece of work, and it is the one thing standing
between this app and completing the production-order workflow end to end.

## Not built, and what it needs

- **Four v4 screens have no endpoint behind them, and are deliberately absent.**
  Each was checked against the server rather than deferred on feel:

  | v4 screen | Why not |
  |---|---|
  | Settings → notifications / auto-sync / auto-print toggles | None of the three features exists. There is no notification library, no Wi-Fi-only sync policy and no printer integration, so all three would be switches that control nothing. `SettingsScreen` stays the tenant-settings editor it is. |
  | Settings → theme colour and font pickers | Inventing two product features. The palette is contrast-checked per token pair (`contrast.test.ts`) and a user-chosen hue cannot be; the three fonts v4 offers are not shipped. |
  | Login → Google / Apple / Sign Up | Accounts are created by an administrator. Sign-in is `supabase.auth.signInWithPassword` and there is no social provider configured, no self-registration route, and no server-side handler for either. |
  | Help → live chat, call support | No chat backend, and no support number on `AppSettings` to dial. The query queue is the real channel and it is built. |

  Each is a dead control if drawn. The standing rule is the one an unbuilt tab
  already follows: never show something that cannot answer.

- **The rest of the charts.** `MBTrendChart` (Reports → Daily), `MBColumnChart`
  (Daily Sales → by hour, Sales vs Expenses → by week or month) and `MBStackedBar`
  (Top Products → share) are built, all on `react-native-svg` or plain flexbox.

  The standing caveat still holds and now covers three components rather than
  one: they are unit-tested and were checked by reading their computed geometry,
  but **no chart in this app has been seen on a device**.

  `victory-native` and `@shopify/react-native-skia` **were removed**, not left
  waiting to be used: `librnskia.so` was ~52 MB across four ABIs, roughly a
  third of the release APK, for a library nothing imported. Reach for Skia only
  when a chart genuinely needs it, and weigh that 52 MB then.

  The standing caveat still holds — `MBTrendChart` is unit-tested and was
  checked by rendering its exact path data in a browser, but **no chart in this
  app has been seen on a device**.
- **Illustrations on the remaining empty states.** `MBEmptyState` now takes an
  `illustration` prop as well as an `IconKey`, and the first-run empties on
  Orders (admin + production) and Stock (branch + production) use it;
  `MBErrorState` picks `offline` over `error` for network failures. Filtered
  empties ("No orders match") deliberately keep the small icon — a 160dp drawing
  above a search field the user is trying to correct out-shouts it.

  Expenses, Products and Ledger still use icons: the set is five drawings and
  none of them means "expense", "product" or "ledger". Adding more is a design
  decision, not a wiring one.
