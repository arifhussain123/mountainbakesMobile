import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MBButton, MBMoney } from '@/common/ui';
import { space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

import type { OrderBusy, OrderTotals } from '../hooks/useProductionOrderForm';

export interface OrderFooterProps {
  totals: OrderTotals;
  /** Anything that is not the required date — an empty basket, a closed window. */
  error: string | null;
  /** Epoch ms of the draft on this device, or null when there is none. */
  draftSavedAt: number | null;
  busy: OrderBusy;
  currencySymbol?: string;
  /** The required-date field. It lives here, in the block Submit sits in. */
  children?: React.ReactNode;
  onClear: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

/**
 * The required date, the totals, and the three things that can be done with
 * them — v6's footer block, in order.
 *
 * ---------------------------------------------------------------------------
 * Why the date is down here and not up with the order's other facts
 * ---------------------------------------------------------------------------
 * It is the one thing that gates Submit, and it is a foot away from the button
 * it gates. Put it at the top of the screen, above a scrolling catalogue, and a
 * branch that fills a basket and presses Submit gets an error about a field that
 * is no longer on screen — the error and the fix in two different places.
 * v6 keeps them together and that is worth copying exactly.
 *
 * Save draft, in the same block, deliberately does **not** need it: a branch
 * part-way through building a demand has a basket long before it has a delivery
 * date.
 *
 * ---------------------------------------------------------------------------
 * `busy` is one flag with three states, not two booleans
 * ---------------------------------------------------------------------------
 * `'draft' | 'submit' | null` makes "a save is running" and "a submit is
 * running" mutually exclusive by construction, and it is what puts the spinner
 * on the button that is actually working. Two booleans permit a fourth state
 * that means nothing (both true) and reliably produce it the first time someone
 * presses Save draft while a submit is in flight.
 *
 * ---------------------------------------------------------------------------
 * Three buttons, one primary
 * ---------------------------------------------------------------------------
 * v6 draws Clear as an outline, Save draft in the plum and Submit in the ember,
 * which is exactly `ghost` / `secondary` / `primary` here — so the row keeps the
 * design's shape and still has one call to action. Clear takes only the width of
 * its own word, as it does in the mock: it is the button nobody is looking for.
 *
 * The amount is marked an **estimate**, and it is a real one rather than a
 * hedge: a demand carries no money at all server-side, so this figure is the
 * device's own arithmetic over catalogue prices that may be hours stale. It is
 * here so the branch can sanity-check the size of what it is asking for, not so
 * anyone can quote it.
 */
export function OrderFooter({
  totals,
  error,
  draftSavedAt,
  busy,
  currencySymbol,
  children,
  onClear,
  onSaveDraft,
  onSubmit,
}: OrderFooterProps): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const empty = totals.selected === 0;

  return (
    <View
      style={[
        styles.root,
        {
          // v6's footer sits on the page wash rather than on a card, with a
          // single rule between it and the list. `surface` here would read as a
          // second card floating under the table.
          backgroundColor: theme.colors.bg,
          borderTopColor: theme.colors.border,
          paddingHorizontal: theme.layout.screenPad,
          paddingTop: theme.layout.cardPad,
          // The bar is pinned, so the gesture inset is padding rather than
          // margin — a margin would show the list scrolling under a gap.
          paddingBottom: theme.layout.cardPad + insets.bottom,
        },
      ]}>
      {children}

      {error ? (
        <Text
          accessibilityRole="alert"
          style={[theme.type.caption, { color: theme.colors.danger }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.totals}>
        <Total label="Selected" value={String(totals.selected)} />
        <Total label="Total qty" value={String(totals.quantity)} />
        <View style={styles.total}>
          <Text style={[theme.type.caption, styles.totalLabel, { color: theme.colors.textMuted }]}>
            Total amount
          </Text>
          <MBMoney
            value={totals.amount}
            size="md"
            estimate
            color={theme.colors.accent}
            {...(currencySymbol ? { symbol: currencySymbol } : {})}
            testID="order-total"
          />
        </View>
      </View>

      {draftSavedAt ? (
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Draft saved on this device at {clockOf(draftSavedAt)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <MBButton
          label="Clear"
          variant="ghost"
          size="md"
          onPress={onClear}
          disabled={empty || busy !== null}
          testID="clear-order"
        />
        <MBButton
          label="Save draft"
          variant="secondary"
          size="md"
          onPress={onSaveDraft}
          disabled={empty || busy === 'submit'}
          loading={busy === 'draft'}
          accessibilityHint="Keeps this order on the device without sending it"
          style={styles.grow}
          testID="save-draft"
        />
        <MBButton
          label="Submit"
          size="md"
          onPress={onSubmit}
          disabled={empty || busy === 'draft'}
          loading={busy === 'submit'}
          accessibilityHint="Reviews the order before sending it to production"
          style={styles.grow}
          testID="submit-order"
        />
      </View>
    </View>
  );
}

/**
 * One of the two counted totals.
 *
 * `type.money` rather than `type.number`: these sit beside the amount and are
 * read as one row of figures, and a row where two of the three are a size
 * smaller reads as two of them being less important than they are. The colour is
 * `accent` — v6 sets all three in its orange, which is this app's `primary`, and
 * `primary` may never carry type (3.04:1 on a card, against the 4.5:1 a figure
 * someone acts on needs). `accent` is the mark, and it is the brand colour that
 * is actually readable.
 */
function Total({ label, value }: { label: string; value: string }): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={styles.total}>
      <Text style={[theme.type.caption, styles.totalLabel, { color: theme.colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[theme.type.money, { color: theme.colors.accent }]}>{value}</Text>
    </View>
  );
}

/**
 * 'HH:mm' on the device's own clock, and deliberately not Karachi's.
 *
 * Everything the server judges — the business day, the order window — is Karachi
 * time and is labelled as such in the meta grid. This is not that: it is a note
 * about when the person holding this phone pressed a button, and the only clock
 * that answers "did I save this before or after I walked to the counter" is the
 * one on the wall next to them.
 */
function clockOf(epochMs: number): string {
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: { borderTopWidth: 1, gap: space.snug },
  totals: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg },
  total: { gap: space.hair },
  totalLabel: { textTransform: 'uppercase' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
});
