import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, ListThumb, MiniStat, StatusBadge, type StatusVariant } from '@/shared/ui';
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
    <View style={styles.wrap}>
      {totals.length > 0 ? (
        <Card style={styles.totalsCard}>
          <Text style={[styles.h3, { color: theme.colors.text }]}>Totals for this range</Text>
          <View>
            {totals.map((t, index) => (
              <View key={t.materialName} style={[styles.li, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
                <ListThumb icon="box" index={index} />
                <View style={styles.grow}>
                  <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                    {t.materialName}
                  </Text>
                  <Text style={[styles.xs, { color: theme.colors.textSecondary }]}>
                    {t.requested} requested · {t.delivered} delivered
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {groups.map((group) => (
        <View key={group.date} style={styles.group}>
          <Text style={[styles.eyebrow, { color: theme.colors.textFaint }]}>{formatDisplayDate(group.date)}</Text>
          {group.rows.map((row) => {
            const status = derivePackingStatus(row);
            const shortfall = isPackingShortfall(row);
            return (
              <Card
                key={`${row.date}-${row.packingMaterialId ?? row.materialName}`}
                style={[styles.requestCard, theme.isDark ? null : styles.flat, shortfall && { borderColor: theme.colors.warning }]}>
                <View style={styles.row}>
                  <Text style={[styles.name, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                    {row.materialName}
                  </Text>
                  <StatusBadge label={PACKING_STATUS_LABEL[status]} variant={STATUS_VARIANT[status]} />
                </View>
                <View style={styles.minis}>
                  <MiniStat label="Requested" value={String(row.requestedQty)} />
                  <MiniStat label="Approved" value={String(row.approvedQty)} valueColor={theme.colors.success} />
                  <MiniStat label="Delivered" value={String(row.deliveredQty)} valueColor={theme.colors.primary} />
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
  wrap: { gap: 16 },
  totalsCard: { gap: 4 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  li: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  group: { gap: 10 },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  requestCard: { gap: 12 },
  flat: { shadowOpacity: 0, elevation: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  minis: { flexDirection: 'row', gap: 10 },
});
