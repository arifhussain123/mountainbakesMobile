import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  RESIGNATION_REASONS,
  financeCan,
  generateIdempotencyKey,
  getBusinessDate,
  useCancelResignation,
  useEmployeeProfile,
  useRecordResignation,
} from '@/api';
import type { FinancePayrollStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, LoadingSkeleton, PrimaryButton, Screen, SecondaryButton, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { styles } from '../FinancePayrollListScreen/styles';

function Row({ label, value }: { label: string; value: string | null }) {
  const theme = useAppTheme();
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 5 }}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

/** mountainbakesFinance.html screen 10 — Employee Resignation, folded into the employee's own detail screen (profile via GET /employees/:id). */
export function FinanceEmployeeDetailScreen() {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<FinancePayrollStackParamList, 'FinanceEmployeeDetail'>>();
  const { employeeId } = route.params;
  const role = useAuthStore((state) => state.user?.role);
  const canConfigure = financeCan(role, 'configure');

  const { data: profile, isLoading, error, refetch } = useEmployeeProfile(employeeId);
  const recordResignation = useRecordResignation();
  const cancelResignation = useCancelResignation();

  const [reason, setReason] = useState<(typeof RESIGNATION_REASONS)[number] | null>(null);
  const [remarks, setRemarks] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const resignKeyRef = useRef(generateIdempotencyKey('finance_resignation'));
  const cancelKeyRef = useRef(generateIdempotencyKey('finance_resignation_cancel'));

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Employee" />
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton height={200} />
        </View>
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen>
        <AppHeader title="Employee" />
        <View style={{ padding: theme.spacing.lg }}>
          <ErrorState message={error ? mapErrorToMessage(error) : 'Not found'} onRetry={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  const { employee } = profile;
  const today = getBusinessDate();

  const handleSubmitResignation = () => {
    if (!reason) {
      Alert.alert('Reason Required', 'Select a reason for the resignation.');
      return;
    }
    if (reason === 'Other' && remarks.trim().length === 0) {
      Alert.alert('Remarks Required', '"Other" needs a short remark.');
      return;
    }
    if (!confirmed) {
      Alert.alert('Confirmation Required', `Confirm ${employee.name} has resigned.`);
      return;
    }
    recordResignation.mutate(
      {
        employeeId,
        input: { resignationDate: today, resignationTime: new Date().toISOString().slice(11, 16), reason, remarks: remarks.trim() || undefined },
        idempotencyKey: resignKeyRef.current,
      },
      {
        onSuccess: () => {
          setReason(null);
          setRemarks('');
          setConfirmed(false);
          resignKeyRef.current = generateIdempotencyKey('finance_resignation');
        },
        onError: (e) => Alert.alert('Could Not Record Resignation', mapErrorToMessage(e)),
      },
    );
  };

  const handleCancelResignation = () => {
    Alert.alert('Cancel Resignation', `Reactivate ${employee.name}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Reactivate',
        onPress: () =>
          cancelResignation.mutate(
            { employeeId, input: { reason: 'Reversed from mobile' }, idempotencyKey: cancelKeyRef.current },
            { onError: (e) => Alert.alert('Could Not Cancel', mapErrorToMessage(e)) },
          ),
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader title={employee.name} subtitle={employee.employeeCode} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatCurrency(employee.baseSalary)}</Text>
            <StatusBadge label={employee.isActive ? 'Active' : 'Resigned'} variant={employee.isActive ? 'success' : 'neutral'} />
          </View>
          <View style={{ marginTop: theme.spacing.sm }}>
            <Row label="Department" value={employee.department} />
            <Row label="Designation" value={employee.designation} />
            <Row label="Branch" value={employee.branchName ?? 'Head office'} />
            <Row label="Phone" value={employee.phone} />
            <Row label="Joined" value={employee.joinedOn ? formatDisplayDate(employee.joinedOn) : null} />
            <Row
              label="Last Approved Salary"
              value={profile.lastApprovedSalary ? `${profile.lastApprovedSalary.salaryMonth} · ${formatCurrency(profile.lastApprovedSalary.amount)}` : 'None yet'}
            />
            <Row label="All-Time Approved" value={formatCurrency(profile.allTimeApproved)} />
          </View>
        </Card>

        {employee.isActive && canConfigure ? (
          <Card style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Employee Resignation</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
              Salary history is kept. Ordinary salary closes after the resignation month.
            </Text>

            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>REASON</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {RESIGNATION_REASONS.map((r) => {
                const active = r === reason;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setReason(r)}
                    style={{
                      height: 32,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      borderColor: theme.colors.border,
                    }}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>REMARKS{reason === 'Other' ? ' (REQUIRED)' : ' (OPTIONAL)'}</Text>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Say more…"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              style={[styles.input, { marginTop: 6, height: 60, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
            />

            <Pressable onPress={() => setConfirmed((c) => !c)} style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.md }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  borderColor: confirmed ? theme.colors.primary : theme.colors.border,
                  backgroundColor: confirmed ? theme.colors.primary : 'transparent',
                  marginTop: 1,
                }}
              />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>
                I confirm {employee.name} has resigned on {formatDisplayDate(today)}. The server time and my user account will be recorded.
              </Text>
            </Pressable>

            <View style={{ marginTop: theme.spacing.lg }}>
              <PrimaryButton label="Submit Resignation" onPress={handleSubmitResignation} loading={recordResignation.isPending} />
            </View>
          </Card>
        ) : null}

        {!employee.isActive && employee.resignation && canConfigure ? (
          <Card style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Resignation on File</Text>
            <Row label="Date" value={formatDisplayDate(employee.resignation.resignationDate)} />
            <Row label="Reason" value={employee.resignation.reason} />
            <Row label="Remarks" value={employee.resignation.remarks} />
            <Row label="Submitted By" value={employee.resignation.submittedByName} />
            <View style={{ marginTop: theme.spacing.md }}>
              <SecondaryButton label="Cancel Resignation" onPress={handleCancelResignation} loading={cancelResignation.isPending} />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
