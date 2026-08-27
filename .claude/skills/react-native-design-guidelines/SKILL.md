---
name: react-native-design-guidelines
description: Design guidelines for MountainBakes Mobile — how to spec and build a screen against this app's existing token set, component library and role-resolved navigation. Use when designing, reviewing, or implementing any screen or component in this tree.
license: MIT
metadata:
  author: Shahnawaz Hussain
  adapted-for: mountainbakes-mobile
  tags: react-native, design, ui, ux, mobile-design, mountainbakes
---

# React Native Design Guidelines — MountainBakes Mobile

## Purpose

You are designing **production-ready screens for MountainBakes Mobile**: a bakery
operations app used by counter staff, branch managers, production staff and finance
users. Output **implementation-ready specs** that can be built against the design
system that already exists in this tree.

This app has a settled design system. Your job is to **use** it, not to propose a
new one. Every rule below either points at a real file or states a real constraint
that a check script enforces.

> **Provenance.** This skill is adapted from a generic React Native design skill
> written for a warehouse/barcode/inventory app. The parts that survived unchanged:
> the spacing discipline, the type-scale discipline, the mandatory screen-output
> format, the form and copywriting rules, the Definition of Done. The parts that
> were rewritten are marked **[repo rule]** — they contradicted this codebase and
> following the original would have broken a build check or invented a surface this
> app does not have.

---

## Core Principles

1. **Counter-first UX**
   - Big touch targets, high contrast, minimal typing. Staff use this one-handed, at
     speed, often with flour on their hands — which is why `layout.tapMin` is **48**,
     not the iOS 44.
   - Optimize for a sale rung up in four steps, not eight.
   - Most-used actions reachable with one thumb.

2. **Clarity > decoration**
   - Hierarchy, spacing, legibility, feedback states first.
   - Motion is **feedback, never decoration** — see `docs/motion.md`. No bounce, no
     parallax headers, no confetti, no counters ticking up.

3. **Consistency**
   - Reuse the components in `src/components/`. If a pattern needs a new component,
     add it there — do not build a one-off inside a screen.

4. **Accessibility**
   - 4.5:1 text contrast, enforced by `src/theme/__tests__/contrast.test.ts`.
   - Touch targets ≥ `layout.tapMin` (48). `layout.chipH` (36) and
     `layout.stepperSize` (44) are the two documented exceptions — both need
     `hitSlop` if you place them in a repeatedly-tapped row.
   - Interactive control edges clear 3:1 via `colors.borderControl` (WCAG 1.4.11).
     Do not use `colors.border` on a field — it is a 1.25:1 hairline meant for
     dividing cards. (v4 draws its own field edge at that weight; this is the
     one place the implementation deliberately departs from the mockup.)

---

## Design System Rules

### Typography — use `theme.type`, never a raw size **[repo rule]**

The scale lives in `src/theme/typography.ts`, set to the v4 design. Three
families (`fontFamily.display` = Playfair Display, `body` = Plus Jakarta Sans,
`mono` = IBMPlexMono — **none of which ship yet**, so everything currently falls
back to the platform sans) and five weights
(`weight.regular|medium|semibold|bold|extrabold`).

| Token | Size/weight | Use for |
|---|---|---|
| `type.display` | 30/700 Playfair | Splash, wordmark, one-off hero |
| `type.h1` | 21/800 | Screen title |
| `type.h2` | 18/800 | Title inside a brand header block; login heading |
| `type.h3` | 16/800 | Section heading over a group of cards |
| `type.body` | 15/400 | Body text |
| `type.bodyStrong` | 15/600 | Emphasised body |
| `type.cardTitle` | 15/800 | A card's own title — order number, product name |
| `type.label` | 13/700 | Labels, captions with weight |
| `type.caption` | 12/400 | Secondary caption |
| `type.money` | 21/800, tabular | A KPI figure on a stat tile |
| `type.moneyLg` | 32/800, tabular | The dominant total on a screen |
| `type.number` | 15/700, tabular | Quantities and counts in a column |
| `type.mono` | 13/400 monospace, tabular | Identifiers read character by character — order numbers, voucher numbers, `client_operation_id` |

Rules:
- **Never write a `fontSize` literal.** A token carries its own weight; `weight.*`
  exists only for the handful of places that must vary weight *on top of* a token.
- `number` vs `mono` is not a style choice: `mono` is for identifiers a human reads
  one character at a time; `number` is the body face with tabular figures for
  quantities that sit in a column and must align.
- Money goes through `<MBMoney>`, not a `Text` with `type.money`.

### Colour — semantic tokens only, and a script enforces it **[repo rule]**

`npm run theme:check` (`scripts/check-theme-tokens.sh`) greps `src/components` for
`#hex` and `rgba()` and **fails the build** on a hit. `src/theme/` is the only
exempt directory. `npm run verify` runs it, so a hardcoded colour cannot ship.

Read tokens through `useTheme()`. A component that imports `lightColors` directly
will not follow a theme switch. `palette` (`brown500`, `emerald400`, …) is
deliberately **not** re-exported — naming a ramp value means you bypassed the
semantic layer.

`theme.colors` (`SemanticColors` in `src/theme/colors.ts`) — the full surface:

| Group | Tokens |
|---|---|
| Surfaces | `bg`, `surface`, `surfaceSunken`, `surfaceDocket` |
| Edges | `border` (card edge), `divider` (rows **inside** a card, a step lighter), `borderStrong`, `borderControl` (interactive, 3:1) |
| Text | `text`, `textSubtle`, `textMuted`, `textInverse` |
| Brand | `primary`, `primaryPressed`, `onPrimary`, `primarySoft`, `secondary`, `secondaryPressed`, `onSecondary`, `onSecondaryMuted`, `onSecondaryAccent`, `accent`, `accentSoft`, `honey`, `honeySoft` |
| Focus | `focusRing` |
| Status | `success`/`successBg`, `warning`/`warningBg`, `danger`/`dangerBg`, `info`/`infoBg` |
| Connectivity | `offline`, `syncing`, `syncFailed` |
| Chrome | `overlay` (scrim), `transparent` |
| Charts | `series` — a five-step ramp, darkest-brand-first |
| Splash | `splashTop`, `splashBottom`, `splashGlow` |

**`primary` is a fill; `accent` is a mark.** v4 runs two colours: ember orange
for every fill (a button, the active chip, the active tab's underline, a meter, a
chart line) and deep brown for every mark (type, icons, links, and the hero
blocks a KPI sits on). It never sets a link or a figure in orange, and it cannot
— the ember is 3.2:1 on a card. **Never colour text or a glyph with `primary`.**
`contrast.test.ts` holds `primary` to the 3:1 non-text bar and `accent` to 4.5:1,
and asserts `accent` is strictly the more readable of the two.

A hero block (`secondary`) has its own three text levels — `onSecondary`,
`onSecondaryMuted`, `onSecondaryAccent`. The field's `textMuted` is a cream and
vanishes on brown.

`theme.statusColors` is a separate map keyed by **domain status** — `pending`,
`preparing`, `ready`, `delivered`, `cancelled`, `awaiting_verification`, `verified`,
`approved`, `rejected`. Use it for order/production-order chips; do not re-derive a
status colour from `success`/`warning`.

Rules:
- Status is conveyed with **colour + text**, never colour alone.
- `honey` is a premium/celebratory highlight, **never** a call to action.
- **Offline is a warning, not an error** — `colors.offline`, not `colors.danger`.
- Never write `isDark ? a : b` in a component. Add or use a token.
- Do not use an eight-digit hex alpha suffix (unreliable on older Android) — that is
  why `primarySoft`, `accentSoft` and `overlay` exist as tokens.

### Spacing & layout — `theme.space` and `theme.layout` **[repo rule]**

`src/theme/spacing.ts`. Two ranges, and the split matters:

- **Layout scale (4pt):** `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 20, `xxl` 24,
  `xxxl` 32, `huge` 48 — distance between cards, rows, sections, screen edge.
- **Optical scale (2pt), for *inside* one component:** `hair` 2 (label to the value
  under it), `tight` 6 (icon to its adjacent text), `snug` 10 (padding inside a
  pill). Reaching for `tight` between two cards is the misuse to watch for.

`theme.layout`: `screenPad` 20, `cardPad` 16, `tilePad` 14, `rowMinH` 64,
`tapMin` 48, `headerH` 56, `tabH` 56, `railH` 72, `inputH` 56,
`btnH {lg:56, md:44, sm:36}`, `dotSize` 8, `chipH` 36, `stepperSize` 44,
`fabSize` 56, `fabInset` 16, `navInset` 16, `navPillH` 66, `navFabRing` 4,
`tabletMin` 600, `maxContentWidth` 640, `maxWideWidth` 1080.

- **One breakpoint, not a ladder.** `tabletMin` 600dp compared against *width*, so a
  landscape phone counts as wide. Two layouts exist: one column and a two-column
  split. A second breakpoint invites a third layout nobody tests.
- **Cap the measure.** Wrap column content in `<MBContentWidth>` or use
  `contentColumn` / `contentColumnWide` from `spacing.ts` as
  `contentContainerStyle`. An unconstrained row on a 10" tablet throws label and
  value to opposite edges — the specific thing that makes an app look unported.

### Radius & elevation **[repo rule]**

`theme.radius`: `none` 0, `xs` 5 (a chart column's top, a legend swatch),
`sm` 10 (chip), `icon` 11 (tinted glyph square), `md` 14 (field, small card),
`lg` 16 (list card), `xl` 18 (stat tile, hero block), `xxl` 22 (the floating nav
bar), `pill` 999. Values are deliberately generous — soft
corners are most of what makes a dense operations screen read as "bakery" rather
than "spreadsheet". Never compute `height / 2`; that is what `pill` is for.

**A chip is `radius.sm`, not `pill`.** v4 reserves the pill shape for *status* —
a badge, an "Online" marker, a "Pending" tag, all read rather than tapped. A
filter you choose between and a tag that reports state are not the same shape.

`theme.shadows`: exactly three levels, `e1` / `e2` / `e3`, warm-tinted rather than
neutral black. **In dark mode they are empty objects on purpose** — a shadow on a
dark surface is invisible, so dark separates layers with `borderStrong` and
`surfaceSunken` instead. Never set `elevation` without the iOS shadow props; a bare
`elevation` gives you a shadow on one platform only.

**Cards carry a soft lift *and* the hairline.** `MBCard` defaults to
`elevation={1}` — v4 puts a 7%-opacity lift on every card while keeping the 1px
`border` underneath it. The border is what separates a card from the field
(`surface` on `bg` is 1.05:1); the shadow only stops white-on-cream looking
pasted on. `0` is for a card already inside another surface. `e2` and `e3` are
the navigation bar and the corner FAB and nothing else — reaching for
`e2` on a card is how the cream field turns grey.

*(An earlier revision of v4 used borders alone and this section said cards never
cast a shadow. That revision is gone.)*

### Components — the library that exists **[repo rule]**

Import from `@/components`. Do not build a parallel version of any of these.

| Need | Component |
|---|---|
| Header / app bar | `MBHeader` — `tone: field` (default, sits on the page colour, no divider) or `brand` (solid brown block, for a screen that has taken over the device); supports `MBHeaderSearch` |
| Account panel entry | `MBAccountButton` |
| Button | `MBButton` — `variant: primary \| secondary \| ghost \| danger \| dangerSoft`, `size: lg \| md \| sm`, with `loading` for in-flight submits |
| Any tappable surface | `MBPressable` (+ `pressTargets`) |
| FAB | `MBFab` |
| Card | `MBCard` |
| Text field | `MBInput` |
| Select / checkbox | `MBSelect`, `MBCheckbox` |
| Search | `MBSearchBar` |
| Filters | `MBFilterChips`, `MBDateFilter`, `MBDateRangeField`, `MBRangeFilter` |
| Money | `MBMoney` |
| Icon / logo | `MBIcon`, `MBLogo` |
| Width cap | `MBContentWidth` |
| Domain rows/cards | `MBOrderCard`, `MBSaleItem`, `MBProductCard`, `MBStockCard`, `MBExpenseCard`, `MBDataRow` |
| Rows inside one card | `MBListCard` + `MBListRow` — the shape v4 draws most |
| Reconciling columns | `MBLedgerTable` — the stock ledger, and only that |
| Dashboard | `MBStatCard`, `MBStatGrid`, `MBQuickActions` |
| The screen's one figure | `MBHeroCard` — the deep-brown inverse block |
| Progress against a level | `MBMeter` |
| Status pill | `MBStatusTag` — a word plus a dot, never colour alone |
| One business day | `MBDateStepper`; a month grid is `MBMonthCalendar` |
| Charts | `MBTrendChart` (sparkline), `MBColumnChart` (labelled axis, 1–2 series), `MBShareList` (ranked bars), `MBStackedBar` (share of a total) |
| Badge | `MBBadge` — `tone: accent \| danger` |
| Loading | `MBLoading`, `MBSkeleton`, `MBSkeletonList` |
| Empty / error | `MBEmptyState`, `MBErrorState` |
| Modal / sheet / confirm | `MBModal`, `MBConfirmDialog` |
| Connectivity | `MBOfflineBanner`, `MBSyncStatus` |
| Write result | `MBWriteOutcome` (+ `writeOutcomeCopy`) |

**`MBPressable` is mandatory.** Do not reach for a bare `Pressable` — press feedback
used to be four different idioms. It scales to `motion.press.scale` (0.98) with an
opacity shift over `motion.duration.state` (120ms). `MBTabBar` is the **one**
deliberate exception: the platform ripple wins on a tab bar.

---

## React Native Implementation Rules

### Architecture

- TypeScript, always.
- Structure as it already is:
  ```
  src/screens/<group>/<ScreenName>.tsx    # admin | branch | catalog | finance | production
  src/components/{common,cards,charts,feedback}/
  src/theme/                              # tokens
  src/navigation/
  ```
- Keep screens thin; extract reusable UI into `src/components/`.

### Styling

**One approach, already chosen: `StyleSheet.create` + theme tokens.** No NativeWind,
no react-native-paper. Scheme-dependent values (`colors`, `shadows`) come from
`useTheme()` at render; scheme-independent ones (`space`, `radius`, `iconSize`) may
be imported directly for module-scope `StyleSheet.create`, where a hook cannot run.

### Layout practices

- `FlatList` for lists, `ScrollView` only when the content is genuinely bounded.
- `KeyboardAvoidingView` for forms.
- Sticky bottom CTA respects safe-area padding.
- Icon sizes come from `theme.iconSize` — `tab` 24, `drawer` 22, `header` 24,
  `action` 20, `statCard` 32 — with `iconStroke.active` 2.25 / `inactive` 1.75 /
  `regular` 2.

### Performance

- `FlatList` with `keyExtractor`; `getItemLayout` when row heights are fixed.
- Avoid inline `renderItem` closures.
- See `docs/performance.md` for what was measured versus reasoned about, and what
  was deliberately left alone.

---

## Screen Output Format (mandatory)

For each requested screen, output **every** section:

1. **Screen name**
2. **Goal**
3. **Primary users** — name the roles from the eight, and say what each sees
4. **Top-level layout** — header, main content, sticky actions, navigation
5. **Components list** — for each: purpose, props/data needed, states
6. **States & edge cases** — loading, empty, error, **offline / mirror-served**,
   **queued**, **refused**, success feedback
7. **Interactions** — tap flows, confirmations, what happens on a failed write
8. **Design tokens used** — by token name, from the tables above
9. **Implementation notes** — which `MB*` components, accessibility notes, motion

> **Do NOT skip any section.**

---

## Feedback rules — the replacement for the barcode section **[repo rule]**

The original skill's Barcode/Scanner UX section does not apply. **There is nothing
to scan**: no `barcode`, `ean`, `gtin` or `upc` field exists on the product, on the
server or in any migration. `sku` (`MB-001`) and `stockCode` (`STK-######`) are
internal codes, not retail barcodes, and lines sold loose or by the tray carry
none. The search box already accepts the product code, which is the part of scanning
that actually pays. See `docs/screen-patterns.md` → "Barcode scanning: no, and not
because it is hard". Do not spec a camera, a permission prompt, or a scan flow.

What replaces it is the rule that matters here: **a write has three outcomes, not
two.**

`WriteOutcome` in `src/services/sync/writeOutcome.ts` is
`'synced' | 'queued' | 'refused'`. Read the outcome by `client_operation_id` via
`resolveWriteOutcome()` — **never** off the `DrainResult` tally, which says nothing
about which row was *this* write.

| Outcome | What the operator sees |
|---|---|
| synced | One line. "Sale completed." / "Expense saved." |
| queued | **Three** lines: "Saved offline" → what happened, is it safe, what happens now → status "Waiting to sync" |
| refused | "Not accepted", the server's own words, + "waiting in Sync Center — do not ring it up again". **No status line** — it is waiting for a *person*, not a connection. |

- **The offline case gets three lines and the others get one.** A bare "Saved
  offline" reads as a *failure* to a cashier who has never seen it, and the recovery
  from that belief is ringing the sale up again.
- **Never report a queued write as saved** (that is how the same expense is entered
  twice) and **never report a refused one as queued** (that is how a sale nobody
  looks at goes missing until the till is reconciled).
- **There is no success screen**, and the reason is the offline case: a queued write
  has no server reference to put in the reference slot.
- One screen-reader announcement, not three — the title carries an
  `accessibilityLabel` joining all three lines.

Use `MBWriteOutcome`; get the wording from `writeOutcomeCopy`, which is pure so the
rules can be asserted without rendering.

### Connectivity and staleness

- `MBOfflineBanner` when disconnected; `MBSyncStatus` for drain state.
- A mirror-served read must be marked as such from `store/mirrorStore.ts`, **not**
  from React Query's `dataUpdatedAt` — a mirror read resolves successfully *now*,
  so that clock stamps the current time on hours-old data. The mirror's own
  `synced_at` is the truth.
- **Empty is not absent.** "No products" and "we could not reach the server" are
  different screens. Never render an empty state for a transport failure.
- Never hide a failure silently. Always offer retry.

---

## Forms & validation

- Disable submit until valid.
- Inline error messages, short and clear.
- Clear labels, not placeholder-only.
- Helper text only where it earns its place.
- Show/hide toggle on password fields.
- `MBButton` with `loading` blocks presses during an in-flight submit — use it
  rather than a bespoke disabled state.
- **Business date is captured on the device**, at write time, not send time. The day
  rolls at 02:00 Asia/Karachi. The field is named per endpoint (`date` on expenses,
  `businessDate` elsewhere); the wrong key is silently ignored and the transaction
  lands on the wrong day with nothing appearing to fail.

---

## Navigation rules **[repo rule]**

**There is no fixed tab bar.** `navigation/roleConfig.ts` is the single source of
truth: it declares tabs, the More list and the account footer for each of the eight
roles (`super_admin`, `branch_manager`, `branch_user`, `production_user`,
`finance_admin`, `finance_manager`, `accountant`, `finance_auditor`).

- `resolveTabScreen(role, route)` in `navigation/screenRegistry.tsx` maps
  (role, tab name) → component, because **the same tab name means different screens
  for different roles**. "Sales" at the production counter allows a `staff` payment
  method a branch sale must never offer; "Home" is four different dashboards.
  Sales is in fact three screens behind one word, and only the branch's day
  register is a tab — the production till and the admin money view are both More
  rows, split by `resolveMoreScreen`. The branch till (`NewSaleScreen`) is a
  `NewSale` modal inside the Sales stack, not a destination of its own.
- **A destination is declared in exactly one place, and may be reached from
  several.** The old rule was that no screen appeared on two surfaces; v5 makes
  the drawer a grouped index that repeats the tabs on purpose, so the rule became
  derivation instead: `drawerSectionsFor(profile)` **reads** `tabsFor` and
  `moreSectionsFor`. Never hand-write a drawer list.
  `navigation/__tests__/navigationSurface.test.ts` asserts coverage, no duplicates
  within the drawer, and that every row names a tab the role has.
- **The drawer is navigation; its pinned footer is not.** `ACCOUNT_PANEL` —
  identity, branch, connection, sign-out — may never be a tab, a More row or a
  drawer row. A row goes somewhere; a button does something.
- **There is no centre action button.** v4's ember circle in the middle of the
  bar is gone, along with `CENTRE_ACTIONS`. The bar is five equal cells; create
  actions live on the resource's own screen (a corner `MBFab`) and in the
  dashboard quick-action row.
- `branch_user` is a shift account carrying its manager's `branchId`. Branch-scoped
  code must treat it and `branch_manager` identically (`isBranchRole`) or the shift
  user sees an empty shop.
- An unbuilt tab renders a placeholder naming its phase, so an unbuilt screen is
  never mistaken for an empty one.
- Navigation gating is **UX, not a boundary** — the API re-authorises every request.

`docs/navigation.md` is the full account, including why New Order is a modal on
`OrdersStack` rather than a tab.

---

## Motion **[repo rule]**

Every duration and curve comes from `theme.motion` (`src/theme/motion.ts`). Nothing
animates that is not reporting a state change.

- `duration.state` 120ms — a control acknowledging a touch; must land before the
  finger lifts.
- `duration.enter` 220ms — a screen or element arriving.
- `duration.sheet` 320ms — a full-height surface.
- `duration.spin` 1000ms and `duration.pulse` 800ms are the **only two loops in the
  app** (sync spinner, skeleton pulse), and each runs solely while the work it
  describes is in flight.
- `spring.press` (firm, `overshootClamping: true`) carries the tab indicator;
  `spring.settle` is for larger elements. Springs for anything interruptible.
- `press.scale` 0.98 / `press.opacity` 0.94.

Screen transitions live in `navigation/screenAnimations.ts`; tab switches are
instant **by declaration**, not by inheriting a default.

`useReducedMotion()` subscribes to the OS setting. Honouring it means **suppressing
the movement and keeping the change** — a cross-fade instead of a slide, a jump
instead of travel, the dim without the scale. Slowing an animation down is not
honouring it. `docs/motion.md` is the full account.

---

## Content rules (copywriting)

- Short, action-oriented labels: "Record sale", "Add expense", "Raise demand".
- Consistent domain terms: **Sale, Expense, Order, Production order / demand, Stock
  return, Branch, Business day, Sync Center**. Use `SKU` and `Stock code` for
  `MB-001` / `STK-######`; do not call either a barcode.
- No long paragraphs on operational screens — the one deliberate exception is the
  queued-write banner, which needs its three lines.

---

## Do Not Do

- Do not hardcode a colour anywhere in `src/components` — `npm run theme:check`
  fails the build.
- Do not write `isDark ? a : b` in a component; add or use a token.
- Do not use a bare `Pressable`; use `MBPressable`.
- Do not write a `fontSize`, `borderRadius`, margin or padding literal — use
  `type`, `radius`, `space`, `layout`.
- Do not put more than **one** primary CTA on a screen, and never a FAB *and* a
  header add button.
- Do not add a FAB to a screen that *is* the create action (New Sale, New Order) —
  a FAB on a form is a button that opens the screen you are already on. Both Sales
  screens are lists and both carry one.
- Do not invent a tab bar; read `roleConfig.ts`.
- Do not hand-write a drawer list — derive it (`drawerSectionsFor`).
- Do not declare a destination in two places (reaching it from two is fine).
- Do not put an action in the drawer's scrolling list, or a destination in its footer.
- Do not reintroduce a centre action button in the tab bar.
- Do not spec barcode scanning.
- Do not report a queued write as saved, or a refused one as queued.
- Do not animate anything that is not reporting a state change.
- Do not edit `src/shared/` without making the identical edit in
  `mountainbakes-server/src/shared/` and `mountainbakes-frontend/src/shared/`.

---

## Definition of Done

A screen is complete only if:

- [ ] All nine output sections are present
- [ ] Clear layout hierarchy
- [ ] Token-based styling throughout — no literals
- [ ] Loading / empty / error states, and empty ≠ unreachable
- [ ] Offline, queued and refused states specified where the screen writes
- [ ] Exactly one primary CTA, with feedback states
- [ ] Reachable from exactly one navigation surface, declared in `roleConfig.ts`
- [ ] Behaviour stated for every role that can reach it
- [ ] Motion drawn from `theme.motion`, with Reduce Motion handled
- [ ] Implementation-ready component plan naming real `MB*` components
- [ ] `npm run verify` passes (typecheck + shared:check + theme:check +
      splash:check + test)
