import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  financeCan,
  useAdvances,
  useApproveEmployeeAdvance,
  useApproveSalaryPayment,
  useEmployees,
  useRejectEmployeeAdvance,
  useRejectSalaryPayment,
  useSalaries,
  type EmployeeAdvance,
  type SalaryPayment,
} from '@/api';
import { Routes, type FinancePayrollStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { AddEmployeeSheetContent } from './AddEmployeeSheetContent';
import { NewEmployeeAdvanceSheetContent } from './NewEmployeeAdvanceSheetContent';
import { NewSalaryPaymentSheetContent } from './NewSalaryPaymentSheetContent';
import { EmployeeRow, SalaryPaymentRow, EmployeeAdvanceRow } from './rows';
import { styles } from './styles';

const TABS = ['salaries', 'advances', 'employees'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = { salaries: 'Salaries', advances: 'Advances', employees: 'Employees' };

/** mountainbakesFinance.html screen 06 — Payroll: payslips, advances and the payroll master. */
export function FinancePayrollListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<FinancePayrollStackParamList>>();
  const role = useAuthStore((state) => state.user?.role);
  const canConfigure = financeCan(role, 'configure');
  const canApprove = financeCan(role, 'approve');

  const [tab, setTab] = useState<(typeof TABS)[number]>('salaries');
  const newPayslipRef = useRef<BottomSheetModal>(null);
  const newAdvanceRef = useRef<BottomSheetModal>(null);
  const addEmployeeRef = useRef<BottomSheetModal>(null);

  const salaries = useSalaries({ limit: 100 });
  const advances = useAdvances({ limit: 100 });
  const employees = useEmployees();

  const approveSalary = useApproveSalaryPayment();
  const rejectSalary = useRejectSalaryPayment();
  const approveAdvance = useApproveEmployeeAdvance();
  const rejectAdvance = useRejectEmployeeAdvance();

  const salaryList = useMemo(() => salaries.data?.salaries ?? [], [salaries.data]);
  const advanceList = useMemo(() => advances.data?.advances ?? [], [advances.data]);
  const employeeList = useMemo(() => employees.data?.employees ?? [], [employees.data]);

  const netForSalaries = useMemo(() => salaryList.reduce((sum, s) => sum + (s.status === 'approved' || s.status === 'posted' ? s.netSalary : 0), 0), [salaryList]);

  const handleApproveSalary = (item: SalaryPayment) => {
    approveSalary.mutate({ id: item.id }, { onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)) });
  };
  const handleRejectSalary = (item: SalaryPayment) => {
    Alert.alert('Reject Payslip', `Reject ${item.employeeName}'s payslip (${formatCurrency(item.netSalary)})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => rejectSalary.mutate({ id: item.id, reason: 'Rejected from Payroll list' }, { onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)) }),
      },
    ]);
  };
  const handleApproveAdvance = (item: EmployeeAdvance) => {
    approveAdvance.mutate({ id: item.id }, { onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)) });
  };
  const handleRejectAdvance = (item: EmployeeAdvance) => {
    Alert.alert('Reject Advance', `Reject ${item.employeeName}'s advance (${formatCurrency(item.totalAmount)})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => rejectAdvance.mutate({ id: item.id, reason: 'Rejected from Payroll list' }, { onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)) }),
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader title="Payroll" subtitle="Payslips, advances & the payroll master" actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
          {TABS.map((option) => {
            const active = option === tab;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(option)}
                style={[styles.tab, { backgroundColor: active ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm }]}>
                <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>{TAB_LABEL[option]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {tab === 'salaries' ? (
        <FlatList
          data={salaryList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          ListHeaderComponent={
            <View style={{ marginBottom: theme.spacing.sm }}>
              <View style={styles.row}>
                <View>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>NET APPROVED</Text>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatCurrency(netForSalaries)}</Text>
                </View>
                {canApprove ? <PrimaryButton label="+ New Payslip" onPress={() => newPayslipRef.current?.present()} /> : null}
              </View>
              <Pressable onPress={() => navigation.navigate(Routes.FINANCE_SALARY_LEDGER)} style={{ marginTop: theme.spacing.sm }}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, fontWeight: '700' }]}>View Salary Ledger →</Text>
              </Pressable>
              {salaries.isLoading ? <LoadingSkeleton height={100} /> : null}
              {salaries.error ? <ErrorState message={mapErrorToMessage(salaries.error)} onRetry={() => void salaries.refetch()} /> : null}
            </View>
          }
          ListEmptyComponent={!salaries.isLoading && !salaries.error ? <EmptyState title="No Payslips" message="No payslips have been raised yet." /> : undefined}
          renderItem={({ item }) => (
            <SalaryPaymentRow
              item={item}
              canApprove={canApprove}
              onApprove={() => handleApproveSalary(item)}
              onReject={() => handleRejectSalary(item)}
              approving={approveSalary.isPending}
              rejecting={rejectSalary.isPending}
            />
          )}
          refreshing={salaries.isRefetching}
          onRefresh={() => void salaries.refetch()}
        />
      ) : null}

      {tab === 'advances' ? (
        <FlatList
          data={advanceList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          ListHeaderComponent={
            <View style={{ marginBottom: theme.spacing.sm }}>
              {canApprove ? (
                <View style={{ alignSelf: 'flex-end' }}>
                  <PrimaryButton label="+ New Advance" onPress={() => newAdvanceRef.current?.present()} />
                </View>
              ) : null}
              {advances.isLoading ? <LoadingSkeleton height={100} /> : null}
              {advances.error ? <ErrorState message={mapErrorToMessage(advances.error)} onRetry={() => void advances.refetch()} /> : null}
            </View>
          }
          ListEmptyComponent={!advances.isLoading && !advances.error ? <EmptyState title="No Advances" message="No advances have been raised yet." /> : undefined}
          renderItem={({ item }) => (
            <EmployeeAdvanceRow
              item={item}
              canApprove={canApprove}
              onApprove={() => handleApproveAdvance(item)}
              onReject={() => handleRejectAdvance(item)}
              approving={approveAdvance.isPending}
              rejecting={rejectAdvance.isPending}
            />
          )}
          refreshing={advances.isRefetching}
          onRefresh={() => void advances.refetch()}
        />
      ) : null}

      {tab === 'employees' ? (
        <FlatList
          data={employeeList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          ListHeaderComponent={
            <View style={{ marginBottom: theme.spacing.sm }}>
              {canConfigure ? (
                <View style={{ alignSelf: 'flex-end' }}>
                  <PrimaryButton label="+ Add Employee" onPress={() => addEmployeeRef.current?.present()} />
                </View>
              ) : null}
              {employees.isLoading ? <LoadingSkeleton height={100} /> : null}
              {employees.error ? <ErrorState message={mapErrorToMessage(employees.error)} onRetry={() => void employees.refetch()} /> : null}
            </View>
          }
          ListEmptyComponent={!employees.isLoading && !employees.error ? <EmptyState title="No Employees" message="No employees on the payroll master yet." /> : undefined}
          renderItem={({ item }) => <EmployeeRow item={item} onPress={() => navigation.navigate(Routes.FINANCE_EMPLOYEE_DETAIL, { employeeId: item.id })} />}
          refreshing={employees.isRefetching}
          onRefresh={() => void employees.refetch()}
        />
      ) : null}

      <FormBottomSheet title="New Payslip" onRequestClose={() => newPayslipRef.current?.dismiss()} ref={newPayslipRef}>
        <NewSalaryPaymentSheetContent onClose={() => newPayslipRef.current?.dismiss()} onCreated={() => void salaries.refetch()} />
      </FormBottomSheet>
      <FormBottomSheet title="New Advance" onRequestClose={() => newAdvanceRef.current?.dismiss()} ref={newAdvanceRef}>
        <NewEmployeeAdvanceSheetContent onClose={() => newAdvanceRef.current?.dismiss()} onCreated={() => void advances.refetch()} />
      </FormBottomSheet>
      <FormBottomSheet title="Add Employee" onRequestClose={() => addEmployeeRef.current?.dismiss()} ref={addEmployeeRef}>
        <AddEmployeeSheetContent onClose={() => addEmployeeRef.current?.dismiss()} onCreated={() => void employees.refetch()} />
      </FormBottomSheet>
    </Screen>
  );
}
