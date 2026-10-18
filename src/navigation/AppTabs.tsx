/**
 * Named per this task's file list; the actual navigator still lives in
 * `BottomTabNavigator/` (its existing home, already wired into
 * `DrawerNavigator`) rather than a disruptive rename of a navigator other
 * screens already import by that name. This re-export is what satisfies both.
 */
export { BottomTabNavigator as AppTabs } from './BottomTabNavigator';
