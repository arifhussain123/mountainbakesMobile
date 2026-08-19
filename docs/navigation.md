# Navigation

## The decision: tabs + More. The drawer is not navigation.

The original brief described bottom tabs **and** a navigational drawer **and** a
More tab. That is three routes to the same screen, three menus to keep in sync,
and a user who cannot build a mental model of where anything lives. It is also
the specific way this architecture rots: the day someone adds "Vendors", they add
it to whichever of the three menus they happen to be editing, and the surfaces
drift apart from there.

What is implemented:

```
Bottom tabs   →  up to 4 daily operations + More
More tab      →  everything else — a real screen, scrollable, grouped
Account panel →  opened from the header avatar. NOT navigation.
```

The drawer still exists as a `@react-navigation/drawer`, but it holds identity,
connection state, appearance and sign-out — things that are read-only or an
action, never a destination. There is not one `navigate()` call in
`AccountDrawer.tsx`, and that is the invariant to preserve. If a row in the
account panel ever needs to push a screen, that screen belongs in **More**.

**The rule, enforced by a test:** no screen is reachable from two surfaces.
`src/navigation/__tests__/navigationSurface.test.ts` asserts, for all eight
roles, that no More route is also a tab name and that no More route is listed
twice. If you add a destination, that test is what stops it becoming a duplicate.

### Two contradictions in the brief, and how they were resolved

1. **Sync Center and Help.** §2 put them in the account panel; §4 listed them in
   More. They cannot be in both without breaking the single-path rule. They are
   in **More** — §4 enumerates them there beside Settings, and More is the
   general secondary surface.

2. **`requires: Permission[]` from the server.** §4 assumed the backend returns
   permission strings at login. It does not. See below.

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
├── AuthNavigator                 SignIn · FinanceSignIn · ForgotPassword
└── AppNavigator                  resolves the AccessProfile once
    └── AccountDrawer             account panel
        └── RoleTabs              ONE component, config-driven
            ├── <tab>  → native stack per tab
            └── More   → MoreStack (index + every secondary destination)
```

Each tab owns a native stack, so detail and create screens push **inside** the
tab that owns the resource and keep a real back path to their list.

`RoleTabs.tsx` is one file, not one per role. Four copies drift inside a month —
a padding fix lands in the branch copy, an accessibility label in the admin copy.
Everything role-specific is data in `roleConfig.ts`; there is no role name in
`RoleTabs.tsx` at all.

## Tabs per role

| Role | Tabs |
|---|---|
| `super_admin` | Home · Orders · Products · Reports · More |
| `branch_manager` | Home · Sales · Orders · Stock · More |
| `branch_user` | Sales · Orders · Stock · More |
| `production_user` | Home · Orders · Stock · More |
| `finance_*` (4 roles) | Home · Ledger · Income · Expenses · More |

An unknown role gets **Home + More** and a `console.warn`, never a crash and
never the admin set. Failing open would advertise capabilities that are not
theirs; the API would still refuse, but the UI would be lying.

### New Order is no longer a tab

It was one. A create form in the tab bar with no list behind it meant submitting
an order left you on an empty form with no way to see what you had just made. It
is now a **modal on `OrdersStack`** — it slides up over the order list, and
dismissing returns to the list that now contains the new row. Registered for
branch roles only; the admin and production "Orders" tabs are different resources
(customer orders, and branch demands on central production) and neither is
created from that form.

## Route names are shared; screens are not

`resolveTabScreen(role, route)` in `screenRegistry.tsx` keys on **both**. This is
not incidental:

- **"Sales"** at the production counter posts to a different endpoint and permits
  a `staff` payment method — an unpaid hand-out requiring a comment — that a
  branch sale must never offer.
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

## Deep links

`linking.ts` maps URLs to routes and guards them: a link naming a tab the role
does not have resolves to Home rather than pushing a screen with no tab behind
it. `routeForNotification` returns the **tab as well as the screen**, so an order
push opens inside the Orders stack with a working back path.

State of the transport:

- **Android** — `mountainbakes://` is registered in `AndroidManifest.xml`. Test
  with `adb shell am start -a android.intent.action.VIEW -d "mountainbakes://orders"`.
  The `https://` prefix is deliberately not claimed: an App Link needs a verified
  `assetlinks.json` on the domain, and claiming it unverified shows a
  disambiguation dialog on every tap.
- **iOS** — nothing registered. The iOS project has never been built. `Info.plist`
  needs `CFBundleURLTypes` first.
- **Push notifications** — no notification library is installed. The resolver is
  written and tested ahead of the transport; that is not the same as notifications
  working.

## Icons

One family: `lucide-react-native`, drawn through `react-native-svg`. One map:
`src/constants/navigationIcons.ts`. Screens import an `IconKey`, never an icon
component, and never a pixel size — `theme.iconSize` tokens only.

Lucide has no filled variants. The active tab state is therefore three signals at
once: primary colour, stroke `2.25` vs `1.75`, and a pill at 12% primary. Adding a
second icon family to get a filled glyph would be worse than not having one.

No emoji. An emoji is a font glyph: it ignores `color`, renders differently on
every Android skin, and carries no accessibility label.
