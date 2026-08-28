import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBCard } from '@/common/ui/common/MBCard';
import { MBIcon } from '@/common/ui/common/MBIcon';
import { MBPressable } from '@/common/ui/common/MBPressable';
import { MBStatusTag, type MBStatusTagProps } from '@/common/ui/feedback/MBStatusTag';
import type { StatTone } from '@/common/ui/cards/MBStatCard';
import type { IconKey } from '@/common/constants/navigationIcons';
import { useTheme } from '@/common/theme/ThemeProvider';
import { iconSize } from '@/common/theme/iconSizes';
import { layout, space } from '@/common/theme/spacing';

/**
 * A card holding a list of rows, ruled between them.
 *
 * ---------------------------------------------------------------------------
 * This is the shape v4 draws more than any other
 * ---------------------------------------------------------------------------
 * Recent orders, the day's transactions, the expense ledger, the payment
 * breakdown, top sellers, the report index, the settings groups, the FAQ list —
 * eight different screens, one object: a single card whose rows are separated
 * by a hairline that is a step *lighter* than the card's own edge.
 *
 * That weight difference is the whole point and it is why this is a component
 * rather than a `<MBCard>` with children. Rule the rows with `border` — the
 * card's own edge colour — and each row reads as its own card; the screen turns
 * into a stack of boxes and the grouping the card was drawing disappears. The
 * `divider` token exists for this and is used nowhere else.
 *
 * The last row is not ruled. A trailing rule draws a line under the card's
 * bottom padding, which reads as a row that failed to render.
 *
 * ---------------------------------------------------------------------------
 * Padding moves from the card to the rows
 * ---------------------------------------------------------------------------
 * The card keeps its horizontal padding and gives up its vertical padding to
 * the rows, so a rule runs the full width of the *content* rather than stopping
 * short of it, and each row owns its own touch height. That is v4's
 * `padding: 4px 14px` on the card against `padding: 12px 0` on the row.
 */
export interface MBListCardProps {
  children: React.ReactNode;
  /** Drops the card's own lift, for a list nested inside another surface. */
  elevation?: 0 | 1;
  testID?: string;
}

export function MBListCard({
  children,
  elevation = 1,
  testID,
}: MBListCardProps): React.ReactElement {
  const theme = useTheme();
  // `toArray` drops nulls and falses, so a conditionally-rendered row does not
  // leave a rule with nothing under it.
  const rows = React.Children.toArray(children);

  return (
    <MBCard elevation={elevation} testID={testID} style={styles.card}>
      {rows.map((row, i) => (
        <View
          key={i}
          style={
            i === rows.length - 1
              ? null
              : { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: theme.colors.divider }
          }>
          {row}
        </View>
      ))}
    </MBCard>
  );
}

export interface MBListRowProps {
  title: string;
  /** One line under the title — a category, a time, a branch, a count. */
  subtitle?: string;
  /**
   * Leading mark, at most one of three. All three are v4's, and each says
   * something different about the list:
   *
   *   `icon`     a kind — an expense category, a report, a settings group
   *   `initials` an instance — a payment method, a person, a till
   *   `rank`     a position — a ranked list, where the number *is* the leading
   *              information and a glyph beside it would compete with it
   */
  icon?: IconKey;
  /** The pastel the glyph square wears. Decorative — see `MBStatCard.tone`. */
  iconTone?: StatTone;
  initials?: string;
  rank?: number;
  /**
   * The figure on the right. A string is drawn with `type.number` — tabular, so
   * a column of them aligns down the card. Anything else is rendered as given,
   * which is how money arrives: `<MBMoney size="sm" …>`.
   */
  value?: React.ReactNode;
  /** Colours a string `value`. Ignored when `value` is a node. */
  valueTone?: 'default' | 'success' | 'danger' | 'muted';
  /** A status pill under the value, or in its place. */
  tag?: MBStatusTagProps;
  /** Adds a trailing chevron. Implies the row goes somewhere. */
  onPress?: () => void;
  /**
   * Overrides the row's accessible name. The default joins every visible part
   * in reading order, so a reader gets the whole row in one stop rather than
   * four unrelated announcements.
   */
  accessibilityLabel?: string;
  testID?: string;
}

/** One row inside an `MBListCard`. */
export function MBListRow({
  title,
  subtitle,
  icon,
  iconTone = 'brand',
  initials,
  rank,
  value,
  valueTone = 'default',
  tag,
  onPress,
  accessibilityLabel,
  testID,
}: MBListRowProps): React.ReactElement {
  const theme = useTheme();

  const TONES: Record<StatTone, { fg: string; bg: string }> = {
    brand: { fg: theme.colors.accent, bg: theme.colors.primarySoft },
    success: { fg: theme.colors.success, bg: theme.colors.successBg },
    danger: { fg: theme.colors.danger, bg: theme.colors.dangerBg },
    warning: { fg: theme.colors.warning, bg: theme.colors.warningBg },
    info: { fg: theme.colors.info, bg: theme.colors.infoBg },
  };

  const VALUE_TONES = {
    default: theme.colors.text,
    success: theme.colors.success,
    danger: theme.colors.danger,
    muted: theme.colors.textMuted,
  };

  const spoken =
    accessibilityLabel ??
    [rank ? `${rank}.` : '', title, subtitle, typeof value === 'string' ? value : '', tag?.label]
      .filter(Boolean)
      .join(', ');

  const body = (
    <View style={[styles.row, { minHeight: layout.tapMin, gap: theme.space.md }]}>
      {rank !== undefined ? (
        <Text style={[theme.type.number, styles.rank, { color: theme.colors.text }]}>{rank}</Text>
      ) : null}

      {initials ? (
        <View
          style={[
            styles.mark,
            { backgroundColor: TONES[iconTone].bg, borderRadius: theme.radius.pill },
          ]}>
          <Text style={[theme.type.label, { color: TONES[iconTone].fg }]}>{initials}</Text>
        </View>
      ) : icon ? (
        <View
          style={[
            styles.mark,
            { backgroundColor: TONES[iconTone].bg, borderRadius: theme.radius.icon },
          ]}>
          <MBIcon name={icon} size="action" color={TONES[iconTone].fg} />
        </View>
      ) : null}

      <View style={[styles.main, { gap: theme.space.hair }]}>
        <Text numberOfLines={1} style={[theme.type.cardTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value !== undefined || tag ? (
        <View style={[styles.trailing, { gap: theme.space.hair }]}>
          {typeof value === 'string' ? (
            <Text style={[theme.type.number, { color: VALUE_TONES[valueTone] }]}>{value}</Text>
          ) : (
            value
          )}
          {tag ? <MBStatusTag {...tag} /> : null}
        </View>
      ) : null}

      {onPress ? (
        <MBIcon name="chevron" size="action" color={theme.colors.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={spoken} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <MBPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      testID={testID}
      /* `opacity`, not the default scale. A row inside a card is bounded on
         three sides by its neighbours, and scaling it pulls its rules away from
         the ones above and below — the card looks like it came apart. */
      feedback="opacity">
      {body}
    </MBPressable>
  );
}

const styles = StyleSheet.create({
  // The card gives up its vertical padding to the rows. See the component doc.
  card: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  main: { flex: 1 },
  // Fixed width so a column of ranks aligns however many digits each has.
  rank: { width: 20, textAlign: 'center' },
  mark: {
    width: iconSize.statCard + 6,
    height: iconSize.statCard + 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailing: { alignItems: 'flex-end' },
});
