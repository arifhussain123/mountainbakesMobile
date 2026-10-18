import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { PackingUsageRow } from '@/api';
import { derivePackingStatus, isPackingShortfall, PACKING_STATUS_LABEL, type PackingStatus } from '../calculations';

export interface PackingMaterialsListProps {
  rows: PackingUsageRow[];
}

const STATUS_VARIANT: Record<PackingStatus, StatusVariant> = {
  delivered: 'success',
  partlyApproved: 'warning',
  notApproved: 'neutral',
};

interface MaterialTotal {
  materialName: string;
  requested: number;
  approved: number;
  delivered: number;
}

function totalsByMaterial(rows: PackingUsageRow[]): MaterialTotal[] {
  const map = new Map<string, MaterialTotal>();
  for (const row of rows) {
    const existing = map.get(row.materialName) ?? { materialName: row.materialName, requested: 0, approved: 0, delivered: 0 };
    existing.requested += row.requestedQty;
    existing.approved += row.approvedQty;
    existing.delivered += row.deliveredQty;
    map.set(row.materialName, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.requested - a.requested);
}

function groupByDate(rows: PackingUsageRow[]): { date: string; rows: PackingUsageRow[] }[] {
  const map = new Map<string, PackingUsageRow[]>();
  for (const row of rows) {
    const list = map.get(row.date) ?? [];
    list.push(row);
    map.set(row.date, list);
  }
  return Array.from(map.entries())
    .map(([date, groupRows]) => ({ date, rows: groupRows }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Packing tab — totals per material for the range, then requests grouped by date, newest first. */
export function PackingMaterialsList({ rows }: PackingMaterialsListProps) {
  const theme = useAppTheme();
  const totals = useMemo(() => totalsByMaterial(rows), [rows]);
  const groups = useMemo(() => groupByDate(rows), [rows]);

  return (
    <View>
      {totals.length > 0 ? (
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 }]}>
            Totals for This Range
          </Text>
          {totals.map((t, index) => (
            <View key={t.materialName} style={[styles.totalsRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                {t.materialName}
              </Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                {t.requested} requested · {t.delivered} delivered
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {groups.map((group) => (
        <View key={group.date} style={{ marginBottom: theme.spacing.md }}>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginBottom: 6 }]}>{formatDisplayDate(group.date)}</Text>
          {group.rows.map((row) => {
            const status = derivePackingStatus(row);
            const shortfall = isPackingShortfall(row);
            return (
              <Card
                key={`${row.date}-${row.packingMaterialId ?? row.materialName}`}
                style={[{ marginBottom: 8 }, shortfall && { borderColor: theme.colors.warning }]}>
                <View style={styles.row}>
                  <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                    {row.materialName}
                  </Text>
                  <StatusBadge label={PACKING_STATUS_LABEL[status]} variant={STATUS_VARIANT[status]} />
                </View>
                <View style={[styles.grid, { marginTop: 8 }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                    Requested <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{row.requestedQty}</Text>
                  </Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                    Approved <Text style={{ color: theme.colors.success, fontWeight: '700' }}>{row.approvedQty}</Text>
                  </Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                    Delivered <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{row.deliveredQty}</Text>
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
