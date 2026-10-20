import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useApproveSpecialOrder, usePrepareSpecialOrder, type SpecialOrder } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, PrimaryButton, QtyStepper, StatusBadge } from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import {
  SPECIAL_ORDER_STATUS_LABEL,
  SPECIAL_ORDER_STATUS_VARIANT,
  openSpecialOrders,
  preparePayload,
  specialOrdersNeedingAction,
  type QtyEdits,
} from '../utils/productionOrders';
import { PhotoStrip } from './PhotoStrip';

/** `20 Oct 2026, 08:45 PM` — a step in the order's trail. */
function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${formatDisplayTime(iso)}`;
}

function Detail({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.detail}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label.toUpperCase()}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
      {label} <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{value}</Text>
    </Text>
  );
}

function SpecialOrderBlock({ order }: { order: SpecialOrder }) {
  const theme = useAppTheme();
  const prepare = usePrepareSpecialOrder();
  const approve = useApproveSpecialOrder();
  // Prepared Qty as typed, by item id. Absent = untouched = the full requested quantity.
  const [typed, setTyped] = useState<QtyEdits>({});
  const canPrepare = order.status === 'pending';
  const payload = canPrepare ? preparePayload(order.items, typed) : null;
  const problem = payload && 'problem' in payload ? payload.problem : null;

  const markPrepared = () => {
    if (!payload || 'problem' in payload) return;
    prepare.mutate(
      { id: order.id, input: { items: payload.items } },
      {
        onSuccess: () => {
          setTyped({});
          Alert.alert('Prepared', 'Prepared — added to Production Stock and sent to the branch to verify.');
        },
        onError: (e) => Alert.alert('Could Not Mark It Prepared', mapErrorToMessage(e)),
      },
    );
  };

  const approveLegacy = () => {
    approve.mutate(order.id, {
      onSuccess: () => Alert.alert('Approved', 'Approved — delivered to branch stock.'),
      onError: (e) => Alert.alert('Could Not Approve This Special Order', mapErrorToMessage(e)),
    });
  };

  return (
    <View style={[styles.block, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <View style={styles.headRow}>
        <View style={[styles.pill, { backgroundColor: theme.colors.primary }]}>
          <Icon name="sparkle" size={11} color={theme.colors.primaryText} />
          <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700' }]}>SPECIAL ORDER</Text>
        </View>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{order.orderNumber}</Text>
      </View>
      <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
        <StatusBadge label={SPECIAL_ORDER_STATUS_LABEL[order.status] ?? order.status} variant={SPECIAL_ORDER_STATUS_VARIANT[order.status] ?? 'neutral'} />
      </View>

      <View style={styles.details}>
        {/* The SO number is the reference Production works from. */}
        <Detail label="Production ID" value={order.orderNumber} />
        <Detail label="Branch" value={order.branchName} />
        <Detail label="Raised" value={order.date ? formatDisplayDate(order.date) : ''} />
        <Detail label="Required by" value={order.requiredDate ? formatDisplayDate(order.requiredDate) : ''} />
      </View>

      {order.items.map((item) => (
        <View key={item.id} style={[styles.item, { borderTopColor: theme.colors.border }]}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{item.itemName}</Text>
          {/* Requested, prepared and received — each shown once it exists, never folded into one. */}
          <View style={styles.figures}>
            <Figure label="Requested" value={formatCount(item.qty)} />
            {item.preparedQty !== null ? <Figure label="Prepared" value={formatCount(item.preparedQty)} /> : null}
            {item.verifiedQty !== null ? <Figure label="Received" value={formatCount(item.verifiedQty)} /> : null}
            <Figure label="Amount" value={formatCurrency(item.amount)} />
          </View>
          {item.description ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>{item.description}</Text>
          ) : null}
          <PhotoStrip title="Requested photo" photos={item.requestPhotos} />
          {canPrepare ? (
            <View style={styles.qtyRow}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PREPARED QTY</Text>
              <QtyStepper
                value={typed[item.id] === undefined ? item.qty : typed[item.id] ?? null}
                onChange={(v) => setTyped((p) => ({ ...p, [item.id]: v }))}
                min={0}
                accessibilityLabel={`Prepared quantity for ${item.itemName}`}
              />
            </View>
          ) : null}
          {item.stockTransactionNo ? (
            <View style={styles.okRow}>
              <Icon name="check" size={12} color={theme.colors.success} />
              <Text style={[theme.typography.label, { color: theme.colors.success, flex: 1 }]}>
                +{item.preparedQty ?? item.qty} in Production Stock · {item.stockTransactionNo}
              </Text>
            </View>
          ) : null}
        </View>
      ))}

      {order.items.length > 1 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'right', marginTop: 8 }]}>
          Special Order total <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{formatCurrency(order.totalAmount)}</Text>
        </Text>
      ) : null}

      <View style={{ marginTop: 8, gap: 2 }}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Raised by {order.createdByName || '—'} · {when(order.submittedAt)}
        </Text>
        {order.preparedAt ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            Prepared by {order.preparedByName || '—'} · {when(order.preparedAt)}
          </Text>
        ) : null}
        {order.verifiedAt ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            Verified by {order.verifiedByName || '—'} · {when(order.verifiedAt)}
          </Text>
        ) : null}
        {order.approvedAt ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            Approved by {order.approvedByName || '—'} · {when(order.approvedAt)}
          </Text>
        ) : null}
      </View>

      <PhotoStrip title="Received item photo" photos={order.verificationPhotos} />

      {canPrepare ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          <Text style={[theme.typography.label, { color: problem ? theme.colors.danger : theme.colors.textSecondary }]}>
            {problem ?? 'Marking it prepared adds the Prepared Qty to Production Stock. No separate stock entry is needed.'}
          </Text>
          <PrimaryButton label="Mark Prepared" onPress={markPrepared} loading={prepare.isPending} disabled={problem !== null} />
        </View>
      ) : null}
      {order.status === 'verified' ? (
        <View style={{ marginTop: 8, gap: 8 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {"Verified by the branch under the earlier workflow. Approving books it into Production Stock and on to the branch's stock, once."}
          </Text>
          <PrimaryButton label="Approve" onPress={approveLegacy} loading={approve.isPending} />
        </View>
      ) : null}
      {order.status === 'awaiting_verification' ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>
          {"Prepared and in Production Stock — it moves to the branch's stock when the branch verifies it with a photo."}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Web `SpecialOrdersPanel` in production mode: a branch's one-off
 * sent straight to Production — not demand, and never counted in it. Approved
 * orders drop off (Production is done with them), and with nothing open the
 * card is not rendered at all, exactly as on the web. A pending order is
 * marked prepared with a Prepared Qty per item; a legacy branch-verified one
 * is approved. Neither is a manual stock entry — the server writes each
 * movement once, as part of the step.
 */
export function AdminSpecialOrdersCard({ orders }: { orders: SpecialOrder[] }) {
  const theme = useAppTheme();
  const open = openSpecialOrders(orders);
  if (open.length === 0) return null;
  const needsAction = specialOrdersNeedingAction(open);

  return (
    <Card style={{ marginBottom: theme.spacing.lg }}>
      <View style={styles.titleRow}>
        <Icon name="sparkle" size={16} color={theme.colors.primary} />
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Special Orders</Text>
        {needsAction > 0 ? <StatusBadge label={`${needsAction} need action`} variant="warning" /> : null}
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
        Sent straight to Production — separate from demand, and not counted in it.
      </Text>
      <View style={{ gap: 10, marginTop: 12 }}>
        {open.map((o) => (
          <SpecialOrderBlock key={o.id} order={o} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  block: { borderWidth: 1, padding: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  details: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 12 },
  detail: { width: '50%', paddingRight: 8 },
  item: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 10 },
  figures: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 2, marginTop: 4 },
  okRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
});
