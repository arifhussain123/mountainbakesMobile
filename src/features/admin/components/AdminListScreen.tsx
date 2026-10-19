import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, FlatList, View, type ListRenderItem } from 'react-native';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';

export interface AdminListScreenProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: ListRenderItem<T>;
  isLoading: boolean;
  error: unknown;
  onRefresh: () => void;
  refreshing: boolean;
  emptyTitle: string;
  emptyMessage?: string;
  /** Filters, search and summary tiles above the rows. */
  header?: ReactNode;
  onEndReached?: () => void;
  loadingMore?: boolean;
  /** The web page's own failure sentence, in place of the mapped API error. */
  errorMessage?: string;
}

/**
 * The frame every Super Admin read-only list shares: header with the menu
 * button, then loading / error / empty / rows with pull-to-refresh. Nothing
 * here writes — each screen only shows what its endpoint returns.
 */
export function AdminListScreen<T>({
  title,
  subtitle,
  data,
  keyExtractor,
  renderItem,
  isLoading,
  error,
  onRefresh,
  refreshing,
  emptyTitle,
  emptyMessage,
  header,
  onEndReached,
  loadingMore,
  errorMessage,
}: AdminListScreenProps<T>): ReactElement {
  const theme = useAppTheme();
  return (
    <Screen>
      <AppHeader title={title} subtitle={subtitle} actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]} />
      <FlatList
        data={isLoading || error ? [] : data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 8 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: theme.spacing.sm }}>
            {header}
            {isLoading ? <LoadingSkeleton height={160} /> : null}
            {error ? <ErrorState message={errorMessage ?? mapErrorToMessage(error)} onRetry={onRefresh} /> : null}
          </View>
        }
        ListEmptyComponent={!isLoading && !error ? <EmptyState title={emptyTitle} message={emptyMessage} /> : undefined}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined}
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </Screen>
  );
}
