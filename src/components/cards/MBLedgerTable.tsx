import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MBCard } from '@/components/common/MBCard';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';

export interface LedgerColumn {
  key: string;
  /** The column heading. Kept short — it is drawn at caption size in caps. */
  title: string;
  /** Fixed width in dp. Omit to share the remaining space equally. */
  width?: number;
  align?: 'left' | 'right';
}

export interface LedgerCell {
  /** The figure. Drawn tabular, so a column of them aligns. */
  value: string;
  /** A second line under it — the value behind a quantity. */
  note?: string;
  /** Colours the figure. `default` is body ink. */
  tone?: 'default' | 'muted' | 'success' | 'danger' | 'warning';
}

export interface LedgerRow {
  key: string;
  /**
   * A heading printed **above** the row's cells rather than in a column.
   *
   * For a table whose rows are days: the date is not a fifth number competing
   * for width with the four that matter, it is what the row *is*. Stacking it
   * is what lets five numeric columns fit on a 360dp phone at all.
   */
  heading?: string;
  cells: readonly LedgerCell[];
}

export interface MBLedgerTableProps {
  columns: readonly LedgerColumn[];
  rows: readonly LedgerRow[];
  /**
   * Lets the table scroll sideways when its fixed widths exceed the screen.
   *
   * Off by default, and turning it on is a decision rather than a safety net: a
   * table that scrolls horizontally hides columns, and on a phone the column
   * that gets hidden is the last one, which is usually the balance. Prefer
   * `heading` and fewer columns.
   */
  scrollable?: boolean;
  testID?: string;
}

/**
 * A columnar ledger — a stock day line by line, a balance carried forward.
 *
 * ---------------------------------------------------------------------------
 * A table, and not a list of cards, because the columns are the meaning
 * ---------------------------------------------------------------------------
 * Everywhere else in this app a repeated record is a card
 * (`MBListCard`/`MBListRow`), because the reader is looking for *one* of them.
 * Here they are reading **down a column**: previous balance, what came in, what
 * sold, what is left — and the question is whether those four reconcile. Cards
 * put each row's numbers at whatever x-position their labels happen to leave,
 * which is exactly the layout that makes four numbers impossible to add up by
 * eye.
 *
 * Every figure is `type.number`, which is tabular, so digits sit in the same
 * places down the column. That is not cosmetic: a column of proportional digits
 * jitters as values change and defeats the whole reason for the table.
 *
 * ---------------------------------------------------------------------------
 * Tone is the caller's, and the sign is still written
 * ---------------------------------------------------------------------------
 * v4 colours "New stock" green and "Sale" red, which reads as direction rather
 * than as good and bad. This component does not infer either: a screen knows
 * whether a movement is in or out, and the *word* in the row's detail column
 * says which. Colour is never the only signal — this table is read by people
 * reconciling money.
 */
export function MBLedgerTable({
  columns,
  rows,
  scrollable = false,
  testID,
}: MBLedgerTableProps): React.ReactElement {
  const theme = useTheme();

  const TONES = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    success: theme.colors.success,
    danger: theme.colors.danger,
    warning: theme.colors.warning,
  };

  const cellStyle = (col: LedgerColumn) =>
    col.width !== undefined ? { width: col.width } : styles.flexCell;

  const align = (col: LedgerColumn) =>
    col.align === 'right' ? styles.right : styles.left;

  const table = (
    <View style={scrollable ? styles.wide : undefined}>
      {/* The heading rule is heavier than the row rules. It separates a legend
          from data, which is a different kind of boundary from the one between
          two data rows — and without it the first row reads as a heading too. */}
      <View
        style={[
          styles.row,
          {
            gap: theme.space.sm,
            paddingBottom: theme.space.sm,
            borderBottomColor: theme.colors.borderStrong,
          },
          styles.headRule,
        ]}>
        {columns.map(col => (
          <Text
            key={col.key}
            numberOfLines={1}
            accessibilityRole="header"
            style={[theme.type.caption, styles.heading, cellStyle(col), align(col), {
              color: theme.colors.textMuted,
            }]}>
            {col.title.toUpperCase()}
          </Text>
        ))}
      </View>

      {rows.map((row, i) => (
        <View
          key={row.key}
          style={[
            {
              paddingVertical: theme.space.md,
              gap: theme.space.tight,
            },
            i === rows.length - 1
              ? null
              : { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: theme.colors.divider },
          ]}>
          {row.heading ? (
            <Text style={[theme.type.label, { color: theme.colors.text }]}>{row.heading}</Text>
          ) : null}

          <View style={[styles.row, { gap: theme.space.sm }]}>
            {columns.map((col, c) => {
              const cell = row.cells[c];
              return (
                <View key={col.key} style={[cellStyle(col), align(col)]}>
                  <Text
                    numberOfLines={1}
                    style={[
                      theme.type.number,
                      col.align === 'right' ? styles.textRight : null,
                      { color: TONES[cell?.tone ?? 'default'] },
                    ]}>
                    {/* An em dash, not an empty cell: "nothing happened" and
                        "we have no figure" look identical when both are blank,
                        and only one of them reconciles. */}
                    {cell?.value ?? '—'}
                  </Text>
                  {cell?.note ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        theme.type.caption,
                        col.align === 'right' ? styles.textRight : null,
                        { color: theme.colors.textMuted },
                      ]}>
                      {cell.note}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <MBCard style={styles.card} testID={testID}>
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {table}
        </ScrollView>
      ) : (
        table
      )}
    </MBCard>
  );
}

const styles = StyleSheet.create({
  // Vertical padding belongs to the rows, so a rule runs the full width of the
  // content. Same split as `MBListCard`.
  card: { paddingVertical: 0 },
  wide: { minWidth: '100%' },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: space.md },
  flexCell: { flex: 1 },
  left: { alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  textRight: { textAlign: 'right' },
  heading: { letterSpacing: 0.5 },
  /* Heavier than a row rule: it separates a legend from data, which is a
     different kind of boundary from the one between two data rows. */
  headRule: { borderBottomWidth: 1.5 },
});
