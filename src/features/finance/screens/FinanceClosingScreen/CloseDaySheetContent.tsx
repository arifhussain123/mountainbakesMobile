import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { PrimaryButton, SecondaryButton, TextField } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { ChecklistItem } from '../../utils/closingChecklist';

/**
 * The irreversible step. Every amber checklist line is repeated here, so the
 * closer confirms with them in view, and the date has to be typed out — a tap
 * on the wrong day's card cannot close it. Device re-auth runs after this, in
 * the parent, so the system prompt is the last thing before the request.
 */
export function CloseDaySheetContent({
  date,
  checklist,
  closing,
  onConfirm,
  onCancel,
}: {
  date: string;
  checklist: ChecklistItem[];
  closing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useAppTheme();
  const [typed, setTyped] = useState('');
  const amber = checklist.filter((i) => i.state === 'attention');
  const matches = typed.trim() === date;

  return (
    <View>
      <Text style={[theme.typography.body, { color: theme.colors.text }]}>
        Closing locks {formatDisplayDate(date)}. Nothing can be posted into it afterwards, and it cannot be reopened from the app. A correction goes onto an open day as an adjustment.
      </Text>

      {amber.length > 0 ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.label, { color: theme.colors.warning }]}>STILL NEEDS ATTENTION</Text>
          {amber.map((i) => (
            <Text key={i.key} style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 4 }]}>
              • {i.label}. {i.hint}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.success, marginTop: theme.spacing.md }]}>Every check is clear.</Text>
      )}

      <View style={{ marginTop: theme.spacing.lg }}>
        <TextField
          label={`Type ${date} to confirm`}
          value={typed}
          onChangeText={setTyped}
          placeholder={date}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          error={typed.length >= date.length && !matches ? 'That is not the date being closed.' : undefined}
        />
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
        Your fingerprint, face or phone passcode is asked for next.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.lg }}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Close this day" onPress={onConfirm} disabled={!matches} loading={closing} />
        </View>
      </View>
    </View>
  );
}
