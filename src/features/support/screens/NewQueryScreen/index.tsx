import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { PrimaryButton } from '@/shared/ui';
import { useNewQueryForm } from '../../hooks';
import { styles } from './styles';

export interface NewQuerySheetContentProps {
  onClose: () => void;
}

/** branchApp.md screen 25 — New Query, presented as a bottom sheet. Typed prefixes MB-/DMD-/EXP-/STK-/CT-. */
export function NewQuerySheetContent({ onClose }: NewQuerySheetContentProps) {
  const theme = useAppTheme();
  const form = useNewQueryForm();

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Query Sent', 'Your query has been sent to Admin.', [{ text: 'OK', onPress: onClose }]);
    }
  };

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>REFERENCE ID</Text>
      <View style={[styles.refRow, { marginTop: 6 }]}>
        <TextInput
          value={form.referenceId}
          onChangeText={form.setReferenceId}
          placeholder="e.g. MB-000125, DMD-000042"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="characters"
          style={[styles.refInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void form.lookup()}
          disabled={form.isLookingUp || !form.referenceId.trim()}
          style={[styles.lookupButton, { backgroundColor: theme.colors.primary, opacity: form.isLookingUp ? 0.6 : 1 }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.primaryText, fontWeight: '700' }]}>
            {form.isLookingUp ? 'Searching…' : 'Search'}
          </Text>
        </Pressable>
      </View>

      {form.lookupError ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 8 }]}>{form.lookupError}</Text> : null}

      {form.reference ? (
        <View style={[styles.referencePreview, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{form.reference.title}</Text>
          {form.reference.fields.map((field) => (
            <View key={field.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{field.label}</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{field.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>DESCRIBE THE ISSUE</Text>
      <TextInput
        value={form.message}
        onChangeText={form.setMessage}
        placeholder="What went wrong?"
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        style={[styles.messageInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
      />

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
      ) : null}

      <View style={{ marginTop: theme.spacing.lg }}>
        <PrimaryButton label="Send Query" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
      </View>
    </View>
  );
}
