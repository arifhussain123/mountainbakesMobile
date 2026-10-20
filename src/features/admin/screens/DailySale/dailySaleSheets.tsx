import { useRef, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  useAmendDailySaleRecord,
  useDailySaleLocks,
  useFeedDailySaleRecord,
  useSetPaymentMethodLock,
  useUnlockDailySaleRecord,
  type DailySaleAmendField,
  type DailySaleRecord,
  type PaymentMethodLock,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, FormBottomSheet, Icon, LoadingSkeleton, PrimaryButton, SecondaryButton, TextField } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import {
  AMEND_FIELDS,
  AMEND_FIELD_LABEL,
  EXPECTED_LABEL,
  MANUAL_METHODS,
  MANUAL_METHOD_LABEL,
  amendPayload,
  currentAmendValue,
  expectedOf,
  feedPayload,
  initialFeedValues,
  liveDifference,
  unlockReasonProblem,
  type ManualMethod,
} from '../../utils/dailySaleActions';
import { DifferenceBadge, PAYMENT_METHOD_LABELS, displayDate, money, orDash } from './dailySaleBits';

function RecordHead({ record, withTotal }: { record: DailySaleRecord; withTotal?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.head, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{record.branchName || 'Branch'}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        Business date {displayDate(record.businessDate)}
        {withTotal ? ` · Total sale ${money(record.autoTotalSale)}` : ''}
      </Text>
    </View>
  );
}

function Buttons({ busy, label, onCancel, onSave }: { busy: boolean; label: string; onCancel: () => void; onSave: () => void }) {
  return (
    <View style={styles.buttons}>
      <View style={{ flex: 1 }}>
        <SecondaryButton label="Cancel" onPress={onCancel} disabled={busy} />
      </View>
      <View style={{ flex: 1.4 }}>
        <PrimaryButton label={label} onPress={onSave} loading={busy} />
      </View>
    </View>
  );
}

/**
 * Web `ManualFeedDialog` with `isAdmin`: what was physically counted, beside
 * what the system took, with the difference live as it is typed. The locks are
 * fetched for THIS record's branch. A locked method stays open to an admin
 * with a warning — the server records that entry as an override.
 */
function ManualFeedForm({ record, onClose }: { record: DailySaleRecord; onClose: () => void }) {
  const theme = useAppTheme();
  const feed = useFeedDailySaleRecord();
  const locksQ = useDailySaleLocks(record.branchId);
  const [values, setValues] = useState(() => initialFeedValues(record));
  const lockOf = new Map((locksQ.data?.locks ?? []).map((l) => [l.paymentMethod as string, l]));

  const save = () => {
    const built = feedPayload(values, record.businessDate, record.branchId);
    if ('error' in built) {
      Alert.alert('Check the Amounts', built.error);
      return;
    }
    feed.mutate(built.input, {
      onSuccess: () => {
        Alert.alert('Saved', 'Counted amounts recorded.');
        onClose();
      },
      onError: (e) => Alert.alert('Could Not Record the Count', mapErrorToMessage(e)),
    });
  };

  return (
    <View>
      <RecordHead record={record} withTotal />
      {MANUAL_METHODS.map((method: ManualMethod) => {
        const lock = lockOf.get(method);
        const locked = lock?.isLocked ?? false;
        const expected = expectedOf(record, method);
        return (
          <View key={method} style={[styles.field, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
            <View style={styles.fieldHead}>
              <View style={styles.inline}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{MANUAL_METHOD_LABEL[method]}</Text>
                <Icon name="lock" size={13} color={locked ? theme.colors.textSecondary : theme.colors.success} />
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                {EXPECTED_LABEL[method]}: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{money(expected)}</Text>
              </Text>
            </View>
            <View style={[styles.inline, { marginTop: 8 }]}>
              <TextInput
                value={values[method]}
                onChangeText={(v) => setValues((p) => ({ ...p, [method]: v }))}
                placeholder="Counted amount"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radii.md }]}
              />
              <DifferenceBadge difference={liveDifference(expected, values[method])} />
            </View>
            {locked ? (
              <View style={[styles.inline, { marginTop: 6, alignItems: 'flex-start' }]}>
                <Icon name="warning" size={13} color={theme.colors.warning} />
                <Text style={[theme.typography.label, { color: theme.colors.warning, flex: 1 }]}>
                  This method is locked. Your entry will be recorded as an admin override.
                </Text>
              </View>
            ) : null}
            {method === 'cash' && record.cashExpense > 0 ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
                {money(record.autoCash)} taken, less {money(record.cashExpense)} paid out of the till. Count the notes in the drawer.
              </Text>
            ) : null}
          </View>
        );
      })}
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 10 }]}>
        Leave a field blank to leave that figure as it is. Foodpanda is settled by the aggregator and is not counted here.
      </Text>
      <Buttons busy={feed.isPending} label="Save" onCancel={onClose} onSave={save} />
    </View>
  );
}

/** Web `AmendDialog`: correct one counted figure on a closed record; the original stays in the history. */
function AmendForm({ record, onClose }: { record: DailySaleRecord; onClose: () => void }) {
  const theme = useAppTheme();
  const amend = useAmendDailySaleRecord();
  const [field, setField] = useState<DailySaleAmendField>('manual_cash');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const current = currentAmendValue(record, field);

  const save = () => {
    if (!record.id) return;
    const built = amendPayload(amount, reason);
    if ('error' in built) {
      Alert.alert('Check the Amendment', built.error);
      return;
    }
    amend.mutate(
      { id: record.id, input: { field, amount: built.amount, reason: built.reason } },
      {
        onSuccess: () => {
          Alert.alert('Amended', 'Figure amended — the original is kept in the history.');
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Amend the Record', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <RecordHead record={record} />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 16, marginBottom: 6 }]}>FIGURE TO AMEND</Text>
      <Dropdown options={AMEND_FIELDS.map((f) => ({ value: f, label: AMEND_FIELD_LABEL[f] }))} value={field} onChange={setField} />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>Current value: {orDash(current, money)}</Text>
      <TextField label="Corrected amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
      <TextField
        label="Reason"
        value={reason}
        onChangeText={setReason}
        multiline
        placeholder="e.g. Cash counting correction — Rs. 500 note found under the tray"
      />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
        Recorded in the history with the original figure, your name and the time. No sale is changed by an amendment.
      </Text>
      <Buttons busy={amend.isPending} label="Save Amendment" onCancel={onClose} onSave={save} />
    </View>
  );
}

/** Web `UnlockDialog`: back to Pending Verification, sign-off cleared, reason recorded. */
function UnlockForm({ record, onClose }: { record: DailySaleRecord; onClose: () => void }) {
  const theme = useAppTheme();
  const unlock = useUnlockDailySaleRecord();
  const [reason, setReason] = useState('');

  const save = () => {
    if (!record.id) return;
    const problem = unlockReasonProblem(reason);
    if (problem) {
      Alert.alert('Reason Needed', problem);
      return;
    }
    unlock.mutate(
      { id: record.id, reason: reason.trim() },
      {
        onSuccess: () => {
          Alert.alert('Unlocked', 'Record unlocked — the branch can enter figures again.');
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Unlock the Record', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <RecordHead record={record} />
      <TextField label="Reason" value={reason} onChangeText={setReason} multiline placeholder="e.g. Physical cash verification required" />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
        The record goes back to Pending Verification and the existing sign-off is cleared. This is recorded in the history with your name.
      </Text>
      <Buttons busy={unlock.isPending} label="Unlock" onCancel={onClose} onSave={save} />
    </View>
  );
}

function lockStamp(lock: PaymentMethodLock): string {
  if (lock.source === 'default') return 'On the default — nobody has configured this branch';
  const at = lock.updatedAt ? ` · ${formatDisplayDate(lock.updatedAt.slice(0, 10))} ${formatDisplayTime(lock.updatedAt)}` : '';
  return `Set by ${lock.updatedByName || 'an admin'}${at}`;
}

/**
 * Web `PaymentLockPanel`: which payment methods one branch may enter a counted
 * amount for. Each switch saves immediately (switch ON = the branch MAY enter),
 * so the optional reason sits above them.
 */
function LocksPanel({ branchId, branchName, onClose }: { branchId: string | null; branchName: string | null; onClose: () => void }) {
  const theme = useAppTheme();
  const locksQ = useDailySaleLocks(branchId);
  const setLock = useSetPaymentMethodLock();
  const [reason, setReason] = useState('');

  const toggle = (lock: PaymentMethodLock, nextLocked: boolean) => {
    if (!branchId) return;
    setLock.mutate(
      {
        branchId,
        paymentMethod: lock.paymentMethod as 'cash' | 'easypaisa' | 'foodpanda' | 'bank_account',
        isLocked: nextLocked,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      },
      { onError: (e) => Alert.alert('Could Not Change the Lock', mapErrorToMessage(e)) },
    );
  };

  if (!branchId) {
    return (
      <View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          Pick a single branch first. A lock governs one shop's till, so there is no configuration to show for “all branches”.
        </Text>
        <View style={styles.buttons}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Done" onPress={onClose} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        {branchName} — which payment methods this branch may enter a counted amount for.
      </Text>
      <TextField label="Reason (optional, recorded with the change)" value={reason} onChangeText={setReason} placeholder="e.g. Physical cash verification required" />
      <View style={[styles.lockList, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        {locksQ.isLoading ? <LoadingSkeleton height={120} /> : null}
        {(locksQ.data?.locks ?? []).map((lock, i) => {
          const counted = (MANUAL_METHODS as readonly string[]).includes(lock.paymentMethod);
          return (
            <View key={lock.paymentMethod} style={[styles.lockRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.inline}>
                  <Icon name="lock" size={13} color={lock.isLocked ? theme.colors.textSecondary : theme.colors.success} />
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
                    {PAYMENT_METHOD_LABELS[lock.paymentMethod] ?? lock.paymentMethod}
                  </Text>
                  {!counted ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>· not counted at the shop</Text> : null}
                </View>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                  {lockStamp(lock)}
                  {lock.reason ? ` · ${lock.reason}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{lock.isLocked ? 'Locked' : 'Unlocked'}</Text>
                <Switch
                  value={!lock.isLocked}
                  disabled={setLock.isPending}
                  onValueChange={(next) => toggle(lock, !next)}
                  accessibilityLabel={`${PAYMENT_METHOD_LABELS[lock.paymentMethod] ?? lock.paymentMethod} may be entered`}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.cardBorder }}
                />
              </View>
            </View>
          );
        })}
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 10 }]}>
        Locking is enforced by the server, not by this screen: a locked method is refused inside the same transaction that would have written the figure.
        An admin can still enter one, and it is recorded as an override.
      </Text>
      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Done" onPress={onClose} />
        </View>
      </View>
    </View>
  );
}

export type DailySaleSheet =
  | { kind: 'feed'; record: DailySaleRecord }
  | { kind: 'amend'; record: DailySaleRecord }
  | { kind: 'unlock'; record: DailySaleRecord }
  | { kind: 'locks'; branchId: string | null; branchName: string | null };

const TITLE: Record<DailySaleSheet['kind'], string> = {
  feed: 'Manual Daily Sale Feed',
  amend: 'Amend Daily Sale Record',
  unlock: 'Unlock Daily Sale Record',
  locks: 'Manual Entry Locks',
};

/**
 * One bottom sheet for every Daily Sale admin form. `open(sheet)` presents it;
 * the form is mounted only while it is open, so each opening starts clean.
 */
export function useDailySaleSheet() {
  const ref = useRef<BottomSheetModal>(null);
  const [sheet, setSheet] = useState<DailySaleSheet | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (next: DailySaleSheet) => {
    setSheet(next);
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet
      ref={ref}
      title={sheet ? TITLE[sheet.kind] : ''}
      subtitle={sheet && sheet.kind !== 'locks' ? formatDisplayDate(sheet.record.businessDate) : undefined}
      onRequestClose={close}
      onDismiss={() => setSheet(null)}>
      {sheet?.kind === 'feed' ? <ManualFeedForm record={sheet.record} onClose={close} /> : null}
      {sheet?.kind === 'amend' ? <AmendForm record={sheet.record} onClose={close} /> : null}
      {sheet?.kind === 'unlock' ? <UnlockForm record={sheet.record} onClose={close} /> : null}
      {sheet?.kind === 'locks' ? <LocksPanel branchId={sheet.branchId} branchName={sheet.branchName} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  head: { borderWidth: 1, padding: 12 },
  field: { borderWidth: 1, padding: 12, marginTop: 10 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { flex: 1, height: 44, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
  lockList: { borderWidth: 1, marginTop: 14, paddingHorizontal: 12 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
});
