import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Checkbox, Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';

/**
 * The small pieces every Support Center form shares — Cancel + the action,
 * a hint line, the amber / red notice boxes, a compact labelled number box
 * and a confirmation tick. Kept apart so the ops and finance sheets read the
 * same.
 */

export function SheetButtons({
  busy,
  label,
  onCancel,
  onSave,
  disabled,
  cancelLabel = 'Cancel',
}: {
  busy: boolean;
  label: string;
  onCancel: () => void;
  onSave: () => void;
  disabled?: boolean;
  cancelLabel?: string;
}) {
  return (
    <View style={styles.buttons}>
      <View style={{ flex: 1 }}>
        <SecondaryButton label={cancelLabel} onPress={onCancel} disabled={busy} />
      </View>
      <View style={{ flex: 1.4 }}>
        <PrimaryButton label={label} onPress={onSave} loading={busy} disabled={disabled} />
      </View>
    </View>
  );
}

export function Hint({ children, tone }: { children: ReactNode; tone?: 'danger' | 'warning' | 'success' }) {
  const theme = useAppTheme();
  const color = tone === 'danger' ? theme.colors.danger : tone === 'warning' ? theme.colors.warning : tone === 'success' ? theme.colors.success : theme.colors.textSecondary;
  return <Text style={[theme.typography.label, { color, marginTop: 6 }]}>{children}</Text>;
}

/** The web's amber (warning) / red (destructive) / muted callout. */
export function Notice({ children, tone = 'warning' }: { children: ReactNode; tone?: 'warning' | 'danger' | 'muted' }) {
  const theme = useAppTheme();
  const color = tone === 'danger' ? theme.colors.danger : tone === 'warning' ? theme.colors.warning : theme.colors.textSecondary;
  return (
    <View style={[styles.notice, { borderColor: `${color}66`, backgroundColor: `${color}14`, borderRadius: theme.radii.md }]}>
      {tone !== 'muted' ? <Icon name="warning" size={14} color={color} /> : null}
      <Text style={[theme.typography.label, { color: tone === 'muted' ? theme.colors.textSecondary : color, flex: 1 }]}>{children}</Text>
    </View>
  );
}

/** A labelled compact input — for the figure editors, where a full TextField per number is too tall. */
export function NumBox({
  label,
  value,
  onChangeText,
  hint,
  editable = true,
  error,
  keyboardType = 'decimal-pad',
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  hint?: string;
  editable?: boolean;
  error?: boolean;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ marginTop: 10 }}>
      <View style={styles.numHead}>
        <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{label}</Text>
        {hint ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flexShrink: 1, textAlign: 'right' }]} numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            borderColor: error ? theme.colors.danger : theme.colors.border,
            color: editable ? theme.colors.text : theme.colors.textSecondary,
            backgroundColor: editable ? theme.colors.surface : theme.colors.cardFill,
            borderRadius: theme.radii.md,
          },
        ]}
      />
    </View>
  );
}

/** "I confirm …" — a tick the destructive button waits for. */
export function ConfirmTick({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={() => onChange(!checked)} style={styles.tick} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <Checkbox checked={checked} onChange={onChange} accessibilityLabel={label} />
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

/** Two-up row for the line editors' number boxes. */
export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export const formStyles = StyleSheet.create({
  box: { borderWidth: 1, padding: 12, marginTop: 10 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1, padding: 10, marginTop: 10 },
  numHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  input: { height: 44, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, marginTop: 6, textAlign: 'right' },
  tick: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  row: { flexDirection: 'row', gap: 10 },
});
