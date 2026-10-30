import { useState, type ReactNode } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useAppSettings, useDailySaleRecord, useLockDailySaleRecord, type DailySaleAudit, type DailySaleRecord } from '@/api';
import { Routes, type SuperAdminDailySaleStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { mapErrorToMessage } from '@/shared/helpers';
import { AppHeader, Card, ErrorState, FilterChipRow, LoadingSkeleton, Screen, type FilterChipOption } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { ActionChip } from '../../components';
import { shareText } from '../../components/ExportSheet';
import { buildDailySalePrintText } from '../../utils/exports';
import { dailySaleRowActions } from '../../utils/dailySaleActions';
import { useDailySaleSheet } from './dailySaleSheets';
import {
  DAILY_SALE_AUDIT_LABELS,
  DAILY_SALE_FIELD_LABELS,
  DifferenceBadge,
  DsrStatusBadge,
  PAYMENT_METHOD_LABELS,
  displayDate,
  money,
  orDash,
} from './dailySaleBits';

type Tab = 'summary' | 'history';

/** 'DD MMM YYYY hh:mm' — the web's `stamp`. */
function stamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDisplayDate(iso.slice(0, 10))} ${formatDisplayTime(iso)}`;
}

/**
 * One history entry's change in words (the web's `describeChange`): money
 * keeps its paisa, a status move reads in words, a lock reads
 * "Cash: unlocked → locked", and a first value reads "set to X" — no arrow
 * from nothing.
 */
function describeChange(a: DailySaleAudit): string {
  const field = a.field ?? '';
  const lockWord = (v: string | null) => (v === 'true' ? 'locked' : 'unlocked');
  if (a.action === 'method_locked' || a.action === 'method_unlocked') {
    const method = PAYMENT_METHOD_LABELS[field] ?? field;
    return `${method}: ${a.oldValue === null ? 'on the default' : lockWord(a.oldValue)} → ${lockWord(a.newValue)}`;
  }
  const isMoney = field.startsWith('manual_') || field.startsWith('auto_');
  const label = isMoney ? (DAILY_SALE_FIELD_LABELS[field] ?? 'Total Sale') : field === 'status' ? 'Status' : field;
  const fmt = (v: string | null): string | null => {
    if (v === null || v === '') return null;
    if (!isMoney) return v.replace(/_/g, ' ');
    const n = Number(v);
    return Number.isFinite(n) ? formatCurrency(n) : v;
  };
  const before = fmt(a.oldValue);
  const after = fmt(a.newValue);
  if (before === null && after === null) return label;
  if (before === null) return `${label}: set to ${after}`;
  return `${label}: ${before} → ${after}`;
}

function Row({ label, value, strong, muted }: { label: string; value: ReactNode; strong?: boolean; muted?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <Text style={[theme.typography.bodySmall, { color: muted ? theme.colors.textSecondary : theme.colors.text, flex: 1 }]}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: strong ? '700' : '400' }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <Card style={{ padding: 14 }}>
      <Text
        style={[
          theme.typography.label,
          styles.sectionTitle,
          { color: theme.colors.textSecondary, borderBottomColor: theme.colors.border },
        ]}>
        {title.toUpperCase()}
      </Text>
      {children}
    </Card>
  );
}

function SummaryTab({ record }: { record: DailySaleRecord }) {
  const theme = useAppTheme();
  const signer = (name: string | null | undefined, at: string | null | undefined) => (name ? `${name}${at ? ` · ${stamp(at)}` : ''}` : '—');
  return (
    <View style={{ gap: 10 }}>
      <Section title="System Sales">
        <Row label="Total Sale" value={money(record.autoTotalSale)} strong />
        <Row label="Cash" value={money(record.autoCash)} />
        <Row label="Easypaisa" value={money(record.autoEasypaisa)} />
        <Row label="Foodpanda" value={money(record.autoFoodpanda)} />
        <Row label="Bank" value={money(record.autoBank)} />
        {record.autoOther > 0 ? <Row label="Other" value={money(record.autoOther)} /> : null}
        <Row label="Discount" value={money(record.discount)} muted />
        <Row label="Cash Expense" value={money(record.cashExpense)} muted />
        <Row label="Cash on Table" value={money(record.expectedCashInHand)} strong />
        {record.autoStaff > 0 ? <Row label="Staff consumption (unpaid)" value={money(record.autoStaff)} muted /> : null}
        <Row label="Orders" value={String(record.orderCount)} muted />
      </Section>

      <Section title="Counted / Received">
        <Row label="Cash" value={orDash(record.manualCash, money)} />
        <Row label="Easypaisa" value={orDash(record.manualEasypaisa, money)} />
        <Row label="Bank" value={orDash(record.manualBank, money)} />
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
          Foodpanda is settled by the aggregator and is not counted at the shop.
        </Text>
      </Section>

      <Section title="Difference">
        <Row label="Cash (vs Cash on Table)" value={<DifferenceBadge difference={record.cashDifference} />} />
        <Row label="Easypaisa" value={<DifferenceBadge difference={record.easypaisaDifference} />} />
        <Row label="Bank" value={<DifferenceBadge difference={record.bankDifference} />} />
        <Row label="Overall" value={<DifferenceBadge difference={record.overallDifference} />} strong />
      </Section>

      <Section title="Sign-off">
        <Row label="Counted by" value={signer(record.fedByName, record.fedAt)} />
        <Row label="Verified by" value={signer(record.verifiedByName, record.verifiedAt)} />
        <Row label="Locked by" value={signer(record.lockedByName, record.lockedAt)} />
        {record.amendedAt ? <Row label="Last amended" value={stamp(record.amendedAt)} /> : null}
      </Section>
    </View>
  );
}

function HistoryTab({ audits }: { audits: DailySaleAudit[] }) {
  const theme = useAppTheme();
  if (audits.length === 0) {
    return (
      <Card>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center' }]}>Nothing has happened to this record yet.</Text>
      </Card>
    );
  }
  return (
    <Card style={{ padding: 14 }}>
      {audits.map((a, i) => (
        <View key={a.id} style={[styles.audit, i < audits.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
          <View style={styles.auditHead}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', flex: 1 }]}>
              {DAILY_SALE_AUDIT_LABELS[a.action] ?? a.action}
              {a.action === 'manual_feed_override' ? <Text style={{ color: theme.colors.warning }}> ⚠</Text> : null}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{stamp(a.createdAt)}</Text>
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {a.actorName || 'System'}
            {a.actorRole ? ` · ${a.actorRole.replace(/_/g, ' ')}` : ''}
          </Text>
          {a.field ? <Text style={[theme.typography.label, { color: theme.colors.text, marginTop: 4 }]}>{describeChange(a)}</Text> : null}
          {a.reason ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4, fontStyle: 'italic' }]}>“{a.reason}”</Text>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

/**
 * The web's Daily Sale View dialog (`DailySaleViewDialog`) as a pushed screen:
 * branch and business date, status, the payment-breakdown mismatch warning,
 * then Summary (System Sales, Counted / Received, Difference, Sign-off) and
 * History (the audit trail, newest first). One fetch: `GET /daily-sale-records/:id`.
 *
 * The web row's actions, each shown only where the status allows it: Manual
 * Feed while open (verification is automatic at 12:30 AM); Amend once closed
 * with a counted figure; Lock on a verified or amended record; Unlock on any closed one. Print (the web's
 * A4 `DailySalePrintSheet`) shares the record as a text document.
 */
export function AdminDailySaleDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const { recordId } = useRoute<RouteProp<SuperAdminDailySaleStackParamList, typeof Routes.SUPER_ADMIN_DAILY_SALE_DETAIL>>().params;
  const q = useDailySaleRecord(recordId);
  const [tab, setTab] = useState<Tab>('summary');
  const lock = useLockDailySaleRecord();
  const sheet = useDailySaleSheet();
  const settingsQ = useAppSettings();
  const busy = lock.isPending;

  const print = () => {
    const d = q.data;
    if (!d) return;
    const text = buildDailySalePrintText(d, { companyName: settingsQ.data?.companyName || 'Mountain Bakes', currencySymbol: settingsQ.data?.currencySymbol || 'Rs.' });
    shareText(`Daily Sale Record — ${d.branch?.name ?? d.record.branchName} ${d.record.businessDate}`, text).catch((e: unknown) =>
      Alert.alert('Could Not Print', mapErrorToMessage(e)),
    );
  };

  const lockRecord = (r: DailySaleRecord) => {
    if (!r.id) return;
    lock.mutate(r.id, {
      onSuccess: () => Alert.alert('Locked', 'Record locked.'),
      onError: (e) => Alert.alert('Could Not Update the Record', mapErrorToMessage(e)),
    });
  };

  const detail = q.data;
  const audits = detail?.audits ?? [];
  const record = detail?.record;
  const tabs: FilterChipOption<Tab>[] = [
    { value: 'summary', label: 'Summary' },
    { value: 'history', label: `History (${audits.length})` },
  ];

  return (
    <Screen>
      <AppHeader
        title="Daily Sale Record"
        subtitle={record ? `${detail?.branch?.name ?? record.branchName} · ${displayDate(record.businessDate)}` : undefined}
        actions={[{ icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' }]}
      />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 10 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}>
        {q.isLoading ? <LoadingSkeleton height={260} /> : null}
        {q.error ? <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
        {!q.isLoading && !q.error && !record ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center' }]}>This record could not be loaded.</Text>
        ) : null}

        {record ? (
          <>
            <Card style={{ padding: 14 }}>
              <View style={styles.head}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{detail?.branch?.name ?? record.branchName}</Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                    Business date {displayDate(record.businessDate)}
                    {record.generatedAt ? ` · generated ${stamp(record.generatedAt)}` : ''}
                  </Text>
                </View>
                <DsrStatusBadge status={record.status} />
              </View>
            </Card>

            {Math.abs(record.paymentTotal - record.autoTotalSale) > 0.01 ? (
              <View style={[styles.warning, { borderColor: theme.colors.warning, backgroundColor: `${theme.colors.warning}14`, borderRadius: theme.radii.md }]}>
                <Text style={[theme.typography.label, { color: theme.colors.warning, flex: 1 }]}>
                  ⚠ The payment breakdown ({money(record.paymentTotal)}) does not match the total sale ({money(record.autoTotalSale)}). Raise this on the Help
                  Desk before signing the day off.
                </Text>
              </View>
            ) : null}

            {(() => {
              const can = dailySaleRowActions(record);
              return (
                <View style={styles.actions}>
                  <ActionChip icon="printer" label="Print" onPress={print} />
                  {can.feed ? <ActionChip icon="plus" label="Manual Feed" onPress={() => sheet.open({ kind: 'feed', record })} /> : null}
                  {can.amend ? <ActionChip icon="pencil" label="Amend" onPress={() => sheet.open({ kind: 'amend', record })} /> : null}
                  {can.lock ? <ActionChip icon="lock" label="Lock" primary onPress={() => lockRecord(record)} loading={lock.isPending} disabled={busy} /> : null}
                  {can.unlock ? <ActionChip icon="rotate-ccw" label="Unlock" onPress={() => sheet.open({ kind: 'unlock', record })} /> : null}
                </View>
              );
            })()}

            <FilterChipRow options={tabs} value={tab} onChange={setTab} />
            {tab === 'summary' ? <SummaryTab record={record} /> : <HistoryTab audits={audits} />}
          </>
        ) : null}
      </ScrollView>
      {sheet.element}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 5 },
  sectionTitle: { letterSpacing: 1, paddingBottom: 6, marginBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warning: { borderWidth: 1, padding: 12, flexDirection: 'row' },
  audit: { paddingVertical: 10 },
  auditHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
});
