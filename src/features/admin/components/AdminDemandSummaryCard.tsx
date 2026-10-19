import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge } from '@/shared/ui';
import { formatCount } from '@/shared/utils';
import { specialToMakeLabel, waitingSubtitle, type DemandPivotRow, type DemandSummary } from '../utils/productionOrders';

export interface AdminDemandSummaryCardProps {
  summary: DemandSummary;
  /** Today's Production Stock balance per product; `null` until the pool has loaded (never read as 0). */
  stockByProduct: Map<string, number> | null;
}

function SectionLabel({ children }: { children: string }) {
  const theme = useAppTheme();
  return <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginBottom: 8 }]}>{children}</Text>;
}

/** One pivot row as a phone card: the total, what of it is already sent, the pool strip, and only the branches that ordered. */
function PivotCard({ row, branches, pool }: { row: DemandPivotRow; branches: string[]; pool: { stock: number; balance: number } | null }) {
  const theme = useAppTheme();
  const ordering = branches.filter((b) => (row.byBranch[b] ?? 0) > 0);
  return (
    <View style={[styles.pivotCard, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <View style={styles.pivotHead}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600', flex: 1 }]}>{row.name}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700' }]}>{formatCount(row.total)}</Text>
          {row.sent > 0 ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{row.sent} sent</Text> : null}
        </View>
      </View>
      {pool ? (
        <View style={[styles.strip, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.sm }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            Today <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{formatCount(pool.stock)}</Text>
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>−</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            Demand <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{formatCount(row.total)}</Text>
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>=</Text>
          <Text style={[theme.typography.label, { color: pool.balance < 0 ? theme.colors.danger : theme.colors.text, fontWeight: '700' }]}>
            {formatCount(pool.balance)}
          </Text>
        </View>
      ) : null}
      {ordering.length > 0 ? (
        <View style={styles.branches}>
          {ordering.map((b) => (
            <Text key={b} style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              {b}: <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{row.byBranch[b]}</Text>
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Web "Demand Summary — Waiting Orders" (mobile layout): every demand not yet
 * verified by its branch, pivoted by product and by packing material, with
 * special items listed one by one ahead of both. Read-only — the web's
 * "Print for Production" is not reproduced.
 */
export function AdminDemandSummaryCard({ summary, stockByProduct }: AdminDemandSummaryCardProps) {
  const theme = useAppTheme();
  const { rows, packingRows, specialRows, branches, pendingOrders, awaitingOrders } = summary;
  const empty = rows.length === 0 && packingRows.length === 0 && specialRows.length === 0;
  const sub = waitingSubtitle(pendingOrders, awaitingOrders);

  const poolFor = (productId: string, total: number) => {
    if (!stockByProduct) return null;
    const stock = stockByProduct.get(productId) ?? 0;
    return { stock, balance: stock - total };
  };

  return (
    <Card style={{ marginBottom: theme.spacing.lg }}>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Demand Summary — Waiting Orders</Text>
      {sub ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{sub}</Text> : null}

      {empty ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 20 }]}>
          No waiting demands right now.
        </Text>
      ) : (
        <View style={{ marginTop: 12 }}>
          {specialRows.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <View style={styles.specialHead}>
                <Icon name="sparkle" size={13} color={theme.colors.textSecondary} />
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>SPECIAL ORDER ITEMS</Text>
                <StatusBadge label={specialToMakeLabel(specialRows)} variant="warning" />
              </View>
              <View style={[styles.specialList, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
                {specialRows.map((r, i) => (
                  <View
                    key={`${r.orderId}-${r.name}-${i}`}
                    style={[styles.specialRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
                    <View style={[styles.qtyPill, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.sm }]}>
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, fontWeight: '700' }]}>{r.qty}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>{r.name}</Text>
                      {r.description ? (
                        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{r.description}</Text>
                      ) : null}
                      <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 2 }]}>
                        {r.branch} · {r.demandNumber}
                        {r.photoCount > 0 ? ` · ${r.photoCount} photo${r.photoCount === 1 ? '' : 's'} — open the order to view` : ''}
                      </Text>
                      {r.awaitingVerification ? (
                        <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                          <StatusBadge label="Sent — awaiting verification" variant="info" />
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {(packingRows.length > 0 || specialRows.length > 0) && rows.length > 0 ? <SectionLabel>PRODUCTS</SectionLabel> : null}
          <View style={{ gap: 10 }}>
            {rows.map((r) => (
              <PivotCard key={r.key} row={r} branches={branches} pool={poolFor(r.key, r.total)} />
            ))}
          </View>

          {/* No stock strip for packing materials — they carry no pool balance at all. */}
          {packingRows.length > 0 ? (
            <View style={{ marginTop: rows.length > 0 || specialRows.length > 0 ? 16 : 0 }}>
              <SectionLabel>PACKING MATERIALS</SectionLabel>
              <View style={{ gap: 10 }}>
                {packingRows.map((r) => (
                  <PivotCard key={r.key} row={r} branches={branches} pool={null} />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  pivotCard: { borderWidth: 1, padding: 12 },
  pivotHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  strip: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 8, paddingHorizontal: 8, paddingVertical: 6 },
  branches: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 2, marginTop: 8 },
  specialHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  specialList: { borderWidth: 1 },
  specialRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  qtyPill: { minWidth: 40, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2 },
});
