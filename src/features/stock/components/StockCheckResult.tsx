import { StyleSheet, Text, View } from 'react-native';
import { tintFill, useAppTheme } from '@/shared/theme';
import { Card, Icon, InfoBanner, MiniStat, SmallButton } from '@/shared/ui';
import type { CheckResult, StockCheckDifference } from '../calculations';

export interface StockCheckResultProps {
  result: CheckResult;
  onEditCounts: () => void;
  onOpenReturnItems: () => void;
}

function diffLabel(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}

function diffAnnouncement(diff: number): string {
  return diff > 0 ? `${diff} over` : `${Math.abs(diff)} short`;
}

function DifferenceRow({ item, color, first }: { item: StockCheckDifference; color: string; first: boolean }) {
  const theme = useAppTheme();
  return (
    <View
      style={[styles.row, first ? null : [styles.divider, { borderTopColor: theme.colors.border }]]}
      accessible
      accessibilityLabel={`${item.productName}, balance ${item.balance}, counted ${item.counted}, ${diffAnnouncement(item.diff)}`}>
      <View style={styles.rowBody}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {item.productName}
        </Text>
        <Text style={[styles.xs, { color: theme.colors.textFaint }]}>
          balance {item.balance} · counted {item.counted}
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: `${color}1A` }]}>
        <Text style={[styles.pillText, { color }]}>{diffLabel(item.diff)}</Text>
      </View>
    </View>
  );
}

/**
 * Replaces the counting list after Verify — matches the web's result logic
 * exactly: Matched products are counted only (never listed), Surplus/Deficit
 * each get their own section with an explanatory subtitle, and the footer
 * directs a real difference to Return Items/an admin stock adjustment instead
 * of pretending anything here is saved.
 */
export function StockCheckResult({ result, onEditCounts, onOpenReturnItems }: StockCheckResultProps) {
  const theme = useAppTheme();
  const { surplus, deficit, matchedCount } = result;
  const allMatch = surplus.length === 0 && deficit.length === 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.h2, { color: theme.colors.text }]}>Check result</Text>
        <SmallButton label="Edit counts" icon="pencil" size="sm" onPress={onEditCounts} />
      </View>

      <View style={[styles.tint, { backgroundColor: tintFill(theme) }]}>
        <MiniStat label="Surplus" value={String(surplus.length)} valueColor={surplus.length > 0 ? theme.colors.success : undefined} />
        <MiniStat label="Deficit" value={String(deficit.length)} valueColor={deficit.length > 0 ? theme.colors.danger : undefined} />
        <MiniStat label="Matched" value={String(matchedCount)} />
      </View>

      {allMatch ? (
        <InfoBanner kind="ok">Everything you counted matches the balance.</InfoBanner>
      ) : (
        <>
          {surplus.length > 0 ? (
            <Card style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="trending-up" size={16} color={theme.colors.success} />
                <Text style={[styles.sectionTitle, { color: theme.colors.success }]}>Surplus · more on the shelf than the balance</Text>
              </View>
              <View>
                {surplus.map((item, i) => (
                  <DifferenceRow key={item.productId} item={item} color={theme.colors.success} first={i === 0} />
                ))}
              </View>
            </Card>
          ) : null}
          {deficit.length > 0 ? (
            <Card style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="trending-down" size={16} color={theme.colors.danger} />
                <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>Deficit · less on the shelf than the balance</Text>
              </View>
              <View>
                {deficit.map((item, i) => (
                  <DifferenceRow key={item.productId} item={item} color={theme.colors.danger} first={i === 0} />
                ))}
              </View>
            </Card>
          ) : null}
        </>
      )}

      <Text style={[styles.note, { color: theme.colors.textFaint }]}>
        Not saved. To correct a real difference, use{' '}
        <Text onPress={onOpenReturnItems} style={[styles.link, { color: theme.colors.primary }]}>
          Return Items
        </Text>{' '}
        on the New Orders page or ask an admin for a stock adjustment.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: '600', letterSpacing: -0.4 },
  tint: { flexDirection: 'row', gap: 8, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  section: { gap: 6, paddingVertical: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  pill: { minHeight: 24, borderRadius: 12, paddingHorizontal: 10, justifyContent: 'center' },
  pillText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  note: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  link: { fontWeight: '700' },
  divider: { borderTopWidth: 1 },
});
