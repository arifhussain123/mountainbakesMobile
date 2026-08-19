import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { MBIcon } from '@/components/common/MBIcon';
import { MBPressable } from '@/components/common/MBPressable';
import {
  NAV_LABELS,
  quickActionsFor,
  type AccessProfile,
  type QuickAction,
} from '@/navigation/roleConfig';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';

/**
 * The dashboard's one-tap row.
 *
 * These are the jobs the shift actually does — ring up a sale, order from
 * production, log an expense, check stock — and they sit above the breakdown
 * cards because they matter more than any figure on the screen. A number tells
 * an operator how the day is going; this row is how the day gets done.
 *
 * Every action leads somewhere the role already has (`quickActionsFor` drops
 * anything else), so this is a shorter path to a destination rather than a menu
 * of its own. See `roleConfig.ts` for why that distinction is load-bearing.
 *
 * Renders nothing when a role has no actions declared. Three of the four role
 * groups are in that state deliberately: an invented set of four is worse than
 * an absent one.
 */
export function MBQuickActions({ profile }: { profile: AccessProfile }): React.ReactElement | null {
  const theme = useTheme();
  const navigation = useNavigation<{
    navigate: (name: string, params?: object) => void;
  }>();

  /**
   * `navigate` bubbles: the name is not in the dashboard's own stack, so React
   * Navigation walks up to the tab navigator that does have it. `screen` is
   * passed through to land inside that tab's stack — which is what puts the
   * create form on top of the list it belongs to rather than beside it.
   */
  const go = useCallback(
    (action: QuickAction) => {
      navigation.navigate(action.tab, action.screen ? { screen: action.screen } : undefined);
    },
    [navigation],
  );

  const actions = quickActionsFor(profile);
  if (actions.length === 0) return null;

  return (
    <View style={styles.row}>
      {actions.map(action => {
        const label = NAV_LABELS[action.label];
        return (
          <MBPressable
            key={`${action.tab}:${action.screen ?? ''}`}
            onPress={() => go(action)}
            accessibilityRole="button"
            accessibilityLabel={label}
            testID={`quick-${action.label}`}
            style={[
              styles.card,
              {
                minHeight: theme.layout.tapMin,
                borderRadius: theme.radius.md,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                paddingVertical: theme.space.md,
                gap: theme.space.xs,
              },
            ]}>
            <MBIcon name={action.icon} size="action" color={theme.colors.accent} />
            {/* The label is not optional. New staff have not learned which glyph
                is which, and this row is the first thing they are pointed at. */}
            <Text
              numberOfLines={1}
              style={[theme.type.caption, styles.label, { color: theme.colors.text }]}>
              {label}
            </Text>
          </MBPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  // `flexBasis` at 22% fits four across and wraps to two rows at a large font
  // size rather than squeezing four labels into ellipses.
  card: {
    flexGrow: 1,
    flexBasis: '22%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: { textAlign: 'center' },
});
