import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRestrictionEvents, useRestrictionMonitor, useRestrictionRequests, type RestrictionRequest, type RestrictionRequestType } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, FilterChipRow, LoadingSkeleton, type FilterChipOption } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { CodeTag, DetailRows, MONO, Pill, formatDateTime } from '../../components/AdminDetail';
import {
  AUDIT_RULE_CODES,
  EVENT_RESULT_TONES,
  MONITOR_STATUS_TONES,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_TYPES,
  REQUEST_TYPE_LABELS,
  daysBetweenDateStr,
  restrictionDmy,
} from './restrictionFormat';

/** A centred one-line state (loading / error / empty), as the web tabs show inside their card. */
function StateLine({ text, danger }: { text: string; danger?: boolean }) {
  const theme = useAppTheme();
  return (
    <Text style={[theme.typography.bodySmall, { color: danger ? theme.colors.danger : theme.colors.textSecondary, textAlign: 'center', paddingVertical: 20 }]}>
      {text}
    </Text>
  );
}

// ─── Approvals ──────────────────────────────────────────────────────────────

type TypeFilter = RestrictionRequestType | 'all';
const TYPE_OPTIONS: FilterChipOption<TypeFilter>[] = [{ value: 'all', label: 'All' }, ...REQUEST_TYPES.map((t) => ({ value: t, label: REQUEST_TYPE_LABELS[t] }))];

function summary(r: RestrictionRequest): string {
  const date = restrictionDmy(r.requestedDate);
  if (r.type === 'BACKDATED_DEMAND') return `Demand for ${date}`;
  if (r.type === 'CASH_DEPOSIT_LIMIT') return `One more deposit for ${date}`;
  return [r.entryLabel, r.amount !== null ? formatCurrency(r.amount) : null, date].filter(Boolean).join(' · ');
}

function context(r: RestrictionRequest): string {
  const days = daysBetweenDateStr(r.requestedDate, r.currentBusinessDate);
  const back = `${days} ${days === 1 ? 'day' : 'days'} before the business date it was requested on`;
  if (r.type === 'BACKDATED_DEMAND') return `Requested date is ${back}.`;
  if (r.type === 'LEDGER_BACKDATE') return `Entry date is ${back}.`;
  if (r.type === 'CASH_DEPOSIT_LIMIT') return 'The daily cash-deposit limit had been reached.';
  return 'Company Share is normally received through Branch Cash Deposit.';
}

function fields(r: RestrictionRequest): { label: string; value: string }[] {
  const out = [{ label: 'Branch', value: r.branchName ?? 'Company-wide' }];
  if (r.type === 'LEDGER_BACKDATE' || r.type === 'COMPANY_SHARE_INCOME') {
    out.push({ label: 'Ledger entry type', value: r.entryLabel ?? '—' });
    out.push({ label: 'Amount', value: r.amount !== null ? formatCurrency(r.amount) : '—' });
    out.push({ label: 'Description', value: r.description || '—' });
  } else if (r.description) {
    out.push({ label: 'Details', value: r.description });
  }
  out.push(
    { label: r.type === 'BACKDATED_DEMAND' ? 'Requested business date' : 'Requested date', value: restrictionDmy(r.requestedDate) },
    { label: 'Current business date', value: restrictionDmy(r.currentBusinessDate) },
    { label: 'Requested by', value: r.requestedByName },
    { label: 'Requested at', value: formatDateTime(r.requestedAt) },
  );
  return out;
}

function decisionFields(r: RestrictionRequest): { label: string; value: string }[] {
  const out = [
    { label: 'Approval ID', value: r.approvalNo ?? '—' },
    { label: 'Approver', value: r.decidedByName ?? '—' },
    { label: 'Approval time', value: formatDateTime(r.decidedAt) },
    { label: 'Decision', value: REQUEST_STATUS_LABELS[r.status] },
    { label: 'Reason', value: r.adminReason || '—' },
  ];
  if (r.status === 'approved') out.push({ label: 'Used on', value: r.consumedRef ?? (r.consumedAt ? 'Used' : 'Not used yet') });
  return out;
}

/**
 * Restriction Rules → Approvals (`GET /api/restrictions/requests`). The web's
 * list-plus-detail panel as cards: the selected request (the first one by
 * default) opens in place. Approve / Reject are web actions this phase.
 */
export function ApprovalsTab() {
  const theme = useAppTheme();
  const [type, setType] = useState<TypeFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = useRestrictionRequests(type === 'all' ? null : type);
  const requests = q.data?.requests ?? [];
  const selected = requests.find((r) => r.id === selectedId) ?? requests[0] ?? null;

  return (
    <View style={{ gap: 10 }}>
      <FilterChipRow
        options={TYPE_OPTIONS}
        value={type}
        onChange={(t) => {
          setType(t);
          setSelectedId(null);
        }}
      />
      {q.isLoading ? <StateLine text="Loading requests…" /> : null}
      {q.isError ? <StateLine text="Could not load the requests." danger /> : null}
      {q.isSuccess && requests.length === 0 ? <StateLine text="No requests in this category." /> : null}
      {requests.map((r) => {
        const open = selected?.id === r.id;
        return (
          <Card key={r.id} style={[styles.card, open ? { borderColor: theme.colors.primary } : null]}>
            <Pressable onPress={() => setSelectedId(r.id)} accessibilityRole="button" accessibilityState={{ selected: open }} style={{ gap: 4 }}>
              <View style={styles.between}>
                <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }, MONO]}>{r.requestNo}</Text>
                <Pill label={REQUEST_STATUS_LABELS[r.status]} tone={REQUEST_STATUS_TONES[r.status]} />
              </View>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
                {REQUEST_TYPE_LABELS[r.type] ?? r.type} · {r.branchName ?? 'Company-wide'}
              </Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{summary(r)}</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>
                {r.requestedByName} · {formatDateTime(r.requestedAt)}
              </Text>
            </Pressable>
            {open ? <RequestDetail r={r} /> : null}
          </Card>
        );
      })}
    </View>
  );
}

function RequestDetail({ r }: { r: RestrictionRequest }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.detail, { borderTopColor: theme.colors.border }]}>
      <DetailRows rows={fields(r)} />
      <View style={[styles.box, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.border }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{r.branchId ? 'Branch reason' : 'Reason given'}</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{r.reason}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <CodeTag code={r.type} />
        <Text style={[theme.typography.label, { color: theme.colors.text, flexShrink: 1 }]}>{context(r)}</Text>
      </View>
      {r.status === 'pending' ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Approval is one-time and tied to this request. It cannot be reused for another transaction.
        </Text>
      ) : (
        <DetailRows rows={decisionFields(r)} />
      )}
    </View>
  );
}

// ─── Branch Monitor ─────────────────────────────────────────────────────────

/** Restriction Rules → Branch Monitor (`GET /api/restrictions/monitor`), one card per branch. */
export function MonitorTab({ cashLimit }: { cashLimit: number }) {
  const theme = useAppTheme();
  const q = useRestrictionMonitor();
  const rows = q.data?.branches ?? [];
  return (
    <View style={{ gap: 10 }}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        Live restriction state per branch, evaluated with the current rule configuration.
      </Text>
      {q.isLoading ? <StateLine text="Loading branches…" /> : null}
      {q.isError ? <StateLine text="Could not load the branch monitor." danger /> : null}
      {q.isSuccess && rows.length === 0 ? <StateLine text="No active branches." /> : null}
      {rows.map((m) => (
        <Card key={m.branchId} style={styles.card}>
          <View style={styles.between}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]}>{m.branchName}</Text>
            <Pill label={m.demandStatus} tone={MONITOR_STATUS_TONES[m.demandStatus] ?? 'neutral'} />
          </View>
          <DetailRows
            rows={[
              { label: 'Awaiting verification', value: String(m.pendingCount) },
              { label: 'Demand numbers', value: m.pendingDemandNumbers.join(', ') || '—', mono: true },
              { label: 'Oldest awaiting', value: m.oldestPending ? `${m.oldestPending.demandNumber} · ${formatDateTime(m.oldestPending.submittedAt)}` : '—' },
              { label: 'Sales this hour', value: `${m.salesThisHour} / hr` },
              { label: 'Deposits today', value: `${m.depositsToday} / ${cashLimit}` },
            ]}
          />
        </Card>
      ))}
    </View>
  );
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

type CodeFilter = (typeof AUDIT_RULE_CODES)[number] | 'all';
const CODE_OPTIONS: FilterChipOption<CodeFilter>[] = [{ value: 'all', label: 'All' }, ...AUDIT_RULE_CODES.map((c) => ({ value: c, label: c }))];

/** Restriction Rules → Audit Log (`GET /api/restrictions/events`, newest 200), one card per event. */
export function AuditTab() {
  const theme = useAppTheme();
  const [code, setCode] = useState<CodeFilter>('all');
  const q = useRestrictionEvents(code === 'all' ? null : code);
  const events = q.data?.events ?? [];
  return (
    <View style={{ gap: 10 }}>
      <FilterChipRow options={CODE_OPTIONS} value={code} onChange={setCode} />
      {q.isLoading ? <LoadingSkeleton height={120} /> : null}
      {q.isError ? <StateLine text="Could not load the audit log." danger /> : null}
      {q.isSuccess && events.length === 0 ? <StateLine text="No events recorded for this rule yet." /> : null}
      {events.map((e) => (
        <Card key={e.id} style={styles.card}>
          <View style={styles.between}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }, MONO]}>{e.eventNo}</Text>
            <Pill label={e.result} tone={EVENT_RESULT_TONES[e.result] ?? 'neutral'} />
          </View>
          <CodeTag code={e.ruleCode} />
          <DetailRows
            rows={[
              { label: 'Branch / User', value: `${e.branchName ?? '—'} · ${e.userName ?? '—'}` },
              { label: 'Transaction / Request', value: e.ref ?? '—', mono: true },
              { label: 'Date & time', value: formatDateTime(e.createdAt) },
              { label: 'Value / Threshold', value: e.currentValue !== null && e.threshold !== null ? `${e.currentValue} / ${e.threshold}` : '—' },
              { label: 'Action', value: e.action },
              { label: 'Approval', value: e.approvalNo ?? '—', mono: true },
            ]}
          />
        </Card>
      ))}
      {events.length >= 200 ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Showing the latest 200 events.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  detail: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8, gap: 8 },
  box: { borderWidth: 1, borderRadius: 8, padding: 10, gap: 2 },
});
