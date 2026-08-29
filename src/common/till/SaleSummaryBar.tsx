import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MBButton, MBMoney } from '@/common/ui';
import { space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

import type { SaleBusy } from './types';

export interface SaleSummaryBarProps {
  itemCount: number;
  total: number;
  currencySymbol?: string;
  /** Anything that has to be said before the next tap. */
  error?: string | null;
  disabled?: boolean;
  busy?: SaleBusy;
  /** Given on the items stage. Mutually exclusive with the two finishes. */
  onCharge?: () => void;
  onSave?: () => void;
  onSaveAndShare?: () => void;
  /**
   * What the two finishes are called. The production counter's staff sale takes
   * no money, so "Save sale" would be the wrong verb for it — it is *recorded*,
   * not paid for.
   */
  saveLabel?: string;
  shareLabel?: string;
}

/**
 * The till's running total and its one forward action, pinned to the bottom of
 * both stages.
 *
 * ---------------------------------------------------------------------------
 * Same place, every tap
 * ---------------------------------------------------------------------------
 * A cashier ringing up a queue is not reading the screen; they are hitting a
 * position. The total and the button that moves the sale on therefore live in a
 * fixed bar rather than at the end of a scroll, so nothing the cart does can
 * move the next tap — and the figure being charged is never off screen when the
 * button that charges it is pressed.
 *
 * The bar changes what it offers per stage and not where it is: **Charge** while
 * items are being rung up, the two finishes once payment is being taken. Going
 * back is the header's arrow, deliberately and not a third control here — a
 * second way to do exactly what the back arrow does is a button competing with
 * the platform's own affordance for the same job.
 *
 * The total is marked an estimate throughout. `POST /api/orders/pos` recomputes
 * subtotal, discount, tax and grand total from the line items using the server's
 * own tax settings, and this device is working from cached `AppSettings` — so a
 * stale `gstRate` produces a counter figure that differs from the sale actually
 * recorded. It is provisional until the sale comes back confirmed, and saying so
 * is what stops a cashier quoting it as final.
 */
export function SaleSummaryBar({
  itemCount,
  total,
  currencySymbol,
  error,
  disabled = false,
  busy = null,
  onCharge,
  onSave,
  onSaveAndShare,
  saveLabel = 'Save sale',
  shareLabel = 'Save & share',
}: SaleSummaryBarProps): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const charging = onCharge !== undefined;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingHorizontal: theme.layout.screenPad,
          paddingTop: theme.layout.cardPad,
          // Pinned, so the gesture inset is padding rather than margin — a
          // margin would show the list scrolling under a gap.
          paddingBottom: theme.layout.cardPad + insets.bottom,
        },
      ]}>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[theme.type.caption, { color: theme.colors.danger }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.totals}>
        <Text style={[theme.type.label, styles.count, { color: theme.colors.textMuted }]}>
          {charging
            ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`
            : 'Grand total'}
        </Text>
        <MBMoney
          value={total}
          size={charging ? 'md' : 'lg'}
          estimate
          symbol={currencySymbol}
          testID="cart-total"
        />
      </View>

      {charging ? (
        <MBButton
          label="Charge"
          onPress={onCharge}
          disabled={disabled}
          fullWidth
          testID="charge"
        />
      ) : (
        <View style={styles.finishes}>
          <MBButton
            label={saveLabel}
            variant="secondary"
            onPress={onSave}
            disabled={disabled || busy === 'share'}
            loading={busy === 'save'}
            style={styles.grow}
            testID="save-sale"
          />
          <MBButton
            label={shareLabel}
            onPress={onSaveAndShare}
            disabled={disabled || busy === 'save'}
            loading={busy === 'share'}
            accessibilityHint="Records the sale, then opens a slip you can send"
            style={styles.grow}
            testID="save-and-share"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderTopWidth: 1, gap: space.snug },
  totals: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  count: { flex: 1 },
  finishes: { flexDirection: 'row', gap: space.sm },
  grow: { flex: 1 },
});
