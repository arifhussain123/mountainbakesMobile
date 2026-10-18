import { useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, Icon, PrimaryButton, SecondaryButton, StatusBadge } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { useManualFeedForm, type ManualFeedChannel } from '../../hooks';
import { NoteCounter } from '../../components';
import { styles } from './styles';
import type { DailySaleRecord, PaymentMethodLock } from '@/api';

export interface ManualFeedSheetContentProps {
  businessDate: string;
  record: DailySaleRecord | null;
  locks: PaymentMethodLock[];
  onClose: () => void;
}

const CHANNEL_LABEL: Record<ManualFeedChannel, string> = { cash: 'Cash', easypaisa: 'Easypaisa', bank: 'Bank account' };

function ChannelField({
  channel,
  value,
  onChangeText,
  autoValue,
  countedValue,
  locked,
  diff,
  helper,
  onCountNotes,
}: {
  channel: ManualFeedChannel;
  value: string;
  onChangeText: (v: string) => void;
  autoValue: number;
  countedValue: number | null;
  locked: boolean;
  diff: number | null;
  helper?: string;
  onCountNotes?: () => void;
}) {
  const theme = useAppTheme();

  return (
    <View style={[styles.fieldCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{CHANNEL_LABEL[channel]}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {locked ? <Icon name="lock" size={14} color={theme.colors.textFaint} /> : null}
          <StatusBadge label={countedValue !== null ? 'Counted' : 'Not counted'} variant={countedValue !== null ? 'success' : 'neutral'} />
        </View>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
        {channel === 'cash' ? 'Cash on table' : 'System'} {formatCurrency(autoValue)}
      </Text>
      {helper ? <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 2 }]}>{helper}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Counted amount"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
          editable={!locked}
          style={[
            styles.amountInput,
            { flex: 1, borderColor: theme.colors.border, color: locked ? theme.colors.textFaint : theme.colors.text, opacity: locked ? 0.6 : 1 },
          ]}
        />
        {onCountNotes && !locked ? (
          <Pressable
            accessibilityRole="button"
            onPress={onCountNotes}
            style={{
              height: 44,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Count notes</Text>
          </Pressable>
        ) : null}
      </View>
      {diff !== null ? (
        <Text
          style={[
            theme.typography.label,
            { marginTop: 6, color: diff === 0 ? theme.colors.success : Math.abs(diff) >= 1000 ? theme.colors.danger : theme.colors.warning },
          ]}>
          {diff === 0 ? 'Matches the system figure' : `${formatCurrency(Math.abs(diff))} ${diff > 0 ? 'over' : 'short'}`}
        </Text>
      ) : null}
    </View>
  );
}

/** branchApp.md screen 22 — Manual Daily Sale Feed, presented as a bottom sheet (addressed by business date, not a record id). */
export function ManualFeedSheetContent({ businessDate, record, locks, onClose }: ManualFeedSheetContentProps) {
  const theme = useAppTheme();
  const form = useManualFeedForm(businessDate, record, locks);
  const [confirmingLargeDiff, setConfirmingLargeDiff] = useState(false);
  const noteCounterRef = useRef<BottomSheetModal>(null);
  const [noteCounterOpen, setNoteCounterOpen] = useState(false);

  const doSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Saved', 'The counted figures have been recorded.', [{ text: 'OK', onPress: onClose }]);
    }
  };

  const handleSubmit = () => {
    if (form.hasLargeDifference && !confirmingLargeDiff) {
      setConfirmingLargeDiff(true);
      Alert.alert(
        'Large difference',
        'One of these counts is far from the system figure. Double-check it before saving — this is just a nudge, not a block.',
        [
          { text: 'Let me recheck', style: 'cancel', onPress: () => setConfirmingLargeDiff(false) },
          { text: 'Save anyway', onPress: () => void doSubmit() },
        ],
      );
      return;
    }
    void doSubmit();
  };

  if (form.recordLocked) {
    return (
      <View>
        <View style={[styles.fieldCard, { borderColor: theme.colors.warning, backgroundColor: `${theme.colors.warning}17` }]}>
          <Text style={[theme.typography.body, { color: theme.colors.text }]}>
            This day has been verified and can't be changed. Contact Admin.
          </Text>
        </View>
        <View style={styles.actionsRow}>
          <SecondaryButton label="Close" onPress={onClose} />
        </View>
      </View>
    );
  }

  const cashHelper = record
    ? `${formatCurrency(record.autoCash)} taken, less ${formatCurrency(record.cashExpense)} paid out of the till. Count the notes in the drawer.`
    : 'Count the notes in the drawer.';

  return (
    <View>
      <ChannelField
        channel="cash"
        value={form.inputs.cash}
        onChangeText={(v) => form.setInput('cash', v)}
        autoValue={form.autoValues.cash}
        countedValue={form.countedValues.cash}
        locked={form.isChannelLocked('cash')}
        diff={form.liveDifference('cash')}
        helper={cashHelper}
        onCountNotes={() => {
          setNoteCounterOpen(true);
          noteCounterRef.current?.present();
        }}
      />
      <ChannelField
        channel="easypaisa"
        value={form.inputs.easypaisa}
        onChangeText={(v) => form.setInput('easypaisa', v)}
        autoValue={form.autoValues.easypaisa}
        countedValue={form.countedValues.easypaisa}
        locked={form.isChannelLocked('easypaisa')}
        diff={form.liveDifference('easypaisa')}
      />
      <ChannelField
        channel="bank"
        value={form.inputs.bank}
        onChangeText={(v) => form.setInput('bank', v)}
        autoValue={form.autoValues.bank}
        countedValue={form.countedValues.bank}
        locked={form.isChannelLocked('bank')}
        diff={form.liveDifference('bank')}
      />

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
        Leave a field blank to leave that figure as it is. Foodpanda is settled by the aggregator and isn't counted here.
      </Text>

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
      ) : null}

      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onClose} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton label="Save" onPress={handleSubmit} loading={form.isSubmitting} disabled={!form.canSubmit} />
        </View>
      </View>

      <FormBottomSheet
        ref={noteCounterRef}
        title="Count Notes"
        subtitle="Cash"
        snapPoints={['70%']}
        onRequestClose={() => noteCounterRef.current?.dismiss()}
        onDismiss={() => setNoteCounterOpen(false)}>
        {noteCounterOpen ? (
          <NoteCounter
            onUseTotal={(total) => {
              form.setInput('cash', String(total));
              noteCounterRef.current?.dismiss();
            }}
            onClose={() => noteCounterRef.current?.dismiss()}
          />
        ) : null}
      </FormBottomSheet>
    </View>
  );
}
