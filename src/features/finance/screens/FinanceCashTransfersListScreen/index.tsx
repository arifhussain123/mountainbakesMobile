import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFinanceCashTransfers, type CashTransferStatus } from '@/api';
import { Routes, useTabBarHeight, type FinanceCashTransfersStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, Screen, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from './styles';

const TABS = ['pending', 'approved', 'rejected'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_VARIANT: Record<CashTransferStatus, StatusVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

/** mountainbakesFinance.html screen 03 — Cash Transfers: Finance's review side of the Branch app's Cash Deposit. */
export function FinanceCashTransfersListScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<FinanceCashTransfersStackParamList>>();
  const [tab, setTab] = useState<(typeof TABS)[number]>('pending');

  const { data, isLoading, error, refetch, isRefetching } = useFinanceCashTransfers({ status: tab, limit: 100 });
  const transfers = useMemo(() => data?.transfers ?? [], [data]);

  return (
    <Screen>
      <AppHeader title="Cash Transfers" subtitle="Branch handovers awaiting review" actions={[]} />
      <FlatList
        data={transfers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight }}
        ListHeaderComponent={
          <View>
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
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={!isLoading && !error ? <EmptyState title="Nothing Here" message="No cash transfers in this queue right now." /> : undefined}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate(Routes.FINANCE_CASH_TRANSFER_DETAIL, { transferId: item.id })}
            style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.row}>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatCurrency(item.amount)}</Text>
              <StatusBadge label={item.status} variant={STATUS_VARIANT[item.status]} />
            </View>
            <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]} numberOfLines={1}>
              {item.branchName}
            </Text>
            <View style={[styles.row, { marginTop: 6 }]}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{item.transferNo}</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{formatDisplayDate(item.date)}</Text>
            </View>
          </Pressable>
        )}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}
