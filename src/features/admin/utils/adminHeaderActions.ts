import type { AppHeaderAction } from '@/shared/ui';

/**
 * The web Topbar's actions on a Super Admin page — Search, Appearance
 * (palette + light/dark), Notifications — then the page's own extras and its
 * menu (or close) button. Pure, so the header's crowding rule is tested.
 */

/** Room for the screen title beside the icons, in dp, before the appearance pair folds into one button. */
const TITLE_ROOM = 120;
/** One 40dp header button plus its 8dp gap. */
const BUTTON = 48;
/** The header's 16dp side gutters. */
const GUTTERS = 32;

/** How many header buttons fit beside a readable title at this width; never fewer than four. */
export function headerActionBudget(width: number): number {
  return Math.max(4, Math.floor((width - GUTTERS - TITLE_ROOM) / BUTTON));
}

export interface AdminHeaderParts {
  search: AppHeaderAction;
  /** `useAppearanceHeaderActions()` — palette then moon/sun, or already one button on a narrow screen. */
  appearance: AppHeaderAction[];
  bell: AppHeaderAction;
  /** The page's own header buttons (Reports' Export CSV). */
  extras?: AppHeaderAction[];
  /** Menu on a drawer page; close/back on a pushed one. */
  nav: AppHeaderAction;
  width: number;
}

/**
 * Search, appearance, bell, extras, menu — in the web Topbar's order. When
 * they would crowd the title, the palette and moon/sun fold into the single
 * "Change appearance" button the narrow-screen header already uses (moon/sun
 * icon, opens the appearance sheet). Nothing is ever dropped.
 */
export function composeAdminHeaderActions({ search, appearance, bell, extras = [], nav, width }: AdminHeaderParts): AppHeaderAction[] {
  let look = appearance;
  if (look.length > 1 && 3 + extras.length + look.length > headerActionBudget(width)) {
    const palette = look[0]!;
    const toggle = look[look.length - 1]!;
    look = [{ ...toggle, onPress: palette.onPress, onLongPress: undefined, accessibilityLabel: 'Change appearance' }];
  }
  return [search, ...look, bell, ...extras, nav];
}
