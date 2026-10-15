import { Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { PrimaryButton } from '@/shared/ui';
import { useAddEmployeeForm } from '../../hooks/useAddEmployeeForm';
import { styles } from './styles';

export interface AddEmployeeSheetContentProps {
  onClose: () => void;
  onCreated: () => void;
}

/** mountainbakesFinance.html screen 09 — Add Employee. baseSalary is only settable here, at creation — afterwards only a Salary Revision can change it. */
export function AddEmployeeSheetContent({ onClose, onCreated }: AddEmployeeSheetContentProps) {
  const theme = useAppTheme();
  const form = useAddEmployeeForm();

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      onCreated();
      onClose();
    }
  };

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>NAME</Text>
      <TextInput
        value={form.name}
        onChangeText={form.setName}
        placeholder="Full name"
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>DEPARTMENT</Text>
          <TextInput
            value={form.department}
            onChangeText={form.setDepartment}
            placeholder="e.g. Production"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>DESIGNATION</Text>
          <TextInput
            value={form.designation}
            onChangeText={form.setDesignation}
            placeholder="e.g. Baker"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>BASE SALARY</Text>
          <TextInput
            value={form.baseSalaryInput}
            onChangeText={form.setBaseSalaryInput}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PHONE (OPTIONAL)</Text>
          <TextInput
            value={form.phone}
            onChangeText={form.setPhone}
            keyboardType="phone-pad"
            placeholder="03xx xxxxxxx"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
      </View>

      {form.submitError ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text> : null}

      <View style={{ marginTop: theme.spacing.xl }}>
        <PrimaryButton label="Add Employee" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
      </View>
    </View>
  );
}
