import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRestrictionRules } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, FilterChipRow, LoadingSkeleton, Screen, SecondaryButton, type FilterChipOption } from '@/shared/ui';
import { MONO } from '../../components/AdminDetail';
import { PreviewTab } from './PreviewTab';
import { ApprovalsTab, AuditTab, MonitorTab } from './RestrictionTabs';
import { RulesTab } from './RulesTab';
import { restrictionDmy, time12 } from './restrictionFormat';

type Tab = 'rules' | 'approvals' | 'monitor' | 'audit' | 'preview';

/**
 * Settings → Restriction Rules — the web `/settings/restriction-rules` page:
 * the rules (edited and saved per group), the approval requests (approved or
 * rejected in place), the live branch monitor, the audit log, and the Popup
 * Preview (each of the 16 situations rendered from the saved rules, as the
 * branch's popup would show it).
 */
export function RestrictionRulesScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const q = useRestrictionRules();
  const state = q.data;
  const [tab, setTab] = useState<Tab>('rules');
  const pending = state?.pendingRequests ?? 0;

  const tabs: FilterChipOption<Tab>[] = [
    { value: 'rules', label: 'Rules' },
    { value: 'approvals', label: 'Approvals', count: pending > 0 ? pending : undefined },
    { value: 'monitor', label: 'Branch Monitor' },
    { value: 'audit', label: 'Audit Log' },
    { value: 'preview', label: 'Popup Preview' },
  ];

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['restrictions'] });

  return (
    <Screen>
      <AppHeader
        title="Restriction Rules"
        subtitle="Control branch demand, sales, cash-deposit, ledger and company-share operations. Rules are enforced by the server; branch users see the result inside the popup where they attempt the action."
        actions={[{ icon: 'close', onPress: () => navigation.goBack(), accessibilityLabel: 'Close' }]}
      />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: 12, paddingBottom: theme.spacing.xl * 3 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={refresh} tintColor={theme.colors.primary} />}>
        {state ? (
          <View style={styles.facts}>
            <Fact label="Business date" value={restrictionDmy(state.businessDate)} mono />
            <Fact label="Timezone" value={state.timezone} />
            <Fact label="Day closes" value={time12(state.closingTime)} />
          </View>
        ) : null}
        <FilterChipRow options={tabs} value={tab} onChange={setTab} />

        {q.isLoading ? <LoadingSkeleton height={240} /> : null}
        {q.isError ? (
          <Card style={{ gap: 8 }}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>The restriction rules could not be loaded.</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              {mapErrorToMessage(q.error)} If this is a new deployment, the database migration for Restriction Rules may not have been applied yet.
            </Text>
            <View style={{ alignSelf: 'flex-start' }}>
              <SecondaryButton label="Try again" onPress={() => void q.refetch()} />
            </View>
          </Card>
        ) : null}

        {state && tab === 'rules' ? <RulesTab state={state} /> : null}
        {state && tab === 'approvals' ? <ApprovalsTab /> : null}
        {state && tab === 'monitor' ? <MonitorTab cashLimit={state.rules.cash.dailyLimit.limit} /> : null}
        {state && tab === 'audit' ? <AuditTab /> : null}
        {state && tab === 'preview' ? <PreviewTab state={state} /> : null}
      </ScrollView>
    </Screen>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const theme = useAppTheme();
  return (
    <Card style={styles.fact}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }, mono ? MONO : null]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: { paddingVertical: 8, paddingHorizontal: 12, flexGrow: 1 },
});
