import { useMemo, useRef } from 'react';
import { FlatList, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSupportTickets } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { TicketCard } from '../../components';
import { NewQuerySheetContent } from '../NewQueryScreen';

/** branchApp.md screen 24 — Help Desk: this branch's own queries. */
export function HelpDeskListScreen() {
  const theme = useAppTheme();
  const sheetRef = useRef<BottomSheetModal>(null);

  const { data, isLoading, error, refetch, isRefetching } = useSupportTickets();
  const tickets = useMemo(() => data?.tickets ?? [], [data]);

  return (
    <Screen>
      <AppHeader title="Help Desk" subtitle="Your own queries" actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PrimaryButton label="+ New Query" onPress={() => sheetRef.current?.present()} />
      </View>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState title="No Queries Yet" message="Report an issue with a sale, demand, expense or cash deposit." />
          ) : undefined
        }
        renderItem={({ item }) => <TicketCard ticket={item} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet ref={sheetRef} title="New Query" onRequestClose={() => sheetRef.current?.dismiss()}>
        <NewQuerySheetContent onClose={() => sheetRef.current?.dismiss()} />
      </FormBottomSheet>
    </Screen>
  );
}
