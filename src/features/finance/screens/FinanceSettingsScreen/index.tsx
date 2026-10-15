import { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { financeCan, useFinanceSettings, useUpdateFinanceSettings, type UpdateFinanceSettingsInput } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { styles } from './styles';

function Toggle({ label, hint, value, onChange, disabled }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>{label}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: theme.colors.primary }} />
    </View>
  );
}

function NumberField({ label, value, onChange, disabled, suffix }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean; suffix?: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={theme.colors.textSecondary}
        style={[
          styles.input,
          { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: disabled ? theme.colors.background : theme.colors.surface },
        ]}
      />
      {suffix ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{suffix}</Text> : null}
    </View>
  );
}

/** mountainbakesFinance.html screen 23 — this is where `allowSuperAdminWrite` itself lives; `finance_admin` only for writes. */
export function FinanceSettingsScreen() {
  const theme = useAppTheme();
  const role = useAuthStore((state) => state.user?.role);
  const { data, isLoading, error, refetch } = useFinanceSettings();
  const update = useUpdateFinanceSettings();

  const [companySharePct, setCompanySharePct] = useState('');
  const [branchSharePct, setBranchSharePct] = useState('');
  const [autoImportBranchIncome, setAutoImportBranchIncome] = useState(false);
  const [requireAdminVerification, setRequireAdminVerification] = useState(false);
  const [allowSuperAdminWrite, setAllowSuperAdminWrite] = useState(false);

  useEffect(() => {
    if (!data) return;
    setCompanySharePct(String(data.companySharePct));
    setBranchSharePct(String(data.branchSharePct));
    setAutoImportBranchIncome(data.autoImportBranchIncome);
    setRequireAdminVerification(data.requireAdminVerification);
    setAllowSuperAdminWrite(data.allowSuperAdminWrite);
  }, [data]);

  const canConfigure = financeCan(role, 'configure', data?.allowSuperAdminWrite ?? false);

  const handleSave = () => {
    const input: UpdateFinanceSettingsInput = {
      companySharePct: Number(companySharePct),
      branchSharePct: Number(branchSharePct),
      autoImportBranchIncome,
      requireAdminVerification,
      allowSuperAdminWrite,
    };
    update.mutate(input, {
      onSuccess: () => Alert.alert('Saved', 'Finance settings updated.'),
      onError: (e) => Alert.alert('Could Not Save', mapErrorToMessage(e)),
    });
  };

  return (
    <Screen>
      <AppHeader title="Finance Settings" subtitle={canConfigure ? 'You can edit these' : 'Read only'} actions={[]} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        {isLoading ? <LoadingSkeleton height={200} /> : null}
        {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
        {!isLoading && !error && !data ? <EmptyState title="Not Available" message="Finance settings could not be loaded." /> : null}

        {data ? (
          <View>
            <NumberField label="Company Share %" value={companySharePct} onChange={setCompanySharePct} disabled={!canConfigure} />
            <NumberField label="Branch Share %" value={branchSharePct} onChange={setBranchSharePct} disabled={!canConfigure} suffix="Company + Branch must total 100%." />

            <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
              <Toggle
                label="Auto-Import Branch Income"
                hint="Pull each branch's daily sales into the income queue automatically."
                value={autoImportBranchIncome}
                onChange={setAutoImportBranchIncome}
                disabled={!canConfigure}
              />
              <Toggle
                label="Require Admin Verification"
                hint="Branch income must be verified before it reaches approval."
                value={requireAdminVerification}
                onChange={setRequireAdminVerification}
                disabled={!canConfigure}
              />
              <Toggle
                label="Allow Super Admin Write"
                hint="Lets a Super Admin create, approve, adjust and configure finance records — off by default."
                value={allowSuperAdminWrite}
                onChange={setAllowSuperAdminWrite}
                disabled={!canConfigure}
              />
            </View>

            {canConfigure ? (
              <View style={{ marginTop: theme.spacing.xl }}>
                <PrimaryButton label="Save Changes" onPress={handleSave} loading={update.isPending} />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
