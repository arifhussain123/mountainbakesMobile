import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ScreenComponent } from '../screenRegistry';
import { screenAnimation, stackScreenOptions } from '../screenAnimations';

/**
 * Builds the native stack that a tab owns.
 *
 * Every tab gets a stack rather than a bare screen, so a detail or create screen
 * pushes **inside** the tab that owns the resource. That is what gives an order
 * detail a working back path to the order list, and what stops a create form
 * from becoming a top-level destination with nowhere to return to.
 *
 * ---------------------------------------------------------------------------
 * Why this is a factory and not nine files
 * ---------------------------------------------------------------------------
 * The brief lists a file per stack. Seven of those nine would differ only in
 * which component is the root — the same navigator, the same options, copied.
 * That is the duplication the brief itself warns about one section earlier, and
 * copies drift: the day someone adds `animation` or a header option, they add it
 * to the file they happen to be in.
 *
 * So the shape is one factory plus the two stacks that genuinely have more than
 * a root: `OrdersStack` (detail, create-as-modal, print preview) and `MoreStack`
 * (an index plus every secondary destination). Adding a real second screen to
 * any other tab means giving it its own file, and the factory stops being used
 * for it — that is the intended path, not a workaround.
 *
 * Screens own their own chrome (`MBHeader`), so `headerShown` is off: React
 * Navigation's header cannot express the leading-avatar / collapsing-search
 * slots the design needs, and running both would double the safe-area padding.
 * Transitions come from `screenAnimations.ts` — see there for why a modal rises
 * and a card slides, and what Reduce Motion turns them into.
 */

export interface TabStackScreen {
  name: string;
  component: ScreenComponent;
  /** `modal` for create flows — they slide up and dismiss back to the list. */
  presentation?: 'card' | 'modal';
}

const Stack = createNativeStackNavigator();

export function createTabStack(
  rootName: string,
  root: ScreenComponent,
  extra: readonly TabStackScreen[] = [],
): React.ComponentType {
  function TabStack(): React.ReactElement {
    // Read inside the component, not in the factory: the factory runs once per
    // role, and the setting can be toggled at any point after that.
    const reduceMotion = useReducedMotion();
    // Memoised because a fresh options object makes React Navigation re-resolve
    // every screen's options on each render of the stack.
    const screenOptions = React.useMemo(() => stackScreenOptions(reduceMotion), [reduceMotion]);

    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name={rootName} component={root} />
        {extra.map(s => (
          <Stack.Screen
            key={s.name}
            name={s.name}
            component={s.component}
            options={screenAnimation(s.presentation ?? 'card', reduceMotion)}
          />
        ))}
      </Stack.Navigator>
    );
  }
  TabStack.displayName = `TabStack(${rootName})`;
  return TabStack;
}
