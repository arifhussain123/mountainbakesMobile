import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MBIcon } from '@/common/ui/common/MBIcon';
import { MBPressable } from '@/common/ui/common/MBPressable';
import type { IconKey } from '@/common/constants/navigationIcons';
import { useTheme } from '@/common/theme/ThemeProvider';
import { space } from '@/common/theme/spacing';

export interface MBFabProps {
  /** What it announces, and what an extended FAB prints. e.g. "Add expense". */
  label: string;
  icon?: IconKey;
  onPress: () => void;
  /**
   * Show the label beside the glyph. On for anything a new member of staff has
   * to find without being shown; off only where the icon is unambiguous in
   * context.
   */
  extended?: boolean;
  /**
   * Greys the button out and stops it answering, without removing it.
   *
   * For a create action that is genuinely unavailable right now rather than
   * unavailable to this account — the production counter sale, which posts
   * straight to the server and cannot be queued, so with no connection there is
   * nothing for a tap to do. Hiding it instead would leave an operator hunting
   * for a control that was there five minutes ago; dimming it says the counter
   * is shut until the signal returns, which is the true state of affairs.
   *
   * A FAB an account may never use is a different matter and does not belong on
   * the screen at all — see the note above about advertising what cannot answer.
   */
  disabled?: boolean;
  testID?: string;
}

/**
 * The screen's one dominant create action.
 *
 * ---------------------------------------------------------------------------
 * One per screen, and never beside a second way to do the same thing
 * ---------------------------------------------------------------------------
 * A FAB earns its place by being the single obvious thing to do here — new
 * sale, new order, add expense. A screen with a FAB *and* a header add button
 * has two controls competing to be that one thing, and staff learn neither.
 * The same goes for an empty state's call to action: where a screen has both,
 * only one is on screen at a time (the empty state carries the instruction while
 * the list is empty; the FAB takes over once there is something to scroll).
 *
 * It replaced a full-width button sitting in a band above the list. That band
 * cost a row of content on every screen, every day, to hold a control that is
 * used once or twice a shift.
 *
 * Position is relative to the screen, not the window: a tab navigator lays its
 * screens out above the tab bar, so the bar is not something to offset around.
 * Inside a modal or a stack screen with no tab bar, the same offset is measured
 * from the bottom of the screen and still lands clear of the gesture area.
 */
export function MBFab({
  label,
  icon = 'add',
  onPress,
  extended = false,
  disabled = false,
  testID,
}: MBFabProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <MBPressable
        onPress={onPress}
        disabled={disabled}
        // Dimming belongs to the press layer, not to `style`: the two are the
        // same property, and whichever were applied last would silently win.
        restOpacity={disabled ? 0.5 : 1}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        testID={testID}
        style={({ pressed }) => [
          styles.fab,
          // e3 in light; dark mode's shadow tokens are deliberately empty — that
          // scheme separates layers with borders, and a primary-filled circle on
          // `bg` needs no help standing off it.
          theme.shadows.e3,
          {
            minHeight: theme.layout.tapMin + 8,
            minWidth: theme.layout.tapMin + 8,
            borderRadius: theme.radius.pill,
            backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary,
            paddingHorizontal: extended ? theme.space.lg : theme.space.md,
            marginRight: theme.layout.screenPad,
            marginBottom: theme.layout.screenPad,
          },
        ]}>
        <MBIcon name={icon} size="header" color={theme.colors.onPrimary} />
        {extended ? (
          <Text style={[theme.type.label, { color: theme.colors.onPrimary }]} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
      </MBPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // `box-none` so the layer itself never eats a touch meant for the list under
  // it — only the button is tappable.
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
});
