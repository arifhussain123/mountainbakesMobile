import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FinanceTicket, SupportReference, SupportSaleItem, SupportTicket } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import {
  FIN_PRIORITY_LABEL,
  FIN_PRIORITY_VARIANT,
  FIN_QUERY_TYPE_LABEL,
  FIN_REFERENCE_LABEL,
  FIN_STATUS_LABEL,
  FIN_STATUS_VARIANT,
  OPS_STATUS_LABEL,
  OPS_STATUS_VARIANT,
  SOURCE_LABELS,
  SOURCE_VARIANT,
  TYPE_LABEL,
  financeRef,
  formatQueryDate,
  roleLine,
  sourceOfTicket,
} from './labels';

/** A small caption above a value, the web table's column header as it appears on a phone card. */
export function Caption({ children }: { children: string }) {
  const theme = useAppTheme();
  return <Text style={[theme.typography.label, { color: theme.colors.textLabel, textTransform: 'uppercase', letterSpacing: 0.4 }]}>{children}</Text>;
}

/** Label left, value right — one row of a read-only detail. */
export function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  const theme = useAppTheme();
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.fieldRow}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, flexShrink: 0 }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', textAlign: 'right', flexShrink: 1 }]}>{value}</Text>
    </View>
  );
}

/** One Branches & Production ticket — Ticket, Reference, From, Issue, Status (web DataTable row). */
export const OpsTicketCard = memo(function OpsTicketCardView({ ticket, onPress }: { ticket: SupportTicket; onPress: () => void }) {
  const theme = useAppTheme();
  const src = sourceOfTicket(ticket);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${ticket.ticketNumber}`}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontFamily: 'monospace' }]}>{ticket.ticketNumber}</Text>
          <StatusBadge label={OPS_STATUS_LABEL[ticket.status]} variant={OPS_STATUS_VARIANT[ticket.status]} />
        </View>
        <View style={styles.inline}>
          <StatusBadge label={TYPE_LABEL[ticket.referenceType]} variant="neutral" />
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flexShrink: 1 }]} numberOfLines={1}>
            {ticket.referenceId}
          </Text>
        </View>
        <View style={styles.inline}>
          {src ? <StatusBadge label={SOURCE_LABELS[src].toUpperCase()} variant={SOURCE_VARIANT[src]} /> : <StatusBadge label="System" variant="neutral" />}
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flexShrink: 1 }]} numberOfLines={1}>
            {ticket.branchName || '—'}
          </Text>
          {ticket.raisedByRole ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              · {roleLine(ticket.raisedByRole)}
            </Text>
          ) : null}
        </View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]} numberOfLines={2}>
          {ticket.message}
        </Text>
      </Card>
    </Pressable>
  );
});

/** One Finance query — Query ID + date, Reference, From, Issue, Amount, Priority, Status (web FinanceHelpDeskPage row). */
export const FinanceTicketCard = memo(function FinanceTicketCardView({ ticket, onPress }: { ticket: FinanceTicket; onPress: () => void }) {
  const theme = useAppTheme();
  const ref = financeRef(ticket);
  const answer = ticket.adminResponse ?? ticket.resolutionNote;
  const muted = { color: theme.colors.textSecondary };
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${ticket.queryNo}`}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={{ flexShrink: 1 }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontFamily: 'monospace' }]}>{ticket.queryNo}</Text>
            <Text style={[theme.typography.label, muted]}>{formatQueryDate(ticket.createdAt, false)}</Text>
          </View>
          <View style={styles.badges}>
            <StatusBadge label={FIN_PRIORITY_LABEL[ticket.priority]} variant={FIN_PRIORITY_VARIANT[ticket.priority]} />
            {ticket.deletedAt ? (
              <StatusBadge label="Deleted" variant="danger" />
            ) : (
              <StatusBadge label={FIN_STATUS_LABEL[ticket.status]} variant={FIN_STATUS_VARIANT[ticket.status]} />
            )}
          </View>
        </View>
        {(ticket.amendCount ?? 0) > 0 ? (
          <Text style={[theme.typography.label, { color: theme.colors.success }]}>
            Amended {ticket.amendCount}× · v{ticket.version}
          </Text>
        ) : null}
        {(ticket.reopenCount ?? 0) > 0 ? (
          <Text style={[theme.typography.label, { color: theme.colors.violet }]}>Reopened {ticket.reopenCount}×</Text>
        ) : null}
        {ticket.recreatedFromQueryNo ? <Text style={[theme.typography.label, muted]}>From {ticket.recreatedFromQueryNo}</Text> : null}
        {ticket.recreatedAsQueryNo ? <Text style={[theme.typography.label, muted]}>→ {ticket.recreatedAsQueryNo}</Text> : null}

        <View style={styles.inline}>
          <StatusBadge label={FIN_QUERY_TYPE_LABEL[ticket.queryType]} variant="neutral" />
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flexShrink: 1 }]} numberOfLines={1}>
            {ref ?? ticket.subject}
          </Text>
          {ticket.referenceType && ref === ticket.referenceNo ? (
            <Text style={[theme.typography.label, muted]}>{FIN_REFERENCE_LABEL[ticket.referenceType]}</Text>
          ) : null}
        </View>

        <View style={styles.inline}>
          <StatusBadge label="FINANCE" variant="violet" />
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flexShrink: 1 }]} numberOfLines={1}>
            {ticket.branchName || '—'}
          </Text>
        </View>
        <Text style={[theme.typography.label, muted]} numberOfLines={1}>
          {ticket.raisedByName || '—'}
          {ticket.raisedByRole ? ` · ${ticket.raisedByRole.replace(/_/g, ' ')}` : ''}
        </Text>

        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', marginTop: 6 }]} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <Text style={[theme.typography.bodySmall, muted]} numberOfLines={2}>
          {ticket.message}
        </Text>
        {answer ? (
          <Text style={[theme.typography.label, { color: theme.colors.text, marginTop: 2 }]} numberOfLines={1}>
            <Text style={muted}>Admin: </Text>
            {answer}
          </Text>
        ) : null}

        <View style={[styles.topRow, { marginTop: 8 }]}>
          <Caption>Amount</Caption>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
            {ticket.amount === null ? '—' : formatCurrency(ticket.amount)}
          </Text>
        </View>
        <Text style={[theme.typography.label, muted, { textAlign: 'right' }]}>
          Updated {formatQueryDate(ticket.updatedAt, false)}
          {ticket.assignedToName ?? ticket.resolvedByName ? ` · ${ticket.assignedToName ?? ticket.resolvedByName}` : ''}
        </Text>
      </Card>
    </Pressable>
  );
});

/** Web `ReferenceDetail` — the reference's title and its label/value pairs. */
export function ReferenceDetail({ reference }: { reference: SupportReference }) {
  const theme = useAppTheme();
  return (
    <Card style={styles.card}>
      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', marginBottom: 6 }]}>{reference.title}</Text>
      {reference.fields.map((f) => (
        <FieldRow key={f.label} label={f.label} value={f.value} />
      ))}
    </Card>
  );
}

/** Web `SaleItemsTable` — Product, Qty, Rate, Discount, Amount; one row per line on a phone. */
export function SaleItemsList({ items }: { items: SupportSaleItem[] }) {
  const theme = useAppTheme();
  return (
    <Card style={styles.card}>
      <Caption>Sale lines</Caption>
      {items.map((it, idx) => (
        <View key={idx} style={[styles.saleLine, idx > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border } : null]}>
          <View style={styles.topRow}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', flexShrink: 1 }]}>{it.productName}</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
              {formatCurrency(it.unitPrice * it.qty - it.discount)}
            </Text>
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {it.qty} × {formatCurrency(it.unitPrice)} · Discount {it.discount ? `-${formatCurrency(it.discount)}` : '—'}
          </Text>
        </View>
      ))}
    </Card>
  );
}

/** A labelled text block — Issue, Resolution, Admin response. */
export function TextBlock({ label, text }: { label: string; text: string | null | undefined }) {
  const theme = useAppTheme();
  if (!text) return null;
  return (
    <Card style={styles.card}>
      <Caption>{label}</Caption>
      <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{text}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  badges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 },
  saleLine: { paddingVertical: 6 },
});
