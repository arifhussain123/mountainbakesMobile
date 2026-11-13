import { useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tintFill, useAppTheme } from '@/shared/theme';
import { FormBottomSheet, Icon, InfoBanner, MiniStat, Pill, PrimaryButton, SecondaryButton, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
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
  const [focused, setFocused] = useState(false);
  const typed = value.trim() !== '';
  // "Changed" when the typed figure replaces an earlier count, "New" for a first count.
  const changePill =
    !typed || locked ? null : countedValue === null ? 'new' : parseFloat(value) !== countedValue ? 'changed' : null;

  return (
    <View style={styles.field}>
      <View style={styles.between}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{CHANNEL_LABEL[channel]}</Text>
          {locked ? <Icon name="lock" size={14} color={theme.colors.textFaint} /> : null}
          <StatusBadge label={countedValue !== null ? 'Counted' : 'Not counted'} variant={countedValue !== null ? 'success' : 'neutral'} />
        </View>
        <Text style={[styles.xs, { color: theme.colors.textFaint }]}>
          {channel === 'cash' ? 'Cash on table' : 'System'}: {formatCurrency(autoValue)}
        </Text>
      </View>
      {helper ? <Text style={[styles.help, { color: theme.colors.textFaint }]}>{helper}</Text> : null}
      <View style={styles.inputRow}>
        <View
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.cardFill,
              borderColor: focused ? theme.colors.primary : theme.colors.border,
              opacity: locked ? 0.6 : 1,
            },
          ]}>
          <Text style={[styles.pre, { color: theme.colors.textFaint }]}>Rs.</Text>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={countedValue !== null ? 'Leave blank to keep' : 'Counted amount'}
            placeholderTextColor={theme.colors.textFaint}
            keyboardType="decimal-pad"
            editable={!locked}
            accessibilityLabel={`${CHANNEL_LABEL[channel]} counted amount`}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.textInput, { color: locked ? theme.colors.textFaint : theme.colors.text }]}
          />
          {changePill === 'changed' ? <Pill label="Changed" kind="berry" /> : changePill === 'new' ? <Pill label="New" kind="brand" /> : null}
        </View>
        {onCountNotes && !locked ? (
          <Pressable
            accessibilityRole="button"
            onPress={onCountNotes}
            style={[styles.notesButton, { borderColor: theme.colors.border, backgroundColor: theme.isDark ? 'transparent' : theme.colors.surface }]}>
            <Text style={[styles.notesButtonText, { color: theme.colors.text }]}>Count notes</Text>
          </Pressable>
        ) : null}
      </View>
      {diff !== null ? (
        <Text
          style={[
            styles.xs,
            { color: diff === 0 ? theme.colors.success : Math.abs(diff) >= 1000 ? theme.colors.danger : theme.colors.warning },
          ]}>
          {diff === 0 ? 'Matches the system figure' : `${formatCurrency(Math.abs(diff))} ${diff > 0 ? 'over' : 'short'}`}
        </Text>
      ) : null}
    </View>
  );
}

/** branchApp.md screen 22 — Manual Daily Sale Feed, presented as a bottom sheet (addressed by business date, not a record id). Redesign B22: a lavender date/total strip, then one "Rs." field per countable channel with its system figure on the right. */
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
      <View style={styles.stack}>
        <InfoBanner kind="warn" icon="lock">
          This day has been verified and can&apos;t be changed. Contact Admin.
        </InfoBanner>
        <SecondaryButton label="Close" onPress={onClose} />
      </View>
    );
  }

  const cashHelper = record
    ? `${formatCurrency(record.autoCash)} taken, less ${formatCurrency(record.cashExpense)} paid out of the till. Count the notes in the drawer.`
    : 'Count the notes in the drawer.';

  return (
    <View style={styles.stack}>
      <View style={[styles.tint, { backgroundColor: tintFill(theme) }]}>
        <MiniStat label="Business date" value={formatDisplayDate(businessDate)} />
        <MiniStat label="Total sale" value={record ? formatCurrency(record.autoTotalSale) : '—'} />
      </View>

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

      <Text style={[styles.help, { color: theme.colors.textFaint }]}>
        Leave a field blank to leave that figure as it is. Foodpanda is settled by the aggregator and isn&apos;t counted here.
      </Text>

      {form.submitError ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger }]}>{form.submitError}</Text> : null}

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
