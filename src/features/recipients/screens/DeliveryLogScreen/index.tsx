import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { getBusinessDate, useClosingRecipients, useMessagingProvider, useNotificationLogPages, type NotificationLog } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, DateField, Dropdown, EmptyState, ErrorState, FilterChipRow, LoadingSkeleton, Screen, StatusBadge, type FilterChipOption } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { ProviderBanner } from '../../components/ProviderBanner';
import { formatPkMobile } from '../../utils/phone';
import { CHANNEL_LABEL, deliveryLabel, receivesLine } from '../../utils/recipientRules';

type StatusFilter = 'all' | 'pending' | 'sent' | 'failed';
const STATUS_OPTIONS: FilterChipOption<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
];
type ChannelFilter = 'all' | 'whatsapp' | 'sms';
const CHANNEL_OPTIONS: FilterChipOption<ChannelFilter>[] = [
  { value: 'all', label: 'All channels' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
];
const ANYONE = 'all';

/**
 * Every send of the closing summary, newest first, grouped by business date.
 * One row per message: the retries it took are counted on the row. "Sent"
 * means the provider accepted it — there are no delivery receipts — and a
 * test-mode row was only logged. The message text itself is not stored.
 * Each row names the number it went to, as the web log does; the business
 * date filter takes any day from the date picker.
 */
export function DeliveryLogScreen() {
  const theme = useAppTheme();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [recipientId, setRecipientId] = useState<string>(ANYONE);
  const [channel, setChannel] = useState<ChannelFilter>('all');
  /** `''` = any business date. */
  const [businessDate, setBusinessDate] = useState('');
  const today = getBusinessDate();

  const providerQ = useMessagingProvider();
  const recipientsQ = useClosingRecipients();
  const pagesQ = useNotificationLogPages({
    status: status === 'all' ? undefined : status,
    channel: channel === 'all' ? undefined : channel,
    businessDate: businessDate || undefined,
    recipientId: recipientId === ANYONE ? undefined : recipientId,
  });
  const maxAttempts = providerQ.data?.retry.maxAttempts;

  const recipientById = useMemo(() => new Map((recipientsQ.data?.recipients ?? []).map((r) => [r.id, r])), [recipientsQ.data]);
  const recipientOptions = useMemo(
    () => [
      { value: ANYONE, label: 'Everyone' },
      ...(recipientsQ.data?.recipients ?? []).map((r) => ({ value: r.id, label: `${r.recipientName} · ${receivesLine(r)}` })),
    ],
    [recipientsQ.data],
  );

  const sections = useMemo(() => {
    const out: { key: string; title: string; data: NotificationLog[] }[] = [];
    for (const log of pagesQ.data?.pages.flatMap((p) => p.logs) ?? []) {
      let s = out.find((x) => x.key === log.businessDate);
      if (!s) {
        s = { key: log.businessDate, title: formatDisplayDate(log.businessDate), data: [] };
        out.push(s);
      }
      s.data.push(log);
    }
    return out;
  }, [pagesQ.data]);

  const showDetail = (log: NotificationLog) => {
    const r = log.recipientId ? recipientById.get(log.recipientId) : undefined;
    Alert.alert(
      deliveryLabel(log),
      [
        `${log.recipientName ?? 'Removed recipient'}${r ? ` · ${receivesLine(r)}` : ''}`,
        log.mobileNumber ? formatPkMobile(log.mobileNumber) : null,
        `${CHANNEL_LABEL[log.channel]} · ${formatDisplayTime(log.createdAt)}`,
        `Attempts: ${log.retryCount + 1}${maxAttempts ? ` of ${maxAttempts}` : ''}`,
        log.provider === 'log' ? 'Test mode: written to the server log only.' : `Provider: ${log.provider}${log.providerMessageId ? ` · ${log.providerMessageId}` : ''}`,
        log.errorMessage ? `Error: ${log.errorMessage}` : null,
        'The message text is not kept with the log.',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  };

  return (
    <Screen>
      <AppHeader title="Delivery Log" subtitle="Every closing-summary send attempt, newest first." />
      <SectionList
        sections={sections}
        keyExtractor={(l) => l.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (pagesQ.hasNextPage && !pagesQ.isFetchingNextPage) void pagesQ.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: theme.spacing.md }}>
            <ProviderBanner provider={providerQ.data} />
            <DateField
              label="Business date"
              value={businessDate}
              onChange={setBusinessDate}
              onClear={() => setBusinessDate('')}
              maximumDate={today}
              placeholder="Any business date"
            />
            <FilterChipRow options={STATUS_OPTIONS} value={status} onChange={setStatus} />
            <FilterChipRow options={CHANNEL_OPTIONS} value={channel} onChange={setChannel} />
            <Dropdown options={recipientOptions} value={recipientId} onChange={setRecipientId} />
            {pagesQ.isLoading ? <LoadingSkeleton height={120} /> : null}
            {pagesQ.error ? <ErrorState message={mapErrorToMessage(pagesQ.error)} onRetry={() => void pagesQ.refetch()} /> : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginBottom: 8 }]} accessibilityRole="header">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const r = item.recipientId ? recipientById.get(item.recipientId) : undefined;
          const label = deliveryLabel(item);
          const variant = item.status === 'failed' ? 'danger' : item.status === 'pending' ? 'neutral' : item.provider === 'log' ? 'warning' : 'success';
          return (
            <Pressable onPress={() => showDetail(item)} accessibilityRole="button" accessibilityLabel={`${item.recipientName ?? 'Removed recipient'}, ${CHANNEL_LABEL[item.channel]}, ${label}, ${item.retryCount + 1} attempts`}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{item.recipientName ?? 'Removed recipient'}</Text>
                    {item.mobileNumber ? (
                      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontFamily: 'monospace', marginTop: 2 }]}>
                        {formatPkMobile(item.mobileNumber)}
                      </Text>
                    ) : null}
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                      {r ? receivesLine(r) : '—'} · {CHANNEL_LABEL[item.channel]} · {formatDisplayTime(item.createdAt)} · {item.retryCount + 1}
                      {maxAttempts ? ` of ${maxAttempts}` : ''} {item.retryCount === 0 ? 'attempt' : 'attempts'}
                    </Text>
                  </View>
                  <View style={{ maxWidth: '50%' }}>
                    <StatusBadge label={label} variant={variant} />
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !pagesQ.isLoading && !pagesQ.error ? <EmptyState title="Nothing Sent Yet" message="No delivery attempts for this selection." /> : undefined
        }
        ListFooterComponent={pagesQ.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined}
        refreshing={pagesQ.isRefetching && !pagesQ.isFetchingNextPage}
        onRefresh={() => void pagesQ.refetch()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
