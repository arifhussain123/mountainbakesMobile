import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
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

function DifferenceRow({ item, color }: { item: StockCheckDifference; color: string }) {
  const theme = useAppTheme();
  return (
    <View
      style={[styles.row, { borderLeftColor: color, backgroundColor: theme.colors.surface }]}
      accessible
      accessibilityLabel={`${item.productName}, balance ${item.balance}, counted ${item.counted}, ${diffAnnouncement(item.diff)}`}>
      <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
        {item.productName}
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        balance {item.balance} · counted {item.counted}
      </Text>
      <Text style={[theme.typography.body, { color, fontWeight: '700', marginLeft: 10 }]}>{diffLabel(item.diff)}</Text>
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
    <View>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Check result</Text>
          <Text style={[theme.typography.bodySmall, { marginTop: 2 }]}>
            <Text style={{ color: theme.colors.success, fontWeight: '700' }}>Surplus {surplus.length}</Text>
            <Text style={{ color: theme.colors.textSecondary }}> · </Text>
            <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Deficit {deficit.length}</Text>
            <Text style={{ color: theme.colors.textSecondary }}> · </Text>
            <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>Matched {matchedCount}</Text>
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onEditCounts} style={styles.editButton}>
          <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>Edit counts</Text>
        </Pressable>
      </View>

      {allMatch ? (
        <Text style={[theme.typography.body, { color: theme.colors.success, marginTop: 16, fontWeight: '700' }]}>
          Everything you counted matches the balance.
        </Text>
      ) : (
        <>
          {surplus.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <View style={styles.sectionHeader}>
                <Icon name="trending-up" size={14} color={theme.colors.success} />
                <Text style={[theme.typography.label, { color: theme.colors.success, fontWeight: '700' }]}>
                  SURPLUS · more on the shelf than the balance
                </Text>
              </View>
              {surplus.map((item) => (
                <DifferenceRow key={item.productId} item={item} color={theme.colors.success} />
              ))}
            </View>
          ) : null}
          {deficit.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <View style={styles.sectionHeader}>
                <Icon name="trending-down" size={14} color={theme.colors.danger} />
                <Text style={[theme.typography.label, { color: theme.colors.danger, fontWeight: '700' }]}>
                  DEFICIT · less on the shelf than the balance
                </Text>
              </View>
              {deficit.map((item) => (
                <DifferenceRow key={item.productId} item={item} color={theme.colors.danger} />
              ))}
            </View>
          ) : null}
        </>
      )}

      <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 20 }]}>
        Not saved. To correct a real difference, use{' '}
        <Text onPress={onOpenReturnItems} style={{ color: theme.colors.primary, fontWeight: '700' }}>
          Return Items
        </Text>{' '}
        on the New Orders page or ask an admin for a stock adjustment.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  editButton: { height: 32, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, marginTop: 6, borderLeftWidth: 3, borderRadius: 6 },
});
