import { Pressable, StyleSheet, Text, View } from 'react-native';
import { openNewQuery } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { Icon, ListThumb, type IconName } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { Expense } from '@/api';

/** Icon-only "Report an issue" (the flag glyph `ReportIssueAction` also uses) — a compact variant for a dense list row, where the labeled-button version would be too tall per card. `expenseNumber` is always present here: `ExpenseCard` only ever renders a synced row, there is no locally-queued/unsynced expense concept in this app yet (Step 0). */
function ReportIssueIconButton({ referenceId }: { referenceId: string }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Report an issue with ${referenceId}`}
      hitSlop={8}
      onPress={() => openNewQuery(referenceId)}
      style={styles.flag}>
      <Icon name="flag" size={14} color={theme.colors.textFaint} />
    </Pressable>
  );
}

export interface ExpenseCardProps {
  item: Expense;
  /** Row position in the list — picks the thumb's pastel and rounds the grouped card's top/bottom. */
  index: number;
  isLast: boolean;
}

const PAYMENT_LABEL: Record<Expense['paymentMethod'], string> = { cash: 'Cash', easypaisa: 'Easypaisa' };

const CATEGORY_ICON: Record<string, IconName> = {
  Electricity: 'settings',
  Utilities: 'settings',
  Rent: 'building',
  Salary: 'user-coin',
  'Advance Salary': 'user-coin',
  'Advance Cash': 'banknote',
  Loan: 'banknote',
  'Guest Expense': 'users',
  'Home Expense': 'home',
  Material: 'box',
  Transport: 'map-pin',
  'Shop Expense': 'store',
};

/**
 * branchApp.md screen 16 — one shop expense, as a row of the redesign's grouped
 * list card (B16): pastel thumb, description over "category · date · payment",
 * amount on the right. Consecutive rows share one card — the first rounds the
 * top, the last the bottom, rows in between are split by a hairline.
 */
export function ExpenseCard({ item, index, isLast }: ExpenseCardProps) {
  const theme = useAppTheme();
  const isFirst = index === 0;

  return (
    <View
      style={[
        styles.segment,
        {
          backgroundColor: theme.colors.cardFill,
          borderColor: theme.colors.cardBorder,
          borderTopWidth: isFirst ? 1 : 0,
          borderBottomWidth: isLast ? 1 : 0,
          borderTopLeftRadius: isFirst ? theme.radii.lg : 0,
          borderTopRightRadius: isFirst ? theme.radii.lg : 0,
          borderBottomLeftRadius: isLast ? theme.radii.lg : 0,
          borderBottomRightRadius: isLast ? theme.radii.lg : 0,
          paddingTop: isFirst ? 4 : 0,
          paddingBottom: isLast ? 4 : 0,
        },
      ]}>
      <View style={[styles.row, !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
        <ListThumb icon={CATEGORY_ICON[item.category] ?? 'receipt'} index={index} />
        <View style={styles.body}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={[styles.meta, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {item.category} · {formatDisplayDate(item.date)} · {PAYMENT_LABEL[item.paymentMethod]}
          </Text>
          {item.remarks ? (
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {item.remarks}
            </Text>
          ) : null}
          <View style={styles.idRow}>
            <Text style={[styles.meta, { color: theme.colors.textFaint }]}>{item.expenseNumber}</Text>
            <ReportIssueIconButton referenceId={item.expenseNumber} />
          </View>
        </View>
        <Text style={[styles.amt, { color: theme.colors.text }]}>{formatCurrency(item.amount)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flag: { width: 24, height: 20, alignItems: 'center', justifyContent: 'center' },
  amt: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, fontVariant: ['tabular-nums'], marginTop: 2 },
});
