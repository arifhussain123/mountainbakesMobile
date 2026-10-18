import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { create } from 'zustand';

/**
 * Screens that want the bar out of the way while they're focused (Create
 * Order, New Sale POS, Stock Check, Count) register a reason here rather than
 * the bar hard-coding their route names — a *set* of reasons, not a boolean,
 * because two such screens can be focused in quick succession (e.g. a modal
 * push) and the bar must not reappear until the last one clears.
 *
 * This is the real mechanism behind the brief's "`hideTabBar` screen option,
 * not hard-coded route names": React Navigation only hands a custom
 * `tabBar` component the TOP-LEVEL tab screen's own options, not a screen
 * nested several stacks deep (Create Order lives inside the Orders tab's
 * stack, not as the tab's own screen) — so a per-screen focus hook is what
 * actually reaches the bar, with the declarative call (`useHideTabBarOnFocus()`)
 * living on the screen, exactly where `hideTabBar: true` would have.
 */
const useTabBarHideReasons = create<{ reasons: Set<string>; add: (id: string) => void; remove: (id: string) => void }>((set, get) => ({
  reasons: new Set(),
  add: (id) => set({ reasons: new Set(get().reasons).add(id) }),
  remove: (id) => {
    const next = new Set(get().reasons);
    next.delete(id);
    set({ reasons: next });
  },
}));

let nextHideId = 0;

/** Call from a screen that must hide the tab bar while it's focused (Create Order, New Sale, Stock Check, Count, full-screen sheets). */
export function useHideTabBarOnFocus(): void {
  useFocusEffect(() => {
    const id = `hide-${nextHideId++}`;
    useTabBarHideReasons.getState().add(id);
    return () => useTabBarHideReasons.getState().remove(id);
  });
}

/**
 * The bar's own combined visibility: hidden while the keyboard is open OR
 * while any focused screen has called `useHideTabBarOnFocus`. Reduce-motion
 * users get an instant show/hide; everyone else gets the 200ms slide the
 * brief asks for, handled by the caller's own animated style.
 */
export function useTabBarVisibility(): boolean {
  const hiddenByScreen = useTabBarHideReasons((s) => s.reasons.size > 0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return !hiddenByScreen && !keyboardVisible;
}
