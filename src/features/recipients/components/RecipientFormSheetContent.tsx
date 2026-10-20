import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import {
  useCreateRecipient,
  useDeleteRecipient,
  useUpdateRecipient,
  type BranchSummary,
  type NotificationRecipient,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Checkbox, Dropdown, PrimaryButton, SecondaryButton, TextField } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatPkMobile, normalisePkMobile } from '../utils/phone';
import {
  RECEIVES_LABEL,
  channelFlags,
  channelFrom,
  departmentFor,
  findDuplicate,
  receivesOf,
  type Receives,
} from '../utils/recipientRules';

export interface RecipientFormSheetContentProps {
  /** Absent = add. */
  recipient?: NotificationRecipient;
  recipients: NotificationRecipient[];
  branches: BranchSummary[];
  activeBranchCount: number;
  onClose: () => void;
}

const RECEIVES_ORDER: Receives[] = ['branch', 'company', 'production'];

/**
 * Add or edit one recipient. What a recipient receives (its branch or
 * department) is fixed once saved — the server's update ignores it — so on
 * edit it is shown, not offered.
 */
export function RecipientFormSheetContent({ recipient, recipients, branches, activeBranchCount, onClose }: RecipientFormSheetContentProps) {
  const theme = useAppTheme();
  const editing = !!recipient;
  const create = useCreateRecipient();
  const update = useUpdateRecipient();
  const remove = useDeleteRecipient();

  const [receives, setReceives] = useState<Receives>(recipient ? receivesOf(recipient) : 'branch');
  const [branchId, setBranchId] = useState<string | null>(recipient?.branchId ?? null);
  const [name, setName] = useState(recipient?.recipientName ?? '');
  const [phone, setPhone] = useState(recipient ? formatPkMobile(recipient.mobileNumber) : '');
  const [flags, setFlags] = useState(channelFlags(recipient?.channel ?? 'whatsapp'));
  const [active, setActive] = useState(recipient?.active ?? true);
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const phoneResult = normalisePkMobile(phone);
  const channel = channelFrom(flags);
  const department = departmentFor(receives);
  const scopeBranchId = receives === 'branch' ? branchId : null;
  const duplicate = useMemo(
    () =>
      phoneResult.ok && (receives !== 'branch' || branchId)
        ? findDuplicate(recipients, { mobileNumber: phoneResult.e164, branchId: scopeBranchId, department }, recipient?.id)
        : null,
    [phoneResult, receives, branchId, recipients, scopeBranchId, department, recipient],
  );

  const errors = {
    branch: receives === 'branch' && !branchId ? 'Pick the branch whose summary they get.' : undefined,
    name: name.trim().length < 2 ? 'Enter their name.' : undefined,
    phone: phoneResult.ok ? undefined : phoneResult.error,
    channel: channel ? undefined : 'Tick SMS, WhatsApp or both.',
  };
  const valid = !errors.branch && !errors.name && !errors.phone && !errors.channel && !duplicate;
  const busy = create.isPending || update.isPending || remove.isPending;

  const branchOptions = branches.filter((b) => b.isActive !== false).map((b) => ({ value: b.id, label: b.name }));

  const handleSave = () => {
    setShowErrors(true);
    setSubmitError(null);
    if (!valid || !phoneResult.ok || !channel || busy) return;
    const onError = (e: unknown) => setSubmitError(mapErrorToMessage(e));
    if (recipient) {
      update.mutate(
        { id: recipient.id, input: { recipientName: name.trim(), mobileNumber: phoneResult.e164, channel, active } },
        { onSuccess: onClose, onError },
      );
    } else {
      create.mutate(
        { branchId: scopeBranchId, department, recipientName: name.trim(), mobileNumber: phoneResult.e164, channel, active },
        { onSuccess: onClose, onError },
      );
    }
  };

  const handleDelete = () => {
    if (!recipient) return;
    Alert.alert(
      'Delete Recipient',
      `Delete ${recipient.recipientName}? Their past deliveries stay in the log. To stop messages for now, turn them off instead.`,
      [
        { text: 'Keep', style: 'cancel' },
        ...(recipient.active
          ? [{ text: 'Turn Off', onPress: () => update.mutate({ id: recipient.id, input: { active: false } }, { onSuccess: onClose }) }]
          : []),
        {
          text: 'Delete',
          style: 'destructive' as const,
          onPress: () => remove.mutate(recipient.id, { onSuccess: onClose, onError: (e) => setSubmitError(mapErrorToMessage(e)) }),
        },
      ],
    );
  };

  const label = (text: string) => (
    <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md, marginBottom: 6 }]}>{text}</Text>
  );

  return (
    <View>
      {label('RECEIVES')}
      {editing ? (
        <Text style={[theme.typography.body, { color: theme.colors.text }]}>
          {receives === 'branch' ? recipient!.branchName ?? 'A branch' : RECEIVES_LABEL[receives]}
          <Text style={{ color: theme.colors.textSecondary }}>{'\n'}Fixed once saved. To change it, add a new recipient and delete this one.</Text>
        </Text>
      ) : (
        <View style={styles.segment}>
          {RECEIVES_ORDER.map((r) => {
            const on = r === receives;
            return (
              <Pressable
                key={r}
                onPress={() => setReceives(r)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={[styles.option, { borderColor: on ? theme.colors.primary : theme.colors.cardBorder, backgroundColor: on ? `${theme.colors.primary}1A` : theme.colors.cardFill }]}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: on ? '700' : '500' }]}>{RECEIVES_LABEL[r]}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {!editing && receives === 'company' ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
          Gets every branch's summary, the production summary and the company summary: {activeBranchCount + 2} messages a night per channel.
        </Text>
      ) : null}
      {!editing && receives === 'branch' ? (
        <View style={{ marginTop: 8 }}>
          <Dropdown options={branchOptions} value={branchId} onChange={setBranchId} placeholder="Pick a branch…" />
          {showErrors && errors.branch ? <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: 4 }]}>{errors.branch}</Text> : null}
        </View>
      ) : null}

      <View style={{ marginTop: theme.spacing.md }}>
        <TextField label="Name" required value={name} onChangeText={setName} placeholder="e.g. Mohsin Abbas" error={showErrors ? errors.name : undefined} />
      </View>
      <View style={{ marginTop: theme.spacing.md }}>
        <TextField
          label="Mobile number"
          required
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="0300 1234567"
          error={showErrors || phone.length >= 11 ? errors.phone : undefined}
        />
        {phoneResult.ok ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>Saved as {formatPkMobile(phoneResult.e164)}</Text>
        ) : null}
        {duplicate ? (
          <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: 4 }]}>
            This number already receives this summary ({duplicate.recipientName}{duplicate.active ? '' : ', turned off'}). Edit that one instead.
          </Text>
        ) : null}
      </View>

      {label('CHANNELS')}
      <View style={styles.channels}>
        {(['sms', 'whatsapp'] as const).map((c) => (
          <Pressable key={c} style={styles.check} onPress={() => setFlags((f) => ({ ...f, [c]: !f[c] }))} accessibilityRole="checkbox" accessibilityState={{ checked: flags[c] }}>
            <Checkbox checked={flags[c]} onChange={(v) => setFlags((f) => ({ ...f, [c]: v }))} accessibilityLabel={c === 'sms' ? 'SMS' : 'WhatsApp'} />
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>{c === 'sms' ? 'SMS' : 'WhatsApp'}</Text>
          </Pressable>
        ))}
      </View>
      {showErrors && errors.channel ? <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: 4 }]}>{errors.channel}</Text> : null}

      <View style={[styles.activeRow, { marginTop: theme.spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text }]}>Active</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>Inactive numbers are skipped at 2:00 AM</Text>
        </View>
        <Switch value={active} onValueChange={setActive} accessibilityLabel="Active" trackColor={{ true: theme.colors.primary, false: theme.colors.cardBorder }} />
      </View>

      {submitError ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{submitError}</Text> : null}

      <View style={{ marginTop: theme.spacing.xl, gap: 10 }}>
        <PrimaryButton label={editing ? 'Save Changes' : 'Add Recipient'} onPress={handleSave} loading={create.isPending || update.isPending} />
        {editing ? <SecondaryButton label="Delete…" onPress={handleDelete} loading={remove.isPending} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { gap: 6 },
  option: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  channels: { flexDirection: 'row', gap: 20 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  activeRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
});
