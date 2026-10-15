import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';

export interface LabeledListRow {
  id: string;
  label: string;
  sub: string;
  value: string;
  color?: string;
}

export interface LabeledListCardProps {
  /** Eyebrow title, e.g. "DEDUCTIONS · TODAY" or "LAST 7 DAYS". */
  title: string;
  rows: LabeledListRow[];
  emptyMessage: string;
}

/**
 * Design lines 114-121 — the "Deductions · Today" and "Last 7 Days" list
 * cards: a row per item with a bold label + muted sub-line on the left and a
 * (optionally colored) value on the right, divided by a hairline.
 */
export function LabeledListCard({ title, rows, emptyMessage }: LabeledListCardProps) {
  const theme = useAppTheme();

  return (
    <Card style={styles.card}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 }]}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>{emptyMessage}</Text>
      ) : (
        rows.map((row, index) => (
          <View
            key={row.id}
            style={[
              styles.row,
              index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border },
              { paddingVertical: theme.spacing.sm },
            ]}>
            <View style={styles.left}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{row.label}</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{row.sub}</Text>
            </View>
            <Text style={[theme.typography.body, { color: row.color ?? theme.colors.text, fontWeight: '700' }]}>{row.value}</Text>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flex: 1, paddingRight: 8 },
});
