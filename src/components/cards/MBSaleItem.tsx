import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBCard } from '../common/MBCard';
import { MBMoney } from '../common/MBMoney';
import { MBPressable } from '../common/MBPressable';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';
import { karachiTimeStr } from '@/shared/utils/timezone';
import { formatCurrency, formatQty, toNumber } from '@/utils/money';
import type { Order } from '@/shared/types/order.types';

/**
 * One completed sale in a list.
 *
 * The reference number and the total are the two things someone scanning a
 * day's takings is looking for, so they sit on one line at opposite edges; the
 * branch, customer, method, status and cashier are the answers to "which sale
 * was that", which is a question asked about one row rather than about the
 * list.
 *
 * `grandTotal` is `numeric(14,2)` and reaches the client as a JSON string —
 * `MBMoney` coerces it rather than rendering `NaN`. Absent fields are joined
 * out rather than interpolated, so a missing customer leaves no orphan
 * separator dangling after the branch name.
 *
 * This is the sale as the **server** recorded it. A sale still in the queue has
 * no `orderNumber` to show, so a list that carries both draws the queued ones
 * itself rather than pushing a half-built order through here.
 */

export interface MBSaleItemProps {
  order: Order;
  /** Tenant symbol from AppSettings; falls back to "Rs.". */
  currencySymbol?: string;
  /**
   * Opt-in, because a clock time only means something when the list is one
   * business day.
   *
   * The branch register is that list, and there "14:20" identifies the sale a
   * customer is asking about. The admin's cross-branch view and the counter's
   * 7-day range are not: a bare time with no date in a list spanning a week
   * reads as today's and is the one detail somebody would act on.
   *
   * It is Karachi's clock, like every other time in this app — the phone's
   * would put a sale in a different hour for anyone travelling.
   */
  showTime?: boolean;
  /**
   * What was sold, under the customer line — the design's PRODUCTS and QTY
   * columns, which are the two the row cannot otherwise answer.
   *
   * Opt-in for the same reason as `showTime`: on the branch register it is what
   * makes "which sale had the walnut cake on it" answerable by looking, and on a
   * cross-branch or multi-day list it is a fourth line of noise under a question
   * nobody is asking there.
   */
  showItems?: boolean;
  /**
   * Makes the whole card the press target — for a list where a row opens the
   * sale's own detail. Omitted, the card is inert and announces nothing
   * tappable, which is what the read-only lists want.
   */
  onPress?: () => void;
}

export const MBSaleItem = React.memo(function MBSaleItemView({
  order,
  currencySymbol,
  showTime = false,
  showItems = false,
  onPress,
}: MBSaleItemProps): React.ReactElement {
  const theme = useTheme();

  const time = showTime && order.createdAt ? karachiTimeStr(new Date(order.createdAt)) : '';
  const who = [time, order.branchName, order.customerName].filter(Boolean).join(' · ');
  const how = [order.paymentMethod, order.status, order.createdByName].filter(Boolean).join(' · ');
  const what = showItems ? itemLine(order) : '';

  const card = (
    <MBCard>
      <View style={styles.header}>
        <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]} numberOfLines={1}>
          {order.orderNumber}
        </Text>
        <MBMoney value={order.grandTotal} symbol={currencySymbol} />
      </View>

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]} numberOfLines={1}>
        {who}
      </Text>

      {what ? (
        <Text style={[theme.type.caption, { color: theme.colors.textSubtle }]} numberOfLines={1}>
          {what}
        </Text>
      ) : null}

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{how}</Text>
    </MBCard>
  );

  if (!onPress) return card;

  /* One label for the whole row: a card read out as four separate strings makes
     the total the fourth thing heard rather than the second. */
  return (
    <MBPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        order.orderNumber,
        formatCurrency(order.grandTotal, currencySymbol),
        who,
        what,
        how,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint="Opens this sale">
      {card}
    </MBPressable>
  );
});

/**
 * "5 units · Milk Rusk, Walnut Cake".
 *
 * The unit count first because it is the figure being checked against a till
 * roll; the names follow and are allowed to truncate, since the sale's own
 * detail is one tap away and carries every line in full.
 */
function itemLine(order: Order): string {
  const items = order.items ?? [];
  if (items.length === 0) return '';
  const units = items.reduce((sum, item) => sum + toNumber(item.qty), 0);
  const names = items.map(item => item.productName).filter(Boolean).join(', ');
  return `${formatQty(units)} units · ${names}`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.tight,
  },
});
