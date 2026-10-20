import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';
import { reasonError } from '../utils/moneyForms';
import { FieldError, FieldLabel, Input, Notice } from './FormParts';

export interface FormModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** The footer's main button. */
  submitLabel: string;
  onSubmit: () => void;
  submitting?: boolean;
  /** Looks disabled but still takes the press, to point at what is missing. */
  submitInactive?: boolean;
  /** Error from the last attempt, shown above the footer. */
  error?: string | null;
}

/**
 * A full-screen form over the current screen: header with close, a scroll
 * view that stays clear of the keyboard, and one main action in the footer.
 * While a submission is in flight the close button and back gesture do
 * nothing, so the person sees how it ended.
 */
export function FormModal({ visible, title, subtitle, onClose, children, submitLabel, onSubmit, submitting, submitInactive, error }: FormModalProps) {
  const theme = useAppTheme();
  const close = () => {
    if (!submitting) onClose();
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: theme.spacing.lg, gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{subtitle}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={10} disabled={submitting}>
            <Icon name="close" color={theme.colors.text} />
          </Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, padding: theme.spacing.lg, backgroundColor: theme.colors.surface }}>
            {error ? (
              <Text accessibilityLiveRegion="polite" style={[theme.typography.bodySmall, { color: theme.colors.danger, marginBottom: 10 }]}>
                {error}
              </Text>
            ) : null}
            <PrimaryButton label={submitLabel} onPress={onSubmit} loading={submitting} inactive={submitInactive} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export interface ReasonModalProps {
  visible: boolean;
  title: string;
  /** What this does, in a sentence, above the field. */
  message?: string;
  label?: string;
  placeholder?: string;
  confirmLabel: string;
  /** 3 for a reason (the API's ReasonSchema), 1 for a note. */
  minLength?: number;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

/**
 * Asks for the reason an irreversible step needs (cancel, reject, request
 * changes, reverse). Android has no `Alert.prompt`, so this is the one prompt.
 */
export function ReasonModal({ visible, title, message, label = 'Reason', placeholder, confirmLabel, minLength = 3, submitting, error, onClose, onSubmit }: ReasonModalProps) {
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (visible) {
      setText('');
      setTouched(false);
    }
  }, [visible]);
  const fieldError = reasonError(text, minLength);
  return (
    <FormModal
      visible={visible}
      title={title}
      onClose={onClose}
      submitLabel={confirmLabel}
      submitting={submitting}
      submitInactive={!!fieldError}
      error={error}
      onSubmit={() => {
        setTouched(true);
        if (!fieldError) onSubmit(text.trim());
      }}>
      {message ? <Notice text={message} tone="warning" icon="warning" /> : null}
      <FieldLabel required>{label}</FieldLabel>
      <Input value={text} onChangeText={setText} placeholder={placeholder} multiline maxLength={1000} autoFocus error={touched ? fieldError : null} />
      <FieldError message={touched ? fieldError : null} />
    </FormModal>
  );
}

/** Two buttons side by side. */
export function ButtonPair({ left, right }: { left: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }; right: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean } }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
      <View style={{ flex: 1 }}>
        <SecondaryButton label={left.label} onPress={left.onPress} loading={left.loading} disabled={left.disabled} />
      </View>
      <View style={{ flex: 1 }}>
        <PrimaryButton label={right.label} onPress={right.onPress} loading={right.loading} disabled={right.disabled} />
      </View>
    </View>
  );
}
