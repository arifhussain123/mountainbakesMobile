import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBCard } from '../common/MBCard';
import { MBMoney } from '../common/MBMoney';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';
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
 * no `orderNumber` to show, which is why the offline path reports itself
 * through `MBWriteOutcome` and not by putting a half-built row in this list.
 */

export interface MBSaleItemProps {
  order: Order;
  /** Tenant symbol from AppSettings; falls back to "Rs.". */
  currencySymbol?: string;
}

export const MBSaleItem = React.memo(function MBSaleItemView({
  order,
  currencySymbol,
}: MBSaleItemProps): React.ReactElement {
  const theme = useTheme();

  const who = [order.branchName, order.customerName].filter(Boolean).join(' · ');
  const how = [order.paymentMethod, order.status, order.createdByName].filter(Boolean).join(' · ');

  return (
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

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{how}</Text>
    </MBCard>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.tight,
  },
});
