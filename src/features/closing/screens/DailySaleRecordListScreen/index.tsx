import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate, useDailySaleRecords, useGenerateDailySaleRecord, useVerifyDailySaleRecord } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen, StatCard } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { DailySaleRecordCard } from '../../components';
import { ManualFeedSheetContent } from '../ManualFeedScreen';
import { styles } from './styles';

/** branchApp.md screen 21 — Daily Sale Record: takings against what was physically counted. */
export function DailySaleRecordListScreen() {
  const theme = useAppTheme();
  const manualFeedSheetRef = useRef<BottomSheetModal>(null);
  const [generatingDate, setGeneratingDate] = useState<string | null>(null);
  const [manualFeedDate, setManualFeedDate] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useDailySaleRecords();
  const generate = useGenerateDailySaleRecord();
  const verify = useVerifyDailySaleRecord();

  const records = useMemo(() => data?.records ?? [], [data]);

  const handleGenerate = (businessDate: string) => {
    setGeneratingDate(businessDate);
    generate.mutate(businessDate, {
      onError: (e) => Alert.alert('Could Not Generate', mapErrorToMessage(e)),
      onSettled: () => setGeneratingDate(null),
    });
  };

  const handleVerify = (id: string) => {
    verify.mutate(id, { onError: (e) => Alert.alert('Could Not Verify', mapErrorToMessage(e)) });
  };

  const openManualFeed = (businessDate: string) => {
    setManualFeedDate(businessDate);
    manualFeedSheetRef.current?.present();
  };

  return (
    <Screen>
      <AppHeader title="Daily Sale Record" subtitle="Never changes sales or expenses" actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PrimaryButton
          label="Generate Today"
          onPress={() => handleGenerate(getBusinessDate())}
          loading={generatingDate === getBusinessDate()}
        />
      </View>
      <FlatList
        data={records}
        keyExtractor={(item) => item.businessDate}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            {data ? (
              <Card style={{ marginBottom: theme.spacing.md }}>
                <View style={styles.totalsGrid}>
                  <StatCard label="Total Sale" value={formatCurrency(data.summary.totalSale)} />
                  <StatCard
                    label="Difference"
                    value={formatCurrency(data.summary.difference)}
                    valueColor={data.summary.difference === 0 ? theme.colors.success : theme.colors.danger}
                  />
                  <StatCard label="Discount" value={formatCurrency(data.summary.discount)} />
                </View>
              </Card>
            ) : null}
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
            <View style={{ height: theme.spacing.sm }} />
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Records" message="Generate today's record to get started." /> : undefined
        }
        renderItem={({ item }) => (
          <DailySaleRecordCard
            record={item}
            isGenerating={generatingDate === item.businessDate}
            onGenerate={() => handleGenerate(item.businessDate)}
            onOpenManualFeed={() => openManualFeed(item.businessDate)}
            onVerify={() => item.id && handleVerify(item.id)}
            isVerifying={verify.isPending}
          />
        )}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet
        ref={manualFeedSheetRef}
        title="Manual Feed"
        subtitle={manualFeedDate ? formatDisplayDate(manualFeedDate) : undefined}
        onRequestClose={() => manualFeedSheetRef.current?.dismiss()}
        onDismiss={() => setManualFeedDate(null)}>
        {manualFeedDate ? <ManualFeedSheetContent businessDate={manualFeedDate} onClose={() => manualFeedSheetRef.current?.dismiss()} /> : null}
      </FormBottomSheet>
    </Screen>
  );
}
