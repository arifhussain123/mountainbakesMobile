# Navigation

## The decision: tabs + More + a derived drawer

The original brief described bottom tabs **and** a navigational drawer **and** a
More tab. That is three routes to the same screen, three menus to keep in sync,
and a user who cannot build a mental model of where anything lives. It is also
the specific way this architecture rots: the day someone adds "Vendors", they add
it to whichever of the three menus they happen to be editing, and the surfaces
drift apart from there.

**v4 resolved that by deleting the drawer as a menu. v5 brings it back, and the
resolution is different — derivation instead of prohibition.**

What is implemented:

```
Bottom tabs   →  up to 4 daily operations + More.  Five equal cells, no centre button.
More tab      →  everything else — a real screen, scrollable, grouped
Drawer        →  opened from the header avatar. A GROUPED INDEX OF BOTH,
                 derived from them, under a plum profile header and over a
                 pinned Logout.
```

### The rule that replaced "no destination on two surfaces"

The old rule was that no screen was reachable from two surfaces, and
`navigationSurface.test.ts` asserted it for all eight roles. That rule was never
about duplication being wrong in itself — it was about **three hand-maintained
menus drifting apart**.

v5 asks for the drawer to repeat Dashboard, Orders and Stock from the bar on
purpose: a five-cell bar is a set of shortcuts, not a map, and a browsable index
of the whole role is a different and legitimate job. So the drift problem is
solved at the source instead:

> `drawerSectionsFor(profile)` in `roleConfig.ts` **reads `tabsFor` and
> `moreSectionsFor`**. There is no third list. A destination cannot exist in the
> drawer and nowhere else, and one added to a tab cannot be forgotten here.

What the test asserts now, for all eight roles:

1. **Coverage** — every tab (except More itself) and every More row appears in
   the drawer.
2. **No duplicates** — nothing is listed twice *within* the drawer.
3. **Reachability** — every drawer row names a tab the role actually has, so a
   row can never close the drawer onto nothing.
4. **Every section is headed** — v5's drawer has no floating rows.

That is a stronger invariant than the old one. The old rule could only be
checked by comparing three lists; this one is true by construction and checked
anyway, because "true by construction" is a claim about code somebody will edit.

### The account panel is still not navigation

`ACCOUNT_PANEL` in `roleConfig.ts` — identity, branch, connection, appearance,
sign-out — is what the drawer carries **outside its list of rows**, and none of
it may be a tab, a More row or a drawer row for any role. That assertion survived
the reversal unchanged, and it should: a row goes somewhere, a button does
something, and a sign-out that scrolls with a growing menu is one somebody hits
by accident.

**v6 splits the panel across both ends of the drawer, and that is a change of
arrangement rather than of rule.** v5 kept all of it in one pinned footer. v6's
screen 04 heads the drawer with a plum profile block — logo, role, branch,
presence — and pins only Logout beneath the scroller. The material is the same
and so is the invariant: the panel holds no destinations, and the one control a
mis-tap costs something by still cannot scroll. What the split fixes is that v5
answered "who am I signed in as" in two places at opposite ends of a scrolling
list, the mark and the branch at the top and the role and the dot at the bottom.

Appearance moved out of the panel to Settings when the drawer became a menu — it
was the one *control* sitting in what is now a list of destinations.

### The drawer's rows, and what a selection is made of

v6's screen 04 draws eleven destinations as one hairline-separated list with no
groups. The hairlines are adopted; the groups stay. Eleven is one role's count —
the admin carries roughly twice that — and `drawerSectionsFor` returns *titled*
sections because the More index it derives from is grouped, which is also what
assertion 4 above checks. A flat render would throw that away and leave the test
asserting headings nothing shows.

A selected row is **three signals**, the same three `MBTabBar` uses and for the
same reason: the ember as a 3dp bar down the left edge, `accent` for the glyph
and the label, and a `primarySoft` tint behind the row. `primary` is 3.04:1 on a
card — enough for a graphical object under WCAG 1.4.11, nowhere near the 4.5:1 a
15dp label needs — so the brand goes in the bar and the type takes the mark. The
row also reports `selected` to the screen reader, because colour is the one
signal a reader cannot use.

The edge is **reserved on every row and painted on one** (`layout.drawerEdgeW`).
A mark that appeared on selection would shift the label of the row you just
tapped by 3dp, which is small and exactly the amount that reads as the list
flinching.

Tapping the active row **closes and navigates nowhere**. Re-navigating to where
you already are resets that tab's stack to its root, so the row for the screen in
front of you would silently discard a half-filled form. Which row is active is
walked out of the navigator state rather than stored — the drawer wraps one
screen, so the answer is two levels down and three for a More destination, and
`null` (the More index itself, or any pushed detail screen) is a real answer.

The panel is `min(340, 78% of the screen)`. It never covers the full width, which
is what keeps the scrim a real dismiss target; the cap matters on a tablet, where
78% of a 10" screen is a menu wider than the content it opens.

## What `roleConfig.ts` exports, and what it deliberately does not

```ts
export const ROLE_TABS: Record<UserRole, readonly TabConfig[]>
export const MORE_SECTIONS: Record<UserRole, readonly MoreSection[]>
export const ACCOUNT_PANEL: readonly AccountPanelEntry[]
```

Three deviations from the original brief's `TabConfig`, all deliberate:

**No `stack: React.ComponentType` on a tab.** A tab name does not identify a
screen in this app — see "Route names are shared; screens are not" below. A
`stack` field would have to name the same component once per role, which is the
duplication this file exists to prevent. Keeping components out also keeps this
module **pure data**: it imports no React and no screen, so the surface tests
resolve every role's whole tree without mounting anything, and screens can import
these types without a cycle back into the registry. `screenRegistry.tsx` owns the
(role, tab) → component map and is the only place that imports screens.

**`requires` holds `Capability`, not backend permission strings.** There are no
backend permission strings; see "Permissions: what is real" below. It is also
optional rather than required — most tabs are gated by nothing, and `requires:
[]` on every one of them reads as though a gate were intended.

**`label` is a `LabelKey`, not a free string.** Every user-visible navigation
string in the app is a value in `NAV_LABELS`. There is no i18n runtime yet and
adding one is its own task, so this is not `t('nav.orders')` — it is the
indirection that makes that change a single edit instead of a sweep.

### Notifications is a More row behind a placeholder

It is in the universal App group, for every role, and it opens the standard
"Not built yet — Phase 9" placeholder rather than an empty list. That is the
project's standing rule for an unbuilt screen: an empty Notifications screen and
an unbuilt one must not look the same to anyone testing this build.

What is still missing is the whole transport, not just the UI. There is no
notification library — no Firebase, no notifee — and no inbox endpoint on the
server. `routeForNotification` in `linking.ts` is the resolver, written and
tested ahead of that transport. Its `SCREEN_PLAN` entry names **no endpoint** on
purpose, because there is no API path the placeholder could honestly print.

The row carries **no badge**, and that is the same call as the `ordersWaiting`
badge below: there is no unread count to read, and a badge fed by nothing teaches
staff to ignore every badge in the app. Add the badge with the transport.

### Two contradictions in the brief, and how they were resolved

1. **Sync Center and Help.** §2 put them in the account panel; §4 listed them in
   More. They are in **More** — §4 enumerates them there beside Settings, and
   More is the general secondary surface. They therefore also appear in the
   drawer, which is derived from More; that is coverage, not duplication, and
   there is still exactly one place they are *declared*.

2. **Sign-out.** §2 put it in the account panel; §4 listed it as a More row. It
   was implemented as **both**, and that is the duplication this document exists
   to prevent — caught only after the fact. See the section below. This is the
   one bar that did **not** relax when the drawer became a menu: an action is
   still not a destination.

3. **`requires: Permission[]` from the server.** §4 assumed the backend returns
   permission strings at login. It does not. See below.

## Sign-out lives in the account footer, and only there

This is the one place the duplicate rule was actually broken in shipped code, so
it is worth stating what went wrong rather than just the outcome.

Sign-out existed on **four** paths at once, with three different behaviours:

| Path | Unsynced count read from | Confirms? |
|---|---|---|
| `useSignOut()` — the hook, with tests | `getUnsyncedSummary()`, i.e. the queue table | yes |
| `MoreScreen`'s own `confirmSignOut` | `useSyncStore` counters | yes |
| The account footer's `onSignOut` | nothing | **no** |
| `ChangePasswordScreen`, calling the store directly | nothing | **no** |

The third one is why this mattered more than tidiness. Signing out from the panel
dropped the local session **without saying anything about unsynced work** — and in
this app a queued row is frequently the only copy of a transaction the server has
never accepted. Two menus to keep in sync is an annoyance; two menus that disagree
about whether to warn you before stranding a shift's takings is a defect.

Resolved:

- Sign-out is in the **account panel only** as far as navigation is concerned.
  It is an action on the session, not a secondary feature, and it is pinned
  below the menu rather than scrolling with it, so it does not drift under a
  thumb as the drawer grows. The two auth screens that also offer it —
  `ChangePasswordScreen` and `PlaceholderScreen` — are escape hatches from a
  screen you cannot otherwise leave, not menu entries, and they call the same
  hook.
- It goes through **`useSignOut()`**, the single implementation. It reads the real
  count from the database rather than a store counter that may not have been
  refreshed, and it states plainly that the work stays on the device and syncs on
  next sign-in — the copy deliberately does not imply the data is at risk, because
  overstating it pushes staff into never signing out at all.
- `MoreItem` **no longer has an action variant.** A More row carries a
  `MoreRouteName` or it does not compile. That is structural rather than
  remembered — you cannot put an action back in the More list, or therefore into
  the drawer derived from it, without deliberately reopening the union.

## Permissions: what is real

Per `docs/mobile-architecture-audit.md`:

- **There is no login endpoint.** Sign-in goes to Supabase directly, and the JWT's
  `app_metadata` carries `role`, `branchId` and `branchName`. No permission list
  is issued anywhere.
- **The only per-action gate in the system is `financeCan(role, permission,
  allowSuperAdminWrite)`** — five finance permissions. Everything else is role
  logic inside API handlers, which the client cannot read.

So `Capability` in `roleConfig.ts` contains only gates the app can evaluate
truthfully: the five `finance:*` permissions plus `admin`, `production`, and
`branch`. Inventing `orders.create` / `users.manage` strings would produce a menu
that *looks* permission-driven while really being role-driven with extra steps,
and it would drift from the server the first time a handler changed.

The declarative shape is preserved — a tab declares `requires`, and `tabsFor`
filters — so when the backend grows real permissions, widening `Capability` and
`accessProfileFor` is the whole change. No call site moves.

**None of this is authorization.** Hiding a tab hides nothing: the API
re-authorises every request against the JWT and the service-role key never leaves
the server. Navigation config decides only what is convenient to reach.

## Structure

```
RootNavigator                     auth state decides the tree, never navigate()
├── FirstRunScreen                the onboarding panels — first run, signed out
├── ChangePasswordScreen          forced change — signed in, mustChangePassword
├── AuthNavigator                 SignIn · FinanceSignIn · ForgotPassword
└── AppNavigator                  resolves the AccessProfile once
    └── AccountDrawer             grouped menu + account footer
        └── RoleTabs              ONE component, config-driven
            ├── <tab>  → native stack per tab
            └── More   → MoreStack (index + every secondary destination)
```

The first two are **gates, not routes**. Both sit outside `NavigationContainer`
entirely, both apply before any navigator mounts, and neither can be navigated to
or away from: the only way out of each is the thing it exists to collect — a new
password, or a dismissal of the panels — and both change state that re-renders
`RootNavigator`. So there is no back gesture into either and nothing to deep-link
at. `shouldShowOnboarding()` and the `mustChangePassword` expression are the whole
of the precedence, in that order.

The onboarding gate carries one condition that is not about onboarding: it also
requires the user to be **signed out**. The stored flag ships to phones that have
been running the app for months, where it reads absent, so a check on the flag
alone would hand a tour of the app to every existing user in the middle of a
shift. `RootNavigator` closes the other end by writing the flag the first time it
observes a live session — otherwise the panels would appear at the *next*
sign-out, which on a `branch_user` shift account is the same evening.

Each tab owns a native stack, so detail and create screens push **inside** the
tab that owns the resource and keep a real back path to their list.

`RoleTabs/index.tsx` is one file, not one per role. Four copies drift inside a month —
a padding fix lands in the branch copy, an accessibility label in the admin copy.
Everything role-specific is data in `roleConfig.ts`; there is no role name in
`RoleTabs/index.tsx` at all.

### A tab is mounted when opened, and frozen when left

Both are stated in `screenOptions` rather than inherited, for the reason the tab
animation is: a default is not a decision, and a minor version that changed one
would change how the app behaves with nothing in the diff to say so.

- **`lazy`** — a tab mounts the first time it is opened. A role has four tabs
  plus More, each a stack whose root fires its own queries on mount; mounting all
  five at sign-in turns opening the app into five parallel requests on a shop's
  connection, four of which nobody asked for.
- **`freezeOnBlur`** — a tab that is not on screen stops re-rendering, and so
  does a screen covered by another in the same stack. Every tab root subscribes
  to something that moves without the user: the network store, the sync store's
  pending count, a query refetching on reconnect. Without it, a drain finishing
  re-renders the dashboard, the catalogue and the stock list as well as the
  screen actually being looked at — work whose only visible effect is that the
  foreground screen dropped frames while it happened.

Freezing defers rendering, not state. Scroll position, form contents and
in-flight requests all survive, which is the same guarantee that keeps a list
underneath a pushed detail screen intact.

## Tabs per role

| Role | Tabs | More |
|---|---|---|
| `super_admin` | Home · Orders · Products · Reports · More | Users · Categories · Vendors · Branches · Sales · Stock · Expenses · Production · Returns |
| `branch_manager` | Home · Sales · Orders · Stock · More | Expenses · Returns · Reports |
| `branch_user` | Sales · Orders · Stock · More | Expenses · Returns |
| `production_user` | Home · Orders · Preparation · Delivery · More | Sales · Stock · Returns · Reports |
| `finance_*` (4 roles) | Home · Income · Expenses · Reports · More | Partner Expenses |

Every role's More list then ends with the same App group — Sync Center,
Notifications, **Events**, Profile, Help, Settings — appended once from
`MORE_COMMON` rather than repeated per role.

**Events is common because the endpoint is.** `/api/special-events` sits behind
`authenticate` and nothing else, and `scopedEventRows` narrows a branch account
to the events that apply to all branches or name its own. Every role therefore
has something real to see there, which is the test a row in that section has to
pass — the reason Stock and Sales are *not* in it for finance.

**Returns is not.** `/api/production-returns` is
`requireRole('super_admin', 'production_user')` on the router itself, so a branch
is refused the read as well as the review. It appears in exactly those two roles'
lists and `resolveMoreScreen` gates it again, so a deep link cannot land another
role on a screen that 403s on first load. A branch's *own* returns are a
different path with no list endpoint at all — they are applied immediately by
`POST /api/stock/return`. Both roles now have a Returns row and they resolve to
**different screens**: a branch gets its own 90-day record (`GET
/api/stock/returns`, read-only), production gets the 30-day review queue
(`GET /api/production-returns`, with actions). `screenRegistry.test.tsx` holds
them apart.

Two entries in that table are easy to get wrong from memory:

- **`branch_user` has no Home tab.** The branch dashboard's only source is
  `GET /api/reports/summary`, and the server mounts every `/api/reports` route
  behind `requireRole('super_admin', 'branch_manager')`. A shift account would
  land on a 403 as the first thing it sees, so the tab is filtered by the
  `reports` capability and the shift opens on **Sales** — v5 puts it in the
  second cell, so it is the first tab a shift account can reach. Same reason
  Reports is not in its More list.
- **Finance has no Ledger tab.** The ledger is reached through Income, Expenses
  and Reports. And finance's "Reports" is `/api/finance/reports`, *not* the
  admin's `/api/reports` — same tab name, different resource, which is exactly
  why `resolveTabScreen` keys on the role too.

An unknown role gets **Home + More** and a `console.warn`, never a crash and
never the admin set. Failing open would advertise capabilities that are not
theirs; the API would still refuse, but the UI would be lying.

### Sales is a register; the till is a modal inside it

The same move, made later and for the same reason. The Sales **tab used to be
the POS**, so the screen a branch opens most often could answer one question —
ring up the next sale — and none of the ones asked around it: what have we taken,
was that sale recorded, which one was Mrs Khan's. A sale saved offline had
nowhere to appear at all, which is the worst version of the problem: the only
copy of a transaction, invisible on the screen it belongs to.

`SalesList` is now the register — one business day, its totals, its tender split,
its units sold, and every record including the ones still queued on the device —
and `NewSale` is the till presented over it (`SalesStack`). Finishing a sale
dismisses the modal onto the list the sale just joined, and the **outcome travels
with the dismissal as a route param** rather than being announced on the form
that is closing: a queued sale appears on the register marked as waiting, and a
refused one does not appear at all, so the register is the only surface where the
three outcomes have visible consequences.

The branch quick action therefore names `{ tab: 'Sales', screen: 'NewSale' }`.
Without the `screen` it would land on the day's list and leave a cashier one tap
short of the thing the card is named after.

### New Order is no longer a tab

It was one. A create form in the tab bar with no list behind it meant submitting
an order left you on an empty form with no way to see what you had just made. It
is now a **modal on `OrdersStack`** — it slides up over the order list, and
dismissing returns to the list that now contains the new row. Registered for
branch roles only; the admin and production "Orders" tabs are different resources
(customer orders, and branch demands on central production) and neither is
created from that form.

### The centre action button is gone

v4 drew an ember circle sitting proud of the middle of the floating navigation
bar — one create action per role group, with `MBTabBar` reserving a 60dp notch in
the row for it. Branch got New Order.

**v5 removes it.** The bar is five equal cells with nothing rising out of them,
so `CENTRE_ACTIONS`, `centreActionFor()`, the notch arithmetic and the
`navFabRing` layout token all went with it — removed rather than left dormant,
because a config naming a control the app does not draw is how the next person
spends an afternoon looking for the bug. `roleConfig.ts` keeps a tombstone note
at the place it used to be.

Two things came back when it left, and both were removed *because of* it:

- **New Order is a dashboard quick action again**, one of six. It was dropped
  from that row on the grounds that the bar already carried it everywhere; that
  reason is gone.
- **The corner `MBFab` is back on the demands list.** Same reason. One control
  at a time still holds on that screen: the empty state carries the instruction
  while the list is empty, and the FAB takes over once there is something to
  scroll — the Expenses rule.

### The bar itself

v5's bar is a white rounded card, `radius.xxl`, `navPillH` 62, floating clear of
all three edges by `navInset`. Five equal cells, each an icon over a label, and
the active one marked by a 16×3 ember underline pinned to the bottom of the row.

**The active glyph and label stay in the ink, and that is the one place this
build deliberately departs from v5.** v5 draws them in `#FB6D34`. Measured on
the bar's own white that is **2.88:1**; the ember this app ships (`ember500`,
v4's hue walked down 6%) is 3.04:1. Either way it is a *fill* value — it clears
the 3:1 bar WCAG 1.4.11 sets for a graphical object and falls well short of the
4.5:1 a label needs, and at 10dp the miss is not academic. So the ember carries
the underline, where it can be honest, and the glyph and label take `accent`.
The selection is then three signals rather than one: the mark, the colour shift
from `textMuted`, and the weight step on the label. `contrast.test.ts` is what
holds `primary` to the non-text bar and asserts `accent` is strictly the more
readable of the two.

### Reports pushes three statements

Reports grew a stack. `DailySales`, `TopProducts` and `SalesVsExpenses` are
**detail screens, not destinations**: nothing in `roleConfig` points at them and
the only way in is the Reports index. They are not in the drawer either — it is
derived from the tabs and the More list, and a detail screen is in neither.

They have to be registered in two navigators, because Reports is a **tab** for
the admin and a **More row** for a branch manager. `REPORT_DETAIL_SCREENS` in
`types.ts` is the one list both read — `ReportsStack.tsx` for the tab,
`MORE_DETAIL_SCREENS` for the row — so the two roles cannot drift into being
offered different statements from the same index.

Both are gated by the index rather than per screen: all three read
`GET /api/reports/summary`, the same endpoint the index reads, mounted behind
`requireRole('super_admin', 'branch_manager')`. A `branch_user` never gets the
tab or the row, so the statements are unreachable for exactly the accounts the
server would refuse.

### Stock pushes the ledger

`StockHistory` and `StockDay` are the same shape one tab along: detail screens on
`StockStack`, reached from a link on the stock list and from each other, never
from a menu. They are registered for **branch roles only** — `GET
/api/stock/history` scopes a branch role to its own shop, requires an explicit
`branchId` from a super admin, and refuses everyone else. The admin is left out
deliberately rather than by omission: they may read it, but only by naming a
branch, and the Stock tab has no branch picker for them. Adding the route without
one is a screen that 400s.

## Route names are shared; screens are not

`resolveTabScreen(role, route)` in `screenRegistry.tsx` keys on **both**. This is
not incidental:

- **"Sales"** at the production counter posts to a different endpoint and permits
  a `staff` payment method — an unpaid hand-out requiring a comment — that a
  branch sale must never offer. It is also the one Sales that is **not** a tab:
  the branch reaches its register as a tab and the production counter reaches its
  till from More, so `resolveTabScreen(_, 'Sales')` answers for the branch alone
  and `resolveMoreScreen` splits the other two — production's till from the
  admin's cross-branch money view. `__tests__/screenRegistry.test.tsx` holds all
  three apart; `navigationSurface.test.ts` cannot, because it sees only the
  config and the config lists each of them exactly once.

  The branch's own Sales is now **two** screens rather than one, and only the
  first is named by a route the config knows: `SalesList` is the day's register
  and `NewSale` is the till, a modal inside the same stack
  (`resolveNewSaleScreen`). That is not a destination declared twice — the till
  is a create action inside the resource that owns it, exactly like
  `CreateOrder`.
- **"Orders"** is customer orders for the admin and branch demands on central
  production for the production account.
- **"Home"** is four different dashboards.

Keying on the name alone would put the wrong screen, and the wrong payment
options, in front of a role.

## Badges

Only sources backed by state the app actually holds:

| Surface | Badge | Source |
|---|---|---|
| More tab | failures, else pending | `useSyncStore` |
| More → Sync Center row | same | `useSyncStore` |

Failures outrank queue depth: a parked row needs a person, a pending row only
needs a network. Both clear themselves when the store clears.

The brief also asked for "waiting orders" and "orders awaiting production"
badges. **Not implemented, deliberately** — there is no live count for either, and
a badge fed by a stale or absent query is exactly the badge that teaches staff to
ignore every badge in the app. `BadgeSource` has the slot; add `ordersWaiting`
when a real counter exists.

## Chrome

### The header owns the offline strip

`MBOfflineBanner` renders **inside `MBHeader`**, below the header row. It used to
sit above the whole navigator in `RootNavigator`, outside `NavigationContainer`,
which meant losing signal pushed the header, the tab bar and every screen down by
the height of the strip: a connectivity blip moved the entire app. Below the
header, only content moves, and no screen has to remember to add it.

The two sign-in screens do not carry it. There, offline is not routine — it
blocks the one thing the screen exists to do — so each says so beside its
disabled button (`"You're offline. Signing in needs a connection."`). A strip
saying work will sync later would be wrong: nothing is being saved.

Copy is one line: **"Offline — transactions are saved here and sync
automatically."** Both halves matter. *Saved here* is what stops a staff member
assuming the sale was lost and ringing it up twice; *sync automatically* is what
stops them hunting for a button that does not exist. It is `warningBg`, not
`danger` — branch staff are offline routinely, and an alarm that fires every day
is an alarm nobody reads.

### Search collapses into the header

`MBHeader` takes a `search` prop and renders a button that expands the field in
place. Search never pushes a screen: a search screen takes the list away at the
moment the user is trying to look at it, and returning has to restore scroll
position and filters or the user loses their place.

**Closing the field clears the query.** A filter that survives out of sight is
how a list ends up looking empty for no visible reason — the control that would
explain it is collapsed. `components.test.tsx` holds that behaviour.

Adopted on the browse screens — Orders, Products, Stock, Production stock —
where search is one way to narrow a list. **Not** on New Sale and New Order,
which keep a permanent inline `MBSearchBar`: there the field is the primary
input, and a rung-up sale is a search, a tap, a search, a tap. Hiding it behind a
button would charge a tap per line item. The Sales register keeps one too, for a
different reason: it sits under the date stepper as the pair of controls the
screen is read through, and it searches the sale's *contents* — a product name is
not on the row it matches.

Stock passes `search={undefined}` until a branch is chosen. The list at that
point is a "choose a branch" message, and a control that filters nothing is
worse than no control.

### Trailing actions cap at two

Counting the search button the header adds for itself. The title is what has to
survive a narrow phone at a large font size, and it is the first thing a third
icon squeezes out. Today every screen passes exactly one — `<MBSyncStatus />` —
so the cap is documented on the `right` prop rather than enforced by a typed
action list and an overflow sheet with no caller. A screen that needs more opens
a sheet from one trailing button.

### The sync indicator is a glyph per state, and it stops

| State | Shown |
|---|---|
| syncing | `sync` glyph, rotating, "Syncing…" |
| failed | `failed` glyph + "*n* transactions need attention" |
| just synced | `synced` check + "*n* transactions synchronized", for 4s |
| offline | `offline` glyph + "*n* waiting", or "Offline" |
| pending | dot + "*n* waiting" |
| idle and empty | nothing |

Four states, four glyphs rather than one shape in four colours: a colourblind
user cannot separate "syncing" from "needs attention" by hue. Pending keeps the
plain dot, because a queue is a quantity rather than an event.

**There is no *permanent* green check.** The brief lists one; rendering nothing
at rest carries the same information better. A permanent "all good" tick is on
screen so constantly that nobody sees it, and once it is furniture its absence
stops registering either — the same reasoning as `MBBadge` rendering nothing at
zero.

A drain that actually moved work is a different thing: it is an **event**, and
the one moment the pill has something worth confirming. So `✓ n transactions
synchronized` appears for four seconds and the pill then goes back to nothing.
It is bounded three ways so it never becomes that furniture:

- **a drain that synced nothing says nothing.** Reconnecting and foregrounding
  both drain, and most find an empty queue; a "0 synchronized" on every
  connectivity blip is exactly the notice staff learn to dismiss unread.
- **the same result is never announced twice**, however often the pill
  re-renders — `lastResult` is compared by reference, and the store replaces the
  object per drain. A result already in the store when the pill mounts is not
  announced either: returning to a screen is not a sync event.
- **it outranks nothing.** A parked row still wins the pill, because
  "5 synchronized" over the top of "2 need attention" reads as all-clear.

It is inline chrome rather than a toast, a modal or an OS notification: it
interrupts nothing, needs no dismissal, and cannot stack. Four seconds is a
reading time, not an animation, so it is a local constant rather than a
`motion.ts` token. `MBSyncStatus.test.tsx` pins all four properties, including
that it clears itself.

The spinner turns only while a drain is actually running: it starts when the
phase becomes `syncing` and is cancelled the moment it leaves, including on
unmount. Reduce Motion swaps it for the static glyph — the label still says
"Syncing…", so only the movement is lost. `motion.spin` is the one token in
`motion.ts` that describes a loop rather than a transition, and it says so.

### The account panel shows no identifiers

The real Mountain Bakes mark (`MBLogo`, which picks the variant for the scheme
through `logoFor()`), an avatar, the role, the branch and a connection dot — all
five in v6's plum profile header. No
e-mail, no phone, no user ID, no token — a shared branch handset is read over
shoulders, and none of those is needed to answer "who am I signed in as".

Neither the mark nor the avatar is announced. Both are `accessibilityElementsHidden`:
the role and branch directly beneath them are the answer, and hearing "Mountain
Bakes, image" first only delays it.

There is **no name**, and that is not an omission: the JWT's `app_metadata`
carries `role`, `branchId` and `branchName` and nothing else
(`api/supabase/claims.ts`). Showing "Branch Manager · Gilgit" is the true
statement available; a name would have to come from a profile endpoint that this
screen does not call.

## Deep links

`linking.ts` maps URLs to routes and guards them. It is a pure function of
(profile, path) with no navigation state in it, which is what makes the whole
decision table testable without mounting a navigator.

**An unpermitted link resolves to the role's own landing tab — not to `Home`.**
It used to resolve to a literal `Home`, and for one role that meant nowhere at
all: a `branch_user` has no Home tab (the API refuses a shift account every
`/api/reports` route, and the branch dashboard has no other source), so the
redirect named a route that role's navigator does not contain. The fallback is
`landingTabFor(profile)` — computed from the same config that built the tabs, so
it cannot name a tab the role lacks. `navigationRef.resetToTab` takes the tab for
the same reason, rather than assuming one.

`routeForNotification` returns the **tab as well as the screen**, and
`openNotification` in `helpers.ts` is what drives it:
`navigate(tab, { screen, params })` puts the order detail inside the Orders
stack, so back goes to the order list rather than dismissing onto whatever was
underneath. It returns three outcomes, and the caller has to tell them apart —
`not-ready` is the cold-start case and the payload should be held and replayed
from `onReady`, while `not-permitted` is final and replaying it would not help.

An unpermitted **push** lands nowhere at all, unlike an unpermitted deep link.
A URL is something a person followed and it owes them an answer; a push that
should not have been delivered to this account does not, and yanking someone off
their screen for it would be the wrong answer twice.

State of the transport:

- **Android** — `mountainbakes://` is registered in `AndroidManifest.xml`. Test
  with `adb shell am start -a android.intent.action.VIEW -d "mountainbakes://orders"`.
  The `https://` prefix is deliberately not claimed: an App Link needs a verified
  `assetlinks.json` on the domain, and claiming it unverified shows a
  disambiguation dialog on every tap.
- **iOS** — nothing registered. The iOS project has never been built. `Info.plist`
  needs `CFBundleURLTypes` first.
- **Push notifications** — no notification library is installed: no Firebase, no
  notifee. The resolver and the bridge are written and tested ahead of the
  transport; that is not the same as notifications working. Wiring one up is a
  call site — hand the payload to `openNotification(profile, payload)` — not a
  design.
- **Imperative navigation** — `navigationRef` is attached to
  `NavigationContainer` and nothing calls the helpers yet. The sync engine's
  intended use (a parked conflict offering "review it") is not built; today a
  conflict is recorded and reached by tapping the sync pill, which is ordinary
  declarative navigation.

## Icons

One family: `lucide-react-native`, drawn through `react-native-svg`. One map:
`src/constants/navigationIcons.ts`. Screens import an `IconKey`, never an icon
component, and never a pixel size — `theme.iconSize` tokens only.

Lucide has no filled variants. The active tab state is therefore three signals at
once: primary colour, stroke `2.25` vs `1.75`, and a pill at 12% primary. Adding a
second icon family to get a filled glyph would be worse than not having one.

No emoji. An emoji is a font glyph: it ignores `color`, renders differently on
every Android skin, and carries no accessibility label.

The rule is structural rather than remembered, in three places:

- **`MBIcon` is the only component that renders a Lucide glyph.** It takes an
  `IconKey` and a size *token*; nothing outside `navigationIcons.ts` imports from
  `lucide-react-native` at all.
- **`theme.iconSize` / `theme.iconStroke` sit on the theme** beside `space` and
  `radius`, because that is where a reader looks. Neither varies by scheme, so
  `common/theme/iconSizes.ts` still exports both directly — which is what a module-scope
  `StyleSheet.create` needs, since a hook cannot run there.
- **Components that own a glyph take a key, not a node.** `MBEmptyState`'s `icon`
  is an `IconKey`; it was a `ReactNode`, which let a caller hand it a raw Lucide
  component at any pixel size it liked and quietly route around all of the above.

Icons are decorative by default — `MBIcon` hides itself from the screen reader,
because a meaningful icon is always inside a control that carries its own
`accessibilityLabel` and `accessibilityRole`. An icon that announces itself next
to a label saying the same thing reads everything twice.
