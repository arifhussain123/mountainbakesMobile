import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEmployees, type FinanceEmployee } from '@/api';
import { useAppTheme } from '@/shared/theme';

const styles = StyleSheet.create({
  staticField: { height: 46, borderWidth: 1, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 14 },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14 },
});

export interface EmployeePickerProps {
  value: FinanceEmployee | null;
  onChange: (employee: FinanceEmployee) => void;
}

/** A searchable inline list (not a nested sheet — @gorhom/bottom-sheet nesting is awkward) for picking an employee inside a New Payslip/New Advance form. */
export function EmployeePicker({ value, onChange }: EmployeePickerProps) {
  const theme = useAppTheme();
  const { data } = useEmployees();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const employees = data?.employees ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(term) || e.employeeCode.toLowerCase().includes(term));
  }, [data, search]);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((o) => !o)}
        style={[styles.staticField, { borderColor: theme.colors.border }]}>
        <Text style={[theme.typography.body, { color: value ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
          {value ? `${value.name} (${value.employeeCode})` : 'Select an employee'}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ marginTop: 6 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or code…"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          />
          <View style={{ marginTop: 6, maxHeight: 220 }}>
            {filtered.map((employee) => (
              <Pressable
                key={employee.id}
                onPress={() => {
                  onChange(employee);
                  setOpen(false);
                  setSearch('');
                }}
                style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>{employee.name}</Text>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                  {employee.employeeCode} · {employee.department} · {employee.designation}
                </Text>
              </Pressable>
            ))}
            {filtered.length === 0 ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, paddingVertical: 10 }]}>No employees match.</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
