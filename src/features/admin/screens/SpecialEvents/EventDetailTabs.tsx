import { StyleSheet, Text, View } from 'react-native';
import {
  EVENT_STAGE_LABELS,
  useConsolidatedDemand,
  useEventDemands,
  useEventNotifications,
  useEventProductionStatus,
  type EventNotificationRow,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, EmptyState, ErrorState, LoadingSkeleton } from '@/shared/ui';
import { formatCount, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { DemandStatusBadge, ProgressBar, ReminderStatusBadge } from './EventBits';

function formatDateTime(iso: string): string {
  return `${formatDisplayDate(iso.slice(0, 10))}, ${formatDisplayTime(iso)}`;
}

/** A three- or four-column table line: first cell flexes, the rest are right-aligned numbers. */
function TableRow({ cells, bold, header }: { cells: string[]; bold?: boolean; header?: boolean }) {
  const theme = useAppTheme();
  const color = header ? theme.colors.textSecondary : theme.colors.text;
  const weight = bold || header ? '700' : '400';
  return (
    <View style={[styles.tableRow, { borderBottomColor: theme.colors.border }]}>
      {cells.map((cell, i) => (
        <Text
          key={i}
          style={[
            header ? theme.typography.label : theme.typography.bodySmall,
            { color, fontWeight: weight },
            i === 0 ? { flex: 1, minWidth: 0 } : styles.numCell,
          ]}
          numberOfLines={2}>
          {cell}
        </Text>
      ))}
    </View>
  );
}

/** Web BranchDemandPanel, read-only: no Approve / Reject this phase. */
export function BranchDemandsTab({ eventId }: { eventId: string }) {
  const theme = useAppTheme();
  const q = useEventDemands(eventId);
  if (q.isLoading) return <LoadingSkeleton height={160} />;
  if (q.error) return <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} />;
  const demands = q.data ?? [];
  if (demands.length === 0) {
    return (
      <EmptyState
        title="No branch demand yet"
        message="Branches submit their advance demand from the Events screen. Reminders go out automatically once scheduled."
      />
    );
  }
  const muted = { color: theme.colors.textSecondary };
  return (
    <View style={{ gap: 10 }}>
      {demands.map((demand) => (
        <Card key={demand.id} style={{ padding: theme.spacing.md, gap: 6 }}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{demand.branchName || 'Branch'}</Text>
              <Text style={[theme.typography.label, muted]}>
                {demand.submittedAt
                  ? `Submitted ${formatDateTime(demand.submittedAt)}${demand.submittedByName ? ` by ${demand.submittedByName}` : ''}`
                  : 'Not submitted yet'}
              </Text>
            </View>
            <DemandStatusBadge status={demand.status} />
          </View>
          {demand.expectedCustomers !== null ? (
            <Text style={[theme.typography.bodySmall, muted]}>Expected customers: {formatCount(demand.expectedCustomers)}</Text>
          ) : null}
          {demand.notes ? <Text style={[theme.typography.bodySmall, muted]}>{demand.notes}</Text> : null}
          <View>
            <TableRow header cells={['Product', 'Requested', 'Approved']} />
            {demand.items.map((item) => (
              <TableRow key={item.id} cells={[item.productName, String(item.qty), item.approvedQty === null ? '—' : String(item.approvedQty)]} />
            ))}
          </View>
          {demand.reviewRemarks ? <Text style={[theme.typography.label, muted]}>Review note: {demand.reviewRemarks}</Text> : null}
        </Card>
      ))}
    </View>
  );
}

/** Web ConsolidatedDemandPanel — product-wise roll-up across every submitted branch demand. */
export function ConsolidatedTab({ eventId }: { eventId: string }) {
  const theme = useAppTheme();
  const q = useConsolidatedDemand(eventId);
  if (q.isLoading) return <LoadingSkeleton height={160} />;
  if (q.error) return <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} />;
  const rows = q.data?.rows ?? [];
  const branches = q.data?.branchesIncluded ?? 0;
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing to consolidate yet"
        message="Once branches submit their advance demand it is rolled up here, product by product."
      />
    );
  }
  const totalRequested = rows.reduce((n, r) => n + r.requestedQty, 0);
  const totalApproved = rows.reduce((n, r) => n + r.approvedQty, 0);
  return (
    <Card style={{ padding: theme.spacing.md, gap: 8 }}>
      <View style={styles.titleRow}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]}>Consolidated Demand</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          {branches} branch{branches === 1 ? '' : 'es'} · {rows.length} product{rows.length === 1 ? '' : 's'}
        </Text>
      </View>
      <View>
        <TableRow header cells={['Product', 'Branches', 'Requested', 'Approved']} />
        {rows.map((r) => (
          <TableRow key={r.productId ?? r.productName} cells={[r.productName, String(r.branchCount), String(r.requestedQty), String(r.approvedQty)]} />
        ))}
        <TableRow bold cells={['Total', '', String(totalRequested), String(totalApproved)]} />
      </View>
    </Card>
  );
}

/** Web ProductionReadinessPanel, read-only: overall readiness then the four stage cards. */
export function ReadinessTab({ eventId }: { eventId: string }) {
  const theme = useAppTheme();
  const q = useEventProductionStatus(eventId);
  if (q.isLoading) return <LoadingSkeleton height={200} />;
  if (q.error) return <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} />;
  const readiness = q.data?.readinessPercentage ?? 0;
  const stages = q.data?.stages ?? [];
  const muted = { color: theme.colors.textSecondary };
  return (
    <View style={{ gap: 10 }}>
      <Card style={{ padding: theme.spacing.md, gap: 8 }}>
        <View style={styles.titleRow}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]}>Overall Readiness</Text>
          <Text style={[theme.typography.kpi, { color: theme.colors.text }]}>{readiness}%</Text>
        </View>
        <ProgressBar value={readiness} />
        <Text style={[theme.typography.label, muted]}>The average of the four stages below.</Text>
      </Card>
      {stages.map((stage) => (
        <Card key={stage.id} style={{ padding: theme.spacing.md, gap: 8 }}>
          <View style={styles.titleRow}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600', flex: 1 }]}>
              {EVENT_STAGE_LABELS[stage.stage] ?? stage.stage}
            </Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{stage.completionPercentage}%</Text>
          </View>
          <ProgressBar value={stage.completionPercentage} />
          {stage.completedAt ? (
            <Text style={[theme.typography.label, { color: theme.colors.success }]}>
              Completed {formatDateTime(stage.completedAt)}
              {stage.updatedByName ? ` by ${stage.updatedByName}` : ''}
            </Text>
          ) : stage.startedAt ? (
            <Text style={[theme.typography.label, muted]}>Started {formatDateTime(stage.startedAt)}</Text>
          ) : (
            <Text style={[theme.typography.label, muted]}>Not started</Text>
          )}
          {stage.remarks ? <Text style={[theme.typography.bodySmall, muted]}>{stage.remarks}</Text> : null}
        </Card>
      ))}
    </View>
  );
}

const AUDIENCE_LABELS: Record<string, string> = { branch: 'Branch', production: 'Production', admin: 'Admin' };

function reminderText(row: EventNotificationRow): string {
  return row.reminderKind === 'demand_due' ? `Demand deadline · ${row.offsetDays} day before` : `${row.offsetDays} days before event`;
}

/** Web EventNotificationSchedule, read-only: no Rebuild / Send due reminders now. */
export function RemindersTab({ eventId }: { eventId: string }) {
  const theme = useAppTheme();
  const q = useEventNotifications(eventId);
  const rows = q.data ?? [];
  const pending = rows.filter((r) => r.status === 'pending').length;
  const sent = rows.filter((r) => r.status === 'sent').length;
  const muted = { color: theme.colors.textSecondary };
  return (
    <View style={{ gap: 10 }}>
      <Card style={{ padding: theme.spacing.md }}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Reminder Schedule</Text>
        <Text style={[theme.typography.label, muted]}>
          {pending} scheduled · {sent} sent
        </Text>
      </Card>
      {q.isLoading ? (
        <LoadingSkeleton height={160} />
      ) : q.error ? (
        <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No reminders scheduled" message="Reminders appear here once the event has a resolved date." />
      ) : (
        rows.map((row) => (
          <Card key={row.id} style={{ padding: theme.spacing.md, gap: 4 }}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{formatDisplayDate(row.scheduledFor)}</Text>
                <Text style={[theme.typography.label, muted]}>
                  {AUDIENCE_LABELS[row.audience] ?? row.audience} · {reminderText(row)}
                </Text>
              </View>
              <ReminderStatusBadge status={row.status} />
            </View>
            {row.errorMessage ? <Text style={[theme.typography.label, { color: theme.colors.danger }]}>{row.errorMessage}</Text> : null}
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  numCell: { width: 68, textAlign: 'right' },
});
