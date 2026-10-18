import { useMemo, useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { useFinanceAudit, type FinanceAuditAction, type FinanceAuditEntity, type FinanceAuditLog } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, FilterChipRow, Icon, LoadingSkeleton, Screen, StatusBadge } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { getFinanceDateRange, type FinanceDateRangePreset } from '../../utils/dateRange';
import { FinanceDateRangeFilter } from '../../components/FinanceDateRangeFilter';
import { formatStamp } from '../../utils/financeFormat';
import { computeReviewSpeeds, describeDuration, isFastApproval, type ReviewSpeed } from '../../utils/reviewSpeed';
import { styles } from './styles';

const ACTION_LABEL: Record<FinanceAuditAction, string> = {
  created: 'Created',
  updated: 'Updated',
  submitted: 'Submitted',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  posted: 'Posted',
  reversed: 'Reversed',
  adjusted: 'Adjusted',
  locked: 'Locked',
  imported: 'Imported',
  settings_updated: 'Settings Updated',
  salary_revised: 'Salary Revised',
  resigned: 'Resignation Recorded',
  resignation_cancelled: 'Resignation Cancelled',
  resolved: 'Resolved',
  reopened: 'Reopened',
  reopen_requested: 'Reopen Requested',
  deleted: 'Deleted',
  amended: 'Amended',
  restored: 'Restored',
  recreated: 'Recreated',
};

const ENTITY_LABEL: Record<FinanceAuditEntity, string> = {
  ledger_entry: 'Ledger Entry',
  ledger_head: 'Ledger Head',
  finance_transaction: 'Income/Expense Entry',
  income_approval: 'Branch Income',
  salary_payment: 'Payslip',
  employee_advance: 'Employee Advance',
  partner_expense: 'Partner Advance/Draw',
  employee: 'Employee',
  day_closing: 'Daily Closing',
  settings: 'Settings',
  branch_share_payment: 'Branch Share Payment',
  finance_partner: 'Partner',
  finance_ticket: 'Help Desk Query',
  cash_transfer: 'Cash Transfer',
};

/** Actions that change or remove money already on the books — flagged with an icon, not colour alone. */
const SENSITIVE: ReadonlySet<FinanceAuditAction> = new Set(['deleted', 'reversed', 'adjusted', 'amended', 'restored', 'settings_updated', 'recreated']);

type AuditView = 'all' | 'approved' | 'fast' | 'sensitive';
const VIEW_OPTIONS: { value: AuditView; label: string }[] = [
  { value: 'all', label: 'All activity' },
  { value: 'approved', label: 'Approvals' },
  { value: 'fast', label: 'Fast approvals' },
  { value: 'sensitive', label: 'Sensitive changes' },
];

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All records' },
  ...(Object.keys(ENTITY_LABEL) as FinanceAuditEntity[]).map((e) => ({ value: e, label: ENTITY_LABEL[e] })),
];

/** The window loaded at once — the server's cap. Review speeds only see what is loaded. */
const PAGE = 500;

/** "approvedByName" → "Approved By Name" — never a raw key on screen. */
function humanKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (c) => c.toUpperCase());
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function speedText(speed: ReviewSpeed): string | null {
  if (speed.gapMs === null) return null;
  return `Approved ${describeDuration(speed.gapMs)} after ${speed.from === 'submitted' ? 'submission' : 'creation'}`;
}

/** mountainbakesFinance.html screen 20 — every finance write, read-only, with review speed on approvals. */
export function FinanceAuditTrailScreen() {
  const theme = useAppTheme();
  const [preset, setPreset] = useState<FinanceDateRangePreset>('week');
  const [entity, setEntity] = useState<string>('all');
  const [view, setView] = useState<AuditView>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const range = getFinanceDateRange(preset);

  // No `action` filter on the request: the review speed of an approval is read
  // off the same record's `created` / `submitted` rows, which must be loaded too.
  const { data, isLoading, error, refetch, isRefetching } = useFinanceAudit({
    from: range.from,
    to: range.to,
    limit: PAGE,
    ...(entity !== 'all' ? { entity } : {}),
  });
  const logs = useMemo(() => data?.logs ?? [], [data]);
  const speeds = useMemo(() => computeReviewSpeeds(logs), [logs]);

  const visible = useMemo(
    () =>
      logs.filter((l) => {
        if (view === 'approved') return l.action === 'approved';
        if (view === 'fast') return l.action === 'approved' && isFastApproval(speeds.get(l.id));
        if (view === 'sensitive') return SENSITIVE.has(l.action);
        return true;
      }),
    [logs, view, speeds],
  );

  const sections = useMemo(() => {
    const groups: { title: string; data: FinanceAuditLog[] }[] = [];
    for (const l of visible) {
      const day = formatStamp(l.createdAt).split(' · ')[0]!;
      const last = groups[groups.length - 1];
      if (last && last.title === day) last.data.push(l);
      else groups.push({ title: day, data: [l] });
    }
    return groups;
  }, [visible]);

  const fastCount = logs.filter((l) => l.action === 'approved' && isFastApproval(speeds.get(l.id))).length;

  return (
    <Screen>
      <AppHeader title="Audit Trail" subtitle="Every finance write, read-only" actions={[]} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        stickySectionHeadersEnabled={false}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <View>
            <FinanceDateRangeFilter value={preset} onChange={setPreset} />
            <View style={{ marginTop: theme.spacing.sm }}>
              <FilterChipRow options={ENTITY_OPTIONS} value={entity} onChange={setEntity} />
            </View>
            <View style={{ marginTop: theme.spacing.sm }}>
              <FilterChipRow
                options={VIEW_OPTIONS.map((o) => (o.value === 'fast' ? { ...o, count: fastCount } : o))}
                value={view}
                onChange={setView}
              />
            </View>
            {data && data.total > logs.length ? (
              <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: theme.spacing.sm }]}>
                Showing the latest {logs.length} of {data.total} entries. Narrow the dates to see the rest.
              </Text>
            ) : null}
            {view === 'fast' ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
                Approved under 10 seconds after submission, or one of several approvals by the same person within a minute.
              </Text>
            ) : null}
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.xs }]}>
            {section.title.toUpperCase()}
          </Text>
        )}
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState title={view === 'fast' ? 'No Fast Approvals' : 'No Activity'} message="Nothing in this window matches the filters." />
          ) : undefined
        }
        renderItem={({ item }) => {
          const speed = item.action === 'approved' ? speeds.get(item.id) : undefined;
          const sensitive = SENSITIVE.has(item.action);
          const open = expanded === item.id;
          const hasDiff = Boolean(item.previousValues || item.newValues);
          const keys = Array.from(new Set([...Object.keys(item.previousValues ?? {}), ...Object.keys(item.newValues ?? {})]));
          const gap = speed ? speedText(speed) : null;
          return (
            <Card style={{ marginBottom: 8 }}>
              <Pressable
                disabled={!hasDiff}
                accessibilityRole={hasDiff ? 'button' : undefined}
                accessibilityState={hasDiff ? { expanded: open } : undefined}
                accessibilityLabel={
                  `${ACTION_LABEL[item.action] ?? humanKey(item.action)}${sensitive ? ', sensitive change' : ''}. ` +
                  `${ENTITY_LABEL[item.entity] ?? 'Record'}${item.entityRef ? ` ${item.entityRef}` : ''}, by ${item.actorName}, ${formatStamp(item.createdAt)}.` +
                  (speed?.fast ? ' Approved in under 10 seconds.' : '') +
                  (speed?.burstNote ? ` ${speed.burstNote}.` : '') +
                  (hasDiff ? (open ? ' Hide changes.' : ' Show changes.') : '')
                }
                onPress={() => setExpanded(open ? null : item.id)}>
                <View style={styles.row}>
                  <View style={styles.titleRow}>
                    {sensitive ? <Icon name="shield-check" size={14} color={theme.colors.warning} /> : null}
                    <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{ACTION_LABEL[item.action] ?? humanKey(item.action)}</Text>
                  </View>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{formatStamp(item.createdAt).split(' · ')[1]}</Text>
                </View>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 4 }]}>
                  {ENTITY_LABEL[item.entity] ?? 'Record'}
                  {item.entityRef ? ` · ${item.entityRef}` : ''}
                </Text>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>{item.actorName}</Text>

                {speed && (speed.fast || speed.burstNote || gap) ? (
                  <View style={styles.badges}>
                    {speed.fast ? <StatusBadge label="Approved in under 10 seconds" variant="warning" /> : null}
                    {speed.burstNote ? <StatusBadge label={speed.burstNote} variant="neutral" /> : null}
                  </View>
                ) : null}
                {gap && !speed?.fast ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>{gap}</Text> : null}
                {speed && speed.gapMs === null ? (
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>Submitted before this window; review time unknown.</Text>
                ) : null}
                {hasDiff && !open ? <Text style={[theme.typography.label, { color: theme.colors.primary, marginTop: 6 }]}>Show changes</Text> : null}
              </Pressable>

              {open ? (
                <View style={{ marginTop: theme.spacing.sm }}>
                  <View style={[styles.diffRow, { borderTopColor: theme.colors.border }]}>
                    <Text style={[theme.typography.label, styles.diffKey, { color: theme.colors.textSecondary }]}>FIELD</Text>
                    <Text style={[theme.typography.label, styles.diffValues, { color: theme.colors.textSecondary }]}>BEFORE → AFTER</Text>
                  </View>
                  {keys.map((k) => {
                    const before = item.previousValues?.[k];
                    const after = item.newValues?.[k];
                    return (
                      <View key={k} style={[styles.diffRow, { borderTopColor: theme.colors.border }]}>
                        <Text style={[theme.typography.label, styles.diffKey, { color: theme.colors.textSecondary }]}>{humanKey(k)}</Text>
                        <Text style={[theme.typography.bodySmall, styles.diffValues, { color: theme.colors.text }]}>
                          {item.previousValues ? `${show(before)} → ${show(after)}` : show(after)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </Card>
          );
        }}
      />
    </Screen>
  );
}

