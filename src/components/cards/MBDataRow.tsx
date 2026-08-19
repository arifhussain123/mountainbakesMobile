import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';

export interface MBDataRowProps {
  label: string;
  /**
   * A string is drawn with `type.number` — tabular, so a column of them aligns.
   * Anything else is rendered as given, which is how a currency amount arrives:
   * `<MBMoney size="sm" … />`, because `MBMoney` is the only component that
   * renders money.
   */
  value: React.ReactNode;
}

/**
 * A label on the left, a figure on the right, inside a card.
 *
 * This existed as **five byte-identical copies** — one local `DetailRow` in each
 * of the branch, admin, finance, production and reports screens. They were
 * already identical, which is the state a duplicated component is in right up
 * until someone fixes a padding bug in one of them.
 *
 * The consolidation also corrected the hierarchy. Every copy drew the label at
 * `type.body` (15) and the figure at `type.mono` (13), so the label outranked
 * the number it was labelling. It is now a 13px label against a 15px semibold
 * tabular figure: the value is the thing being read, and the label only says
 * what it is.
 */
export function MBDataRow({ label, value }: MBDataRowProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={[styles.row, { paddingTop: theme.space.sm }]}>
      <Text
        numberOfLines={1}
        style={[theme.type.label, styles.flex, { color: theme.colors.textMuted }]}>
        {label}
      </Text>
      {typeof value === 'string' ? (
        <Text style={[theme.type.number, { color: theme.colors.text }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space.md,
  },
});
