# Motion

Every animation in the app, what it is telling the user, and what happens to it
when the OS asks for less. Screen *structure* is in `docs/navigation.md`; what a
screen is made of is in `docs/screen-patterns.md`.

## The rule

**Motion communicates a state change. Anything else is cost without benefit.**

This app is used standing up, in a shop, dozens of times a shift. An animation a
cashier has to sit through is a tax charged once per sale — so nothing here
animates to look designed. Every moving thing on the list below answers a
question the user just asked: *did that register?*, *where did this screen come
from?*, *is it still syncing?*

Concretely, and this is enforced by review rather than by a linter:

- no bounce or overshoot on anything a finger drives
- no parallax or collapsing-on-scroll headers — `MBHeader` is a fixed height and
  its search field expands in place
- no confetti, no success animations; a saved sale says so in words
- no continuously animating decoration. The two loops in the app (the sync
  spinner, the skeleton pulse) run **only while the work they describe is
  actually in flight** and stop the moment it ends
- no animated counters, no charts that draw themselves, no cards sliding in as
  a list scrolls

## Tokens

`src/common/theme/motion.ts` is the only place a duration or a curve is written down,
reachable as `theme.motion`. The reason is the same as for `space`: three
developers each picking "about 200ms, feels right" is how one app ends up with
four senses of speed.

| Token | Value | What it is for |
|---|---|---|
| `duration.state` | 120ms | A control acknowledging a touch |
| `duration.enter` | 220ms | A screen or element arriving |
| `duration.sheet` | 320ms | A surface travelling the full height of the screen |
| `duration.spin` | 1000ms | One turn of the sync glyph |
| `duration.pulse` | 800ms | Half a skeleton pulse |
| `press.scale` / `press.opacity` | 0.98 / 0.94 | How far a control moves and dims while held |
| `spring.press` | firm, clamped | The tab indicator travelling between slots |
| `spring.settle` | a trace of overshoot | Larger elements settling into place |

`spring.press` and `press` are not the same thing and are not used together: the
spring carries a journey that can be interrupted mid-flight, the amounts describe
a control under a finger. A press has a known end — the finger lifting — so it
runs on `timing.state` and there is nothing for physics to settle.

## Where motion actually happens

### Screen transitions — native

`src/navigation/screenAnimations.ts` owns every stack's animation, so "how a
screen arrives" is one decision rather than a per-navigator default (which is
not the same on Android as on iOS, nor between React Navigation minors).

- **push** slides from the right — deeper into the tab that owns the resource
- **modal** slides from the bottom — a create flow layered over its list, which
  is why New Order and the expense form come up rather than across

Both are the platform's own animators (`slide_from_right`, `slide_from_bottom`),
not JS-driven ones, so a slow device drops the animation rather than the touch
handling.

### Tab switches — instant

Switching tabs does not animate, and `RoleTabs` now says so (`animation: 'none'`)
rather than inheriting it. The four tabs are four places the user is already in;
there is nothing for a transition to explain, only a delay to sit through. The
only thing that moves is the indicator pill in `MBTabBar`, which travels on
`spring.press` — a spring rather than a curve so that tapping a third tab
mid-travel picks up from where the pill actually is instead of restarting.

### The account drawer — slide

`drawerType: 'front'`, so the panel slides in over the scene rather than pushing
it. **`@react-navigation/drawer` v7 exposes no duration, curve or disable
option** — its motion is internal. That is the one place in the app Reduce Motion
cannot be honoured through configuration, and inventing a `drawerMotion()` helper
that maps to no real prop would only look like it had been.

### Press feedback — `MBPressable`

Every tappable surface in the app is `MBPressable`
(`src/common/ui/common/MBPressable.tsx`). It scales to **0.98** with a small
opacity shift over **120ms**, in and out.

It is a component rather than a convention because the alternative was already
running: a background swap on cards, a different pressed colour on buttons, a
0.6 dim on iOS tabs, and nothing at all on the chips and stepper buttons that get
tapped most. A control that answers differently depending on which screen it is
on teaches staff nothing, and the ones answering with silence read as broken on a
slow handset.

The transform runs on Reanimated, on the UI thread, so it survives a JS thread
busy re-rendering a list under the finger. `Pressable`'s own `pressed` flag is a
step function — fine for a colour, which reads as a state; wrong for a transform,
which reads as a movement.

Two rules on top of the animation:

- **Colour is for state that outlives the touch.** Selection and status still
  change colour. The press itself does not — `MBCard` and the More rows used to
  darken to `surfaceSunken` while held, which alongside the scale and dim read as
  two separate things happening to one surface. Filled brand controls (`MBButton`,
  `MBFab`) keep their darker pressed fill, because that is the control's own spec
  rather than a generic touch acknowledgement.
- **`restOpacity`, not `style`, dims a disabled control.** They are the same
  property, so whichever landed last in the style array would silently win.

`feedback="opacity"` drops the scale for a surface where shrinking would be wrong
— the dismissable banners on Sales, New Order and Expenses, where a full-width
band pulling in at its edges reads as the message shrinking. `feedback="none"` is
for a wrapper that is tappable but is not itself the control.

`MBTabBar` is the one deliberate exception: it keeps Android's borderless ripple
and an iOS dim, because the tab bar is the one surface where the platform
convention is stronger than the app's, and the indicator already answers the tap.

### Loops

Two, both tied to work actually being in flight:

- **the sync glyph** turns while a drain is running, started by the phase going
  to `syncing` and cancelled the moment it leaves. An indicator that spins at
  rest is the animation staff learn to stop reading
- **the skeleton pulse** breathes while a screen's first load is outstanding, and
  is replaced by content rather than faded out

### Bottom sheets — not built yet

`@gorhom/bottom-sheet` is a dependency and **nothing uses it**; the flows the
brief wants in sheets are full-screen `Modal`s today. When the first one lands it
takes `timing.sheet` for a plain open/close and `spring.settle` for a snap point
a finger has thrown, and it declares them through the library's
`animationConfigs`. See `docs/screen-patterns.md` § Sheets and modals for why the
conversion is its own change and not a like-for-like swap.

## Reduce Motion

`useReducedMotion()` (`src/common/hooks/useReducedMotion.ts`) reports the OS setting —
"Remove animations" on Android, "Reduce Motion" on iOS — and **subscribes** to it
rather than sampling once, so someone who turns it on because an animation is
making them ill does not have to kill and reopen the app.

It subscribes **once for the whole app**, not once per caller. `MBPressable`
reads it, and `MBPressable` is every tappable surface — so a screen scrolling a
few hundred product rows used to attach a few hundred native listeners and fire a
few hundred async bridge reads of one process-wide boolean, each costing a state
update when it landed. The value now lives at module scope behind
`useSyncExternalStore`: one listener, one read, every consumer off the same
snapshot. The subscription is ref-counted, so it detaches when the last consumer
unmounts.

The principle is **suppress the movement, keep the change**:

| Surface | With Reduce Motion on |
|---|---|
| Stack push / modal | Cross-fades. Never `none`, never a slower slide |
| Tab indicator | Jumps to the new slot instead of travelling |
| Press feedback | Keeps the opacity shift, drops the scale |
| Sync spinner | Static glyph; the label still says "Syncing…" |
| Skeleton | Static block at its resting opacity |
| Account drawer | Unchanged — the library exposes no control (see above) |

Two things this explicitly does not mean. **Slowing an animation down is not
honouring the setting** — it is the same movement for longer. And removing the
acknowledgement entirely is not either: a control that stops answering a touch is
one the user taps twice, and on the sale button a second tap is a duplicate
transaction. The setting asks for less movement, not less feedback.

The rule lives in `pressTargets()` in `MBPressable`, which is a pure function
precisely so it can be tested — under the Reanimated Jest mock an animation
resolves to its target instantly and the rendered style tells you nothing about
the decision that produced it.
