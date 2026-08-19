import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/**
 * Screen transitions, in one place.
 *
 * Every stack in the app reads its animation from here, so "how a screen
 * arrives" is a single decision rather than a per-file default. Before this,
 * each navigator took whatever `createNativeStackNavigator` happened to do on
 * the platform — which is not the same on Android as on iOS, and is not the same
 * between React Navigation minor versions.
 *
 * ---------------------------------------------------------------------------
 * Why these particular animations
 * ---------------------------------------------------------------------------
 * The direction of travel is the only thing carrying the hierarchy on a screen
 * with no visible back button in the header (this app's screens draw their own
 * chrome through `MBHeader`, and a tab root has no back affordance at all):
 *
 *   push   slides from the right — deeper into the tab that owns the resource
 *   modal  slides from the bottom — a create flow layered over its list, which
 *          is why New Order and the expense form come up rather than across
 *
 * These are the **native** animators (`slide_from_right`, `slide_from_bottom`),
 * not JS-driven ones: they run on the platform's own transition, so a slow
 * device drops the animation rather than the touch handling.
 *
 * ---------------------------------------------------------------------------
 * Reduce Motion
 * ---------------------------------------------------------------------------
 * `fade` is the substitute, never `none` and never a slower slide. The screen
 * must still visibly change — a change with no transition at all reads as a
 * glitch, and the setting asks for less travel, not less feedback. Slowing the
 * slide down would be the same movement for longer, which is the opposite of
 * what was asked for.
 */

export type ScreenPresentation = 'card' | 'modal';

export function screenAnimation(
  presentation: ScreenPresentation,
  reduceMotion: boolean,
): NativeStackNavigationOptions {
  if (presentation === 'modal') {
    return {
      presentation: 'modal',
      animation: reduceMotion ? 'fade' : 'slide_from_bottom',
      // The list underneath stays mounted, so dismissing returns to it with
      // scroll position and any in-flight query intact.
      gestureEnabled: true,
    };
  }

  return {
    animation: reduceMotion ? 'fade' : 'slide_from_right',
    // The back-swipe is what makes a header-less screen navigable one-handed.
    // It is on for cards only; the tab bar's left edge has nothing behind it.
    gestureEnabled: true,
  };
}

/**
 * Options shared by every native stack in the app.
 *
 * `headerShown: false` is not a style choice: screens draw their own chrome with
 * `MBHeader`, which has slots (the account avatar, the sync pill, a collapsing
 * search) that React Navigation's header cannot express — and running both would
 * apply the safe-area top inset twice.
 *
 * `freezeOnBlur` stops a covered screen re-rendering. A native stack keeps every
 * screen below the top one mounted — that is what preserves the list's scroll
 * position behind a detail view — but mounted also means still subscribed, so a
 * sync drain or a reconnect refetch used to re-render the whole catalogue
 * underneath a form nobody could see through. The state survives either way;
 * only the rendering waits until the screen is on top again.
 */
export function stackScreenOptions(reduceMotion: boolean): NativeStackNavigationOptions {
  return {
    headerShown: false,
    freezeOnBlur: true,
    ...screenAnimation('card', reduceMotion),
  };
}

/**
 * There is deliberately no drawer entry here.
 *
 * `@react-navigation/drawer` v7 animates the panel with its own internal spring
 * and exposes **no** duration, curve or disable option — `drawerType` changes
 * how it moves, not whether it does. So the account panel cannot honour Reduce
 * Motion through config, and inventing a `drawerMotion()` helper that maps to no
 * real prop would only look like it did. Its appearance is instead kept cheap:
 * `drawerType: 'front'` slides the panel alone rather than the whole scene.
 */
