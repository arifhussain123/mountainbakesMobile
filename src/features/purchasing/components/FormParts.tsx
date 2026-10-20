import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, type IconName } from '@/shared/ui';

/**
 * The small pieces every WhatsApp Purchasing form and detail section is built
 * from, in the Production screens' own style (uppercase field labels, 44dp
 * bordered inputs, glass cards).
 */

export function FieldLabel({ children, required, style }: { children: string; required?: boolean; style?: object }) {
  const theme = useAppTheme();
  return (
    <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: theme.spacing.lg, marginBottom: 6 }, style]}>
      {children.toUpperCase()}
      {required ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
    </Text>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  const theme = useAppTheme();
  if (!message) return null;
  return (
    <Text accessibilityLiveRegion="polite" style={[theme.typography.label, { color: theme.colors.danger, marginTop: 4 }]}>
      {message}
    </Text>
  );
}

export interface InputProps extends Omit<TextInputProps, 'style'> {
  error?: string | null;
  multiline?: boolean;
  compact?: boolean;
}

/** A bordered input; red border on error. `multiline` grows to 72dp. */
export function Input({ error, multiline, compact, ...props }: InputProps) {
  const theme = useAppTheme();
  return (
    <TextInput
      placeholderTextColor={theme.colors.textFaint}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      {...props}
      style={[
        styles.input,
        compact ? styles.compact : null,
        multiline ? styles.multiline : null,
        { borderColor: error ? theme.colors.danger : theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.cardFill },
      ]}
    />
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

/** Single-select chips that wrap onto more lines (priority, payment, provider, unit). */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  disabled,
  accessibilityLabel,
}: {
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.chips} accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.colors.primary : theme.colors.cardFill,
                borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                borderRadius: theme.radii.pill,
                opacity: disabled ? 0.5 : 1,
              },
            ]}>
            <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A tappable field that opens a picker. */
export function PickerField({ label, placeholder, onPress, error, icon = 'chevron-down' }: { label: string | null; placeholder: string; onPress: () => void; error?: string | null; icon?: IconName }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? placeholder}
      onPress={onPress}
      style={[styles.picker, { borderColor: error ? theme.colors.danger : theme.colors.border, backgroundColor: theme.colors.cardFill }]}>
      <Text style={[theme.typography.body, { color: label ? theme.colors.text : theme.colors.textFaint, flex: 1 }]} numberOfLines={1}>
        {label ?? placeholder}
      </Text>
      <Icon name={icon} size={14} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

/** A titled glass card; `action` sits at the right of the title. */
export function Section({ title, subtitle, action, children }: { title: string; subtitle?: string | null; action?: ReactNode; children?: ReactNode }) {
  const theme = useAppTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.md }}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </Card>
  );
}

/** `Label ........ value` */
export function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'danger' | 'success' | 'warning' | 'primary' }) {
  const theme = useAppTheme();
  const color = tone ? theme.colors[tone] : theme.colors.text;
  return (
    <View style={styles.row}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, flexShrink: 1 }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color, fontWeight: strong ? '700' : '500', textAlign: 'right', flexShrink: 1 }]}>{value}</Text>
    </View>
  );
}

/** A compact text button for section headers and row actions. */
export function LinkButton({ label, onPress, tone = 'primary', disabled, icon }: { label: string; onPress: () => void; tone?: 'primary' | 'danger' | 'text'; disabled?: boolean; icon?: IconName }) {
  const theme = useAppTheme();
  const color = tone === 'danger' ? theme.colors.danger : tone === 'text' ? theme.colors.text : theme.colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.link, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.pill, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
      {icon ? <Icon name={icon} size={12} color={color} /> : null}
      <Text style={[theme.typography.label, { color, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

/** An info line with an icon — "waits for Finance approval", "Test mode…". */
export function Notice({ text, tone = 'info', icon = 'info' }: { text: string; tone?: 'info' | 'warning' | 'danger' | 'success'; icon?: IconName }) {
  const theme = useAppTheme();
  const color = theme.colors[tone];
  return (
    <View style={[styles.notice, { backgroundColor: `${color}1A`, borderRadius: theme.radii.md }]}>
      <Icon name={icon} size={14} color={color} />
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 },
  compact: { minHeight: 40, paddingHorizontal: 10 },
  multiline: { minHeight: 72, paddingTop: 10, paddingBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 32, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  picker: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, marginTop: 8 },
});
