import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { MBButton, MBCard, MBEmptyState, MBHeader, MBPressable } from '@/common/ui';
import {
  listUnresolved,
  type ConflictRecord,
} from '@/common/database/repositories/conflictRepository';
import {
  listByStatus,
  requeue,
  requeueAllFailed,
  type SyncQueueRow,
  type SyncQueueStatus,
} from '@/common/database/repositories/syncQueueRepository';
import { applyResolution } from '@/api/sync/resolveConflict';
import type { ConflictResolution } from '@/api/sync/conflicts';
import { ConflictCard } from '../components/ConflictCard';
import { useNetworkStore } from '@/state/networkStore';
import { useSyncStore } from '@/state/syncStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { contentColumn, layout, space } from '@/common/theme/spacing';

/**
 * Sync Center.
 *
 * Shows every operation that has not reached the server, and why. Nothing here
 * can be deleted: a failed or conflicted row is still the only copy of a
 * transaction the server never accepted, so the actions are Retry and Retry all,
 * never Discard.
 *
 * The Conflicts tab is not a list of queue rows like the others. A conflict is a
 * disagreement with the server, so it reads from `sync_conflicts` — which keeps
 * BOTH sides, the operator's entry and the server's answer — and offers only the
 * resolutions `conflicts.ts` has cleared as safe for that kind of conflict. Some
 * conflicts (a sale priced differently by the server) have no queue row left to
 * show at all: the transaction succeeded, and the disagreement is about what it
 * became.
 */

const TABS: ReadonlyArray<{
  key: string;
  label: string;
  statuses: SyncQueueStatus[];
}> = [
  {
    key: 'pending',
    label: 'Pending',
    statuses: ['pending', 'syncing', 'blocked'],
  },
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
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const active = TABS.find(t => t.key === tab) ?? TABS[0]!;
    setLoading(true);
    try {
      if (active.key === 'conflicts') {
        setConflicts(await listUnresolved());
      } else {
        setRows(await listByStatus(active.statuses));
      }
    } catch {
      setRows([]);
      setConflicts([]);
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

  // The handlers are passed whole rather than wrapped per row, so the memoised
  // cards below can bail out when a tab switch or a reload re-renders the list.
  const renderOperation = useCallback(
    ({ item }: { item: SyncQueueRow }) => <OperationCard row={item} onRetry={onRetry} />,
    [onRetry],
  );

  /**
   * A person's decision about one conflict.
   *
   * `applyResolution` refuses anything the policy has not cleared rather than
   * throwing, so an unsafe choice surfaces here as a message instead of a crash.
   * A drain follows only the resolutions that put work back in the queue — there
   * is nothing to send after keeping the server's version.
   */
  const onResolveConflict = useCallback(
    async (
      conflict: ConflictRecord,
      resolution: ConflictResolution,
      options?: { editedBusinessDate?: string },
    ) => {
      setResolveError(null);
      const outcome = await applyResolution({
        conflict,
        resolution,
        ...(options?.editedBusinessDate
          ? { editedBusinessDate: options.editedBusinessDate }
          : {}),
      });

      if (!outcome.ok) {
        setResolveError(outcome.reason);
        return;
      }

      if (resolution === 'retry' || resolution === 'resend_as_new') {
        await sync();
      }
      await load();
    },
    [sync, load],
  );

  const renderConflict = useCallback(
    ({ item }: { item: ConflictRecord }) => (
      <ConflictCard conflict={item} onResolve={onResolveConflict} />
    ),
    [onResolveConflict],
  );

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
              <MBPressable
                key={t.key}
                onPress={() => setTab(t.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.sm, // a chip is chosen, not read — v4 keeps the pill for status
                    paddingHorizontal: theme.space.lg,
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}>
                <Text
                  style={[
                    theme.type.label,
                    {
                      color: selected ? theme.colors.onPrimary : theme.colors.text,
                    },
                  ]}>
                  {t.label}
                </Text>
              </MBPressable>
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

      {resolveError ? (
        <Text
          style={[
            theme.type.caption,
            {
              color: theme.colors.danger,
              paddingHorizontal: theme.layout.screenPad,
              paddingBottom: theme.space.sm,
            },
          ]}>
          {resolveError}
        </Text>
      ) : null}

      {loading ? null : tab === 'conflicts' ? (
        conflicts.length === 0 ? (
          <MBEmptyState
            title="No conflicts"
            message="Nothing on this device disagrees with the server."
          />
        ) : (
          <FlashList
            data={conflicts}
            renderItem={renderConflict}
            keyExtractor={conflictKey}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ListSeparator}
            refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
          />
        )
      ) : rows.length === 0 ? (
        <MBEmptyState
          title={emptyTitleFor(tab)}
          message={
            tab === 'pending' ? 'Everything on this device has reached the server.' : undefined
          }
        />
      ) : (
        /* Virtualised, not a mapped ScrollView. This is the one screen whose
           list is longest exactly when the device is least able to cope: after
           a shift worked offline, every transaction of that shift is a row. */
        <FlashList
          data={rows}
          renderItem={renderOperation}
          keyExtractor={operationKey}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ListSeparator}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        />
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
    return `${needsAttention} ${needsAttention === 1 ? 'transaction needs' : 'transactions need'} attention`;
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

/**
 * Memoised. Switching tabs or reloading re-renders the list; with a stable
 * `onRetry` none of the visible cards re-render with it. Theme changes still
 * reach it — context bypasses `memo`.
 */
const OperationCard = React.memo(function OperationCardView({
  row,
  onRetry,
}: {
  row: SyncQueueRow;
  onRetry: (row: SyncQueueRow) => void;
}): React.ReactElement {
  // Bound here so the caller can pass one stable handler for the whole list.
  const retry = useCallback(() => onRetry(row), [onRetry, row]);
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

      {/* Attempts alone do not say whether a row is stuck. "3 attempts" five
          minutes ago is a queue working; the same three from Tuesday is
          something a person has to deal with. */}
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {row.attemptCount} {row.attemptCount === 1 ? 'attempt' : 'attempts'}
        {row.lastAttemptAt ? ` · last tried ${dataAsOfFrom(row.lastAttemptAt)}` : ''}
      </Text>

      {row.lastErrorMessage ? (
        <Text style={[theme.type.caption, { color: theme.colors.danger }]}>
          {row.lastErrorMessage}
        </Text>
      ) : null}

      {canRetry ? <MBButton label="Retry" onPress={retry} variant="secondary" size="sm" /> : null}
    </MBCard>
  );
});

/** Module scope: a key or separator built during render re-keys the list each pass. */
function operationKey(row: SyncQueueRow): string {
  return String(row.id);
}

function conflictKey(conflict: ConflictRecord): string {
  return String(conflict.id);
}

function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: space.sm },
  chip: {
    height: layout.chipH,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actions: { flexDirection: 'row', gap: space.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
    marginBottom: space.tight,
  },
});
