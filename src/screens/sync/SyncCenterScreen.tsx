import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MBButton, MBCard, MBEmptyState, MBHeader } from '@/components';
import {
  listByStatus,
  requeue,
  requeueAllFailed,
  type SyncQueueRow,
  type SyncQueueStatus,
} from '@/database/repositories/syncQueueRepository';
import { useNetworkStore } from '@/store/networkStore';
import { useSyncStore } from '@/store/syncStore';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Sync Center.
 *
 * Shows every operation that has not reached the server, and why. Nothing here
 * can be deleted: a failed or conflicted row is still the only copy of a
 * transaction the server never accepted, so the actions are Retry and Retry all,
 * never Discard.
 */

const TABS: ReadonlyArray<{ key: string; label: string; statuses: SyncQueueStatus[] }> = [
  { key: 'pending', label: 'Pending', statuses: ['pending', 'syncing', 'blocked'] },
  { key: 'failed', label: 'Failed', statuses: ['failed'] },
  { key: 'conflicts', label: 'Conflicts', statuses: ['conflict'] },
  { key: 'done', label: 'Completed', statuses: ['synced'] },
];

export function SyncCenterScreen({ onBack }: { onBack?: () => void }): React.ReactElement {
  const theme = useTheme();
  const isOnline = useNetworkStore(s => s.isOnline);
  const phase = useSyncStore(s => s.phase);
  const pending = useSyncStore(s => s.pending);
  const needsAttention = useSyncStore(s => s.needsAttention);
  const sync = useSyncStore(s => s.sync);

  const [tab, setTab] = useState(TABS[0]!.key);
  const [rows, setRows] = useState<SyncQueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const active = TABS.find(t => t.key === tab) ?? TABS[0]!;
    setLoading(true);
    try {
      setRows(await listByStatus(active.statuses));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load, phase]);

  const onRetry = useCallback(
    async (row: SyncQueueRow) => {
      await requeue(row.id);
      await sync();
      await load();
    },
    [sync, load],
  );

  const onRetryAll = useCallback(async () => {
    await requeueAllFailed();
    await sync();
    await load();
  }, [sync, load]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Sync Center"
        subtitle={statusLine({ isOnline, phase, pending, needsAttention })}
        onBack={onBack}
      />

      <View style={{ padding: theme.layout.screenPad, gap: theme.space.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.space.sm }}>
          {TABS.map(t => {
            const selected = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: theme.space.lg,
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}>
                <Text
                  style={[
                    theme.type.label,
                    { color: selected ? theme.colors.onPrimary : theme.colors.text },
                  ]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.actions}>
          <MBButton
            label={phase === 'syncing' ? 'Syncing…' : 'Sync now'}
            onPress={sync}
            loading={phase === 'syncing'}
            disabled={!isOnline}
            size="md"
          />
          {tab === 'failed' && rows.length > 0 ? (
            <MBButton label="Retry all" onPress={onRetryAll} variant="secondary" size="md" />
          ) : null}
        </View>
      </View>

      {loading ? null : rows.length === 0 ? (
        <MBEmptyState
          title={emptyTitleFor(tab)}
          message={
            tab === 'pending'
              ? 'Everything on this device has reached the server.'
              : undefined
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.sm }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
          {rows.map(row => (
            <OperationCard key={row.id} row={row} onRetry={() => onRetry(row)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function statusLine({
  isOnline,
  phase,
  pending,
  needsAttention,
}: {
  isOnline: boolean;
  phase: string;
  pending: number;
  needsAttention: number;
}): string {
  if (phase === 'syncing') return 'Syncing…';
  if (!isOnline) return 'Offline — waiting for a connection';
  if (needsAttention > 0) {
    return `${needsAttention} ${needsAttention === 1 ? 'item needs' : 'items need'} attention`;
  }
  if (pending > 0) {
    return `${pending} ${pending === 1 ? 'transaction' : 'transactions'} waiting to sync`;
  }
  return 'All synced';
}

function emptyTitleFor(tab: string): string {
  if (tab === 'failed') return 'Nothing has failed';
  if (tab === 'conflicts') return 'No conflicts';
  if (tab === 'done') return 'Nothing synced yet';
  return 'Nothing waiting';
}

const ENTITY_LABEL: Record<string, string> = {
  sale: 'Sale',
  order: 'Order',
  expense: 'Expense',
  stock_movement: 'Stock return',
  production_order: 'Production order',
};

function OperationCard({
  row,
  onRetry,
}: {
  row: SyncQueueRow;
  onRetry: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const canRetry = row.status === 'failed' || row.status === 'conflict';

  const statusColor =
    row.status === 'failed' || row.status === 'conflict'
      ? theme.colors.danger
      : row.status === 'synced'
        ? theme.colors.success
        : theme.colors.warning;

  return (
    <MBCard>
      <View style={styles.cardHeader}>
        <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
          {ENTITY_LABEL[row.entity] ?? row.entity}
        </Text>
        <Text style={[theme.type.label, { color: statusColor }]}>{row.status}</Text>
      </View>

      {row.businessDate ? (
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Business day {row.businessDate}
        </Text>
      ) : null}

      {/* The operation id is what makes a retry safe — it is the idempotency key
          the server dedupes on. Shown so it can be quoted in a support ticket. */}
      <Text style={[theme.type.mono, { color: theme.colors.textMuted }]} numberOfLines={1}>
        {row.clientOperationId}
      </Text>

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {row.attemptCount} {row.attemptCount === 1 ? 'attempt' : 'attempts'}
      </Text>

      {row.lastErrorMessage ? (
        <Text style={[theme.type.caption, { color: theme.colors.danger }]}>
          {row.lastErrorMessage}
        </Text>
      ) : null}

      {canRetry ? (
        <MBButton label="Retry" onPress={onRetry} variant="secondary" size="sm" />
      ) : null}
    </MBCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chip: { height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
});
