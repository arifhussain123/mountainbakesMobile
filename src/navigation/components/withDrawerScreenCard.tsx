import type { ComponentType } from 'react';
import { DrawerScreenCard } from './DrawerScreenCard';

/**
 * Wraps a `Drawer.Screen`'s component in `DrawerScreenCard` — the tilt/
 * scale/blur has to be applied around each screen's own content, not via
 * `@react-navigation/drawer`'s built-in overlay/`drawerType`, because
 * `drawerType: 'back'` only changes which side animates (the menu stays put,
 * the screen moves) — the library has no prop for the screen's own
 * transform or a blur-capable overlay.
 *
 * Called once per screen at module scope, not inline in JSX — a `component`
 * prop must stay referentially stable across renders, or React treats it as
 * a brand-new component type and remounts the whole screen (losing its
 * navigation state) every time `DrawerNavigator` itself re-renders.
 */
export function withDrawerScreenCard<P extends object>(Screen: ComponentType<P>): ComponentType<P> {
  function ScreenWithDrawerCard(props: P) {
    return (
      <DrawerScreenCard>
        <Screen {...props} />
      </DrawerScreenCard>
    );
  }
  ScreenWithDrawerCard.displayName = `withDrawerScreenCard(${Screen.displayName ?? Screen.name ?? 'Component'})`;
  return ScreenWithDrawerCard;
}
