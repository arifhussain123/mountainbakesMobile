# Mobile responsiveness audit

**No emulator, iOS simulator, or authorized device test pass was performed for this
audit** — this environment has no Android emulator/iOS simulator, and the only connected
device (`adb devices` → one Android phone) is the project owner's personal handset in live
use; per this session's own working agreement, it's read-only (`screencap` only, never
`input tap`/keyevent, never a debug-build install) unless explicitly authorized for a
specific session. Everything below is a CODE-LEVEL check — static analysis of layout
patterns that are known overflow/clipping risks — not a verified render on any device or
screen size. Treat findings here as "a real device test should check this," not "confirmed
broken" or "confirmed fine."

## What was checked

1. `grep` for hardcoded large pixel `width`/`height` values that could exceed a small phone's
   screen (nothing above `maxWidth`/`maxHeight` guards found across `src/features`).
2. `Dimensions.get(...)` usage — none found anywhere in `src/` outside this doc, meaning no
   screen computes its own layout against a captured device size that could go stale on
   rotation or a different device; everything uses Flexbox/percentage sizing instead.
3. Safe-area handling — centralized in one shared `Screen` component
   (`src/shared/ui/Screen/Screen.tsx`, wraps `SafeAreaView` from
   `react-native-safe-area-context`) that every screen in the app uses as its outer
   container, rather than each screen handling insets itself. This is the right pattern —
   a missed safe-area edge case only needs fixing in one place.
4. Scrollability — of the app's 52 screen files, 41 use `ScrollView`/`FlatList`/`SectionList`
   directly; the other 11 were checked individually:
   - 9 are form screens rendered as `*SheetContent` components inside a `FormBottomSheet`
     (`src/shared/ui/FormBottomSheet`), which wraps its children in `BottomSheetScrollView`
     — they scroll correctly, just not via a `ScrollView` import in their own file.
   - 2 (`SettingsScreen`, `ProfileScreen`) are short, fixed-size screens (39 and 45 lines)
     with low overflow risk even without scroll.
   - None render unbounded dynamic content without a scroll container.
5. Keyboard handling — `FormBottomSheet` sets `keyboardBehavior="extend"`,
   `keyboardBlurBehavior="restore"`, and `android_keyboardInputMode="adjustResize"` once,
   centrally, rather than each form re-implementing keyboard avoidance. 7 other call sites
   use `KeyboardAvoidingView` directly for non-sheet forms.
6. Radial-glow backgrounds — the design files use CSS `radial-gradient`, which React
   Native's `LinearGradient` cannot reproduce exactly (RN only draws linear gradients). The
   shared `Screen` component documents this explicitly and approximates each radial glow
   with a diagonal linear gradient anchored at the same corner — a genuine, documented
   platform limitation, not an oversight, and the closest faithful native equivalent was
   implemented per this audit's own rule 15 ("If the HTML design and the native
   implementation differ because of a genuine platform limitation, document the limitation
   and implement the closest faithful native equivalent").
7. `FlatList` key safety — every `<FlatList>` in `src/features` has a `keyExtractor` (no
   missing-key risk that would cause list re-render bugs on dynamic data).

## Known limitations not checked (require an actual device/emulator)

- Real font rendering/line-wrap at different system font-scale settings.
- Actual keyboard-covers-input behavior on a real device (code pattern is correct per above,
  but only a device confirms it).
- Landscape orientation (the app does not appear to lock orientation anywhere, but no
  landscape layouts were specifically designed or tested).
- Tablet-width layouts (every design mockup is a 380×800 phone frame; nothing in the design
  files or the codebase targets a tablet breakpoint specifically).
- Low-end Android devices' actual scroll/animation performance.

## Summary

No responsiveness bugs were found by code-level inspection. This is a meaningfully weaker
claim than "verified on device" — it means the known failure patterns (hardcoded Dimensions
math, unscrollable long content, duplicated unsafe safe-area handling, missing FlatList
keys) are not present, not that every screen has been seen rendered. A real device pass
(this project owner's own phone, with explicit authorization, or a freshly set-up emulator)
is the recommended next step before calling this fully verified.
