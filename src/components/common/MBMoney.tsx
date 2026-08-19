import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCompact, formatCurrency } from '@/utils/money';
import { space } from '@/theme/spacing';

export type MoneySize = 'lg' | 'md' | 'sm';

export interface MBMoneyProps {
  /**
   * The raw value, exactly as it arrived. `numeric(14,2)` reaches the client as
   * a JSON **string** through PostgREST, so `"1250.00"` is normal and is handled
   * by `toNumber` inside the formatter.
   */
  value: unknown;
  /**
   * `md` (`type.money`) is the default — a total someone acts on. `lg`
   * (`type.moneyLg`) is for a single hero figure. `sm` (`type.number`) is the
   * secondary amount in a row or a receipt line.
   *
   * All three are tabular. `sm` in particular replaced `type.body` on the
   * subtotal/discount/tax rows of the checkout, where non-tabular digits meant
   * the one column a cashier reads down did not line up.
   */
  size?: MoneySize;
  color?: string;
  /**
   * Marks a figure this device worked out that the server has not confirmed.
   *
   * Not decoration, and not for every total: use it where the server will
   * recompute the number and could legitimately disagree. See the component doc.
   */
  estimate?: boolean;
  /** `Rs. 1.2M` for a tile with no room. Never for a figure someone must act on. */
  compact?: boolean;
  /**
   * A ledger direction marker, drawn before the amount.
   *
   * `in` renders `+`, `out` a real minus sign (U+2212, not a hyphen — a hyphen
   * at money size reads as a dash and sits at the wrong height). The direction
   * is also spelled out in the accessible name, because the sign is a one-glyph
   * difference between a debit and a credit.
   */
  sign?: 'in' | 'out';
  /**
   * The tenant's symbol, from `useCatalogSettings()`. Falls back to the
   * `CURRENCY_SYMBOL` constant.
   *
   * Deliberately a prop rather than something this component fetches. Reading
   * settings here would put a `useQuery` inside every money figure in the app —
   * one subscription per row of a list — and would make a leaf that renders a
   * string require a `QueryClientProvider` to mount at all. The screen already
   * holds the settings; it passes them down.
   */
  symbol?: string;
  numberOfLines?: number;
  /** Shrink to fit rather than truncate — for a fixed-width tile. */
  adjustsFontSizeToFit?: boolean;
  testID?: string;
}

/**
 * The only component that renders currency.
 *
 * ---------------------------------------------------------------------------
 * Representation
 * ---------------------------------------------------------------------------
 * The backend stores money as Postgres `numeric(14,2)` — **not** integer minor
 * units (migration 20260719000001 moved off floats for exactly this reason). So
 * a value here is a decimal amount, and it may arrive as a string. Nothing in
 * this component does arithmetic: it formats what it is given. Totals are
 * computed in `utils/saleTotals.ts`, in one place, mirroring the server's order
 * of operations.
 *
 * Figures use tabular figures (`type.money` / `type.moneyLg`) so a column of
 * them lines up and does not jitter as values change.
 *
 * ---------------------------------------------------------------------------
 * `estimate` is a fact about this app, not a hedge
 * ---------------------------------------------------------------------------
 * `POST /api/orders/pos` **recomputes** subtotal, discount, tax and grand total
 * from the line items using the server's own tax settings — it does not store
 * the total the client sent. The device's figure comes from `AppSettings` it has
 * cached, so a stale `gstEnabled` / `gstRate` produces a counter display that
 * differs from the sale the server records. `useCatalogSettings` says the same
 * thing from the other side: tax defaults to OFF before settings load, because
 * "the server recomputes and returns the authoritative figure either way".
 *
 * A cart total is therefore genuinely provisional, and that is what `estimate`
 * marks. It is not for every number on the screen — a price read straight off a
 * product, or an expense the operator typed themselves, is not an estimate, and
 * marking it one would make the label mean nothing by the time it matters.
 */
export function MBMoney({
  value,
  size = 'md',
  color,
  estimate = false,
  compact = false,
  sign,
  symbol,
  numberOfLines,
  adjustsFontSizeToFit,
  testID,
}: MBMoneyProps): React.ReactElement {
  const theme = useTheme();

  const formatted = compact ? formatCompact(value, symbol) : formatCurrency(value, symbol);
  const text = sign ? `${sign === 'in' ? '+' : '\u2212'}${formatted}` : formatted;
  const style =
    size === 'lg' ? theme.type.moneyLg : size === 'sm' ? theme.type.number : theme.type.money;

  const amount = (
    <Text
      testID={testID}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={adjustsFontSizeToFit ? 0.7 : undefined}
      // The screen reader gets the qualifier first: hearing the number and then
      // "estimate" is the wrong order when the number is what gets acted on.
      accessibilityLabel={accessibleName({ estimate, sign, formatted })}
      style={[style, { color: color ?? theme.colors.text }]}>
      {text}
    </Text>
  );

  if (!estimate) return amount;

  return (
    <View style={styles.row}>
      {amount}
      <Text
        // Hidden: the amount above already announces itself as estimated, and
        // repeating the word is noise on a screen read out one row at a time.
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        Estimate
      </Text>
    </View>
  );
}

/**
 * What the screen reader says, or `undefined` to let it read the text.
 *
 * Qualifiers come first: hearing the number and only then "estimate", or a `+`
 * that may not be announced at all, is the wrong order when the number is the
 * thing being acted on.
 */
function accessibleName({
  estimate,
  sign,
  formatted,
}: {
  estimate: boolean;
  sign?: 'in' | 'out';
  formatted: string;
}): string | undefined {
  const parts: string[] = [];
  if (estimate) parts.push('Estimated');
  if (sign) parts.push(sign === 'in' ? 'in' : 'out');
  if (parts.length === 0) return undefined;
  return `${parts.join(' ')} ${formatted}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: space.tight },
});
