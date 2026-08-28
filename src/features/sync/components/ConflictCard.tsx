import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { MBButton, MBCard } from '@/common/ui';
import type { ConflictRecord } from '@/common/database/repositories/conflictRepository';
import { policyFor, type ConflictResolution } from '@/api/sync/conflicts';
import { businessDateStr } from '@/shared/utils/timezone';
import { useTheme } from '@/common/theme/ThemeProvider';
import { space } from '@/common/theme/spacing';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';

/**
 * One conflict, and what may be done about it.
 *
 * The card shows BOTH sides — what the operator entered and what the server
 * answered — because the resolution is a judgement no code can make. It never
 * shows an action the policy in `conflicts.ts` has not cleared for this conflict
 * type, so a mis-render cannot offer a resend that would double-commit.
 */

const ENTITY_LABEL: Record<string, string> = {
  sale: 'Sale',
  order: 'Order',
  expense: 'Expense',
  stock_movement: 'Stock return',
  production_order: 'Production order',
};

export interface ConflictCardProps {
  conflict: ConflictRecord;
  onResolve: (
    conflict: ConflictRecord,
    resolution: ConflictResolution,
    options?: { editedBusinessDate?: string },
  ) => Promise<void>;
}

/** Shortfall rows, when the server named the products it could not cover. */
function shortfallsFrom(serverState: unknown): Array<Record<string, unknown>> {
  if (!serverState || typeof serverState !== 'object') return [];
  const details = (serverState as Record<string, unknown>).details;
  if (!Array.isArray(details)) return [];
  return details.filter(
    (d): d is Record<string, unknown> => !!d && typeof d === 'object' && 'productName' in d,
  );
}

/** Products a partly-applied return ALREADY moved. The reason not to re-send. */
function committedFrom(serverState: unknown): Array<Record<string, unknown>> {
  if (!serverState || typeof serverState !== 'object') return [];
  const committed = (serverState as Record<string, unknown>).committed;
  if (!Array.isArray(committed)) return [];
  return committed.filter(
    (c): c is Record<string, unknown> => !!c && typeof c === 'object',
  );
}

/**
 * Memoised. The Sync Center reloads its lists after every resolution and every
 * drain; with a stable `onResolve` the cards that did not change do not
 * re-render. Theme changes still reach it — context bypasses `memo`.
 */
export const ConflictCard = React.memo(function ConflictCardView({
  conflict,
  onResolve,
}: ConflictCardProps): React.ReactElement {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const policy = policyFor(conflict.type);
  const shortfalls = shortfallsFrom(conflict.serverState);
  const committed = committedFrom(conflict.serverState);

  const run = useCallback(
    async (resolution: ConflictResolution, options?: { editedBusinessDate?: string }) => {
      setBusy(true);
      try {
        await onResolve(conflict, resolution, options);
      } catch {
        // The parent reports a refused resolution through its own error line;
        // this only guards the press handler, which cannot await.
      } finally {
        setBusy(false);
      }
    },
    [conflict, onResolve],
  );

  /**
   * Keeping the server's version closes the operator's transaction without ever
   * sending it, so it is confirmed rather than done on one tap. The copy says
   * the entry is kept, because it is — overstating the loss would push staff
   * into leaving conflicts unresolved instead.
   */
  const onKeepServer = useCallback(() => {
    Alert.alert(
      "Keep the server's version?",
      'This transaction will not be sent. Your entry stays on this device as a record, ' +
        'and the server keeps whatever it already has.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: "Keep server's", style: 'destructive', onPress: () => run('keep_server') },
      ],
    );
  }, [run]);

  const onRedate = useCallback(() => {
    const today = businessDateStr();
    Alert.alert(
      'Move to today and send?',
      `This will be recorded against business day ${today} instead of the closed day it was ` +
        'entered on, and sent as a new transaction. The original entry is kept on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move and send',
          onPress: () => run('resend_as_new', { editedBusinessDate: today }),
        },
      ],
    );
  }, [run]);

  return (
    <MBCard>
      <View style={styles.header}>
        <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>{policy.title}</Text>
        <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
          {ENTITY_LABEL[conflict.entity] ?? conflict.entity}
        </Text>
      </View>

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        Detected {dataAsOfFrom(conflict.detectedAt)}
      </Text>

      <Text style={[theme.type.body, { color: theme.colors.text, marginTop: space.tight }]}>
        {policy.explain}
      </Text>

      {/* The server's own words. Shown verbatim because they name the products
          and the quantities — a paraphrase would lose exactly what is needed. */}
      {conflict.serverMessage ? (
        <View
          style={[
            styles.quote,
            { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radius.sm },
          ]}>
          <Text style={[theme.type.caption, { color: theme.colors.text }]}>
            {conflict.serverMessage}
          </Text>
        </View>
      ) : null}

      {shortfalls.length > 0 ? (
        <View style={styles.rows}>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
            Short on the server
          </Text>
          {shortfalls.map((s, i) => (
            <Text
              key={`${String(s.productId ?? i)}`}
              style={[theme.type.caption, { color: theme.colors.text }]}>
              {String(s.productName ?? 'Item')} — asked {String(s.requested ?? '?')}, available{' '}
              {String(s.available ?? '?')}
            </Text>
          ))}
        </View>
      ) : null}

      {/* The single most important thing on this card when it applies: these
          products already moved, so a fresh send would move them twice. */}
      {committed.length > 0 ? (
        <View
          style={[
            styles.warn,
            { backgroundColor: theme.colors.warningBg, borderRadius: theme.radius.sm },
          ]}>
          <Text style={[theme.type.label, { color: theme.colors.warning }]}>
            Already recorded on the server
          </Text>
          {committed.map((c, i) => (
            <Text
              key={`${String(c.id ?? i)}`}
              style={[theme.type.caption, { color: theme.colors.text }]}>
              {String(c.productName ?? 'Item')} × {String(c.qty ?? '?')}
            </Text>
          ))}
        </View>
      ) : null}

      {policy.mayHaveLanded ? (
        <Text style={[theme.type.caption, { color: theme.colors.warning, marginTop: space.tight }]}>
          Part of this may already be on the server. Check before entering it again.
        </Text>
      ) : null}

      <Text style={[theme.type.mono, { color: theme.colors.textMuted }]} numberOfLines={1}>
        {conflict.clientOperationId}
      </Text>

      <View style={styles.actions}>
        {/* Same operation id, so the server replays rather than re-executes. */}
        {policy.resolutions.includes('retry') ? (
          <MBButton
            label="Send again"
            onPress={() => run('retry')}
            variant="secondary"
            size="sm"
            disabled={busy}
          />
        ) : null}

        {/* Re-dating is the one payload edit this card can make on its own and
            be sure of. Editing quantities to clear a stock conflict needs the
            original entry form, which is not wired here — so the button is not
            shown for those rather than shipped as a no-op that fails again. */}
        {policy.resolutions.includes('resend_as_new') &&
        conflict.type === 'business_day_closed' ? (
          <MBButton
            label="Move to today"
            onPress={onRedate}
            variant="secondary"
            size="sm"
            disabled={busy}
          />
        ) : null}

        {policy.resolutions.includes('keep_server') ? (
          <MBButton
            label="Keep server's"
            onPress={onKeepServer}
            variant="ghost"
            size="sm"
            disabled={busy}
          />
        ) : null}
      </View>
    </MBCard>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
    marginBottom: space.tight,
  },
  quote: { padding: space.sm, marginTop: space.sm },
  rows: { marginTop: space.sm, gap: 2 },
  warn: { padding: space.sm, marginTop: space.sm, gap: 2 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' },
});
