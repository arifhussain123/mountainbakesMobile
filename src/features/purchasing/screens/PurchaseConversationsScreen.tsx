import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PURCHASE_DEMAND_STATUS_LABEL,
  usePurchaseConversationPages,
  usePurchaseDemands,
  usePurchaseMessagePages,
  usePurchasingSummary,
  useResendPurchaseLink,
  useRetryPurchaseMessage,
  useReviewPurchaseMessage,
  type Supplier,
  type WhatsAppConversation,
  type WhatsAppMessage,
} from '@/api';
import { Routes, type ProductionWhatsAppStackParamList } from '@/navigation';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, Icon, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { formatRelativeTime } from '@/shared/utils';
import { LinkButton, MessageCard, SupplierPickerModal } from '../components';
import { useSubmission } from '../hooks';
import { conversationTitle, replyWindowUntil } from '../utils';

type Nav = NativeStackNavigationProp<ProductionWhatsAppStackParamList>;
type ConvRoute = RouteProp<ProductionWhatsAppStackParamList, typeof Routes.PRODUCTION_WHATSAPP_CONVERSATIONS>;
type Tab = 'conversations' | 'unmatched' | 'failed';

/** Mentions the demand's Resend link — the server's hint that a retry cannot carry the masked link again. */
const NEEDS_RESEND = /resend link/i;

/**
 * WhatsApp conversations with suppliers, plus the two queues that need a
 * person: Unmatched (a message nobody could tie to a supplier or demand —
 * assign or dismiss it) and Failed (outbound messages WhatsApp refused —
 * retry them).
 */
export function PurchaseConversationsScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ConvRoute>();
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'conversations');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search).trim();

  const summaryQ = usePurchasingSummary();
  const convQ = usePurchaseConversationPages(term);
  const unmatchedQ = usePurchaseMessagePages({ filter: 'unmatched' }, { enabled: tab === 'unmatched' });
  const failedQ = usePurchaseMessagePages({ filter: 'failed' }, { enabled: tab === 'failed' });

  const review = useReviewPurchaseMessage();
  const retry = useRetryPurchaseMessage();
  const resend = useResendPurchaseLink();
  const actionSub = useSubmission('purchase_message_action');
  const resendSub = useSubmission('purchase_resend_link');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<WhatsAppMessage | null>(null);
  const [assignSupplier, setAssignSupplier] = useState<Supplier | null>(null);

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'conversations', label: 'Conversations' },
    { value: 'unmatched', label: 'Unmatched', count: summaryQ.data?.unmatchedMessages },
    { value: 'failed', label: 'Failed', count: summaryQ.data?.failedMessages },
  ];

  const conversations = useMemo(() => convQ.data?.pages.flatMap((p) => p.conversations) ?? [], [convQ.data]);
  const unmatched = useMemo(() => unmatchedQ.data?.pages.flatMap((p) => p.messages) ?? [], [unmatchedQ.data]);
  const failed = useMemo(() => failedQ.data?.pages.flatMap((p) => p.messages) ?? [], [failedQ.data]);

  const dismiss = (m: WhatsAppMessage) =>
    Alert.alert('Dismiss this message?', 'It leaves the Unmatched queue without being linked to anyone. It stays in the conversation history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss',
        style: 'destructive',
        onPress: async () => {
          setBusyId(m.id);
          const outcome = await actionSub.run({ id: m.id, action: 'dismiss' }, () => review.mutateAsync({ messageId: m.id, input: { action: 'dismiss' } }));
          setBusyId(null);
          if (outcome.kind === 'failed') Alert.alert('Could not dismiss', outcome.message);
        },
      },
    ]);

  const assign = async (m: WhatsAppMessage, supplierId: string, demandId: string | null) => {
    setBusyId(m.id);
    const input = { action: 'assign' as const, supplierId, demandId };
    const outcome = await actionSub.run({ id: m.id, ...input }, () => review.mutateAsync({ messageId: m.id, input }));
    setBusyId(null);
    setAssigning(null);
    setAssignSupplier(null);
    if (outcome.kind === 'failed') Alert.alert('Could not assign', outcome.message);
  };

  const resendFor = (demandId: string) => {
    // One key per demand's resend, reused if this one is retried after a failure.
    void resendSub.run({ demandId }, (key) => resend.mutateAsync({ id: demandId, idempotencyKey: key })).then((o) => {
      if (o.kind === 'done') Alert.alert('Link resent', 'A fresh link was queued to the supplier.');
      else if (o.kind === 'failed') Alert.alert('Could not resend the link', o.message);
    });
  };

  const doRetry = async (m: WhatsAppMessage) => {
    setBusyId(m.id);
    const outcome = await actionSub.run({ id: m.id, action: 'retry' }, () => retry.mutateAsync(m.id));
    setBusyId(null);
    if (outcome.kind !== 'failed') return;
    if (outcome.conflict && NEEDS_RESEND.test(outcome.message) && m.demandId) {
      const demandId = m.demandId;
      Alert.alert('Cannot retry this message', outcome.message, [
        { text: 'Close', style: 'cancel' },
        { text: 'Open demand', onPress: () => navigation.navigate(Routes.PRODUCTION_WHATSAPP_DEMAND_DETAIL, { demandId }) },
        { text: 'Resend link', onPress: () => resendFor(demandId) },
      ]);
    } else Alert.alert('Could not retry', outcome.message);
  };

  const openThread = (c: WhatsAppConversation) =>
    navigation.navigate(Routes.PRODUCTION_WHATSAPP_THREAD, { conversationId: c.id, title: conversationTitle(c), windowOpenUntil: c.windowOpenUntil, supplierId: c.supplierId });

  const active = tab === 'conversations' ? convQ : tab === 'unmatched' ? unmatchedQ : failedQ;
  const refresh = () => {
    void active.refetch();
    void summaryQ.refetch();
  };

  const header = (
    <View style={{ marginBottom: theme.spacing.md }}>
      <View style={[styles.tabs, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
        {tabs.map((t) => {
          const on = t.value === tab;
          return (
            <Pressable
              key={t.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setTab(t.value)}
              style={[styles.tab, { backgroundColor: on ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm }]}>
              <Text style={[theme.typography.label, { color: on ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>
                {t.label}
                {t.count ? ` (${t.count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {tab === 'conversations' ? (
        <View style={{ marginTop: 10 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Name or number…" />
        </View>
      ) : (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 10 }]}>
          {tab === 'unmatched'
            ? 'Messages from numbers or about things the system could not match. Assign each to a supplier (and demand), or dismiss it.'
            : 'Messages WhatsApp did not deliver. Retry sends the same message again — never a new demand.'}
        </Text>
      )}
      {active.isLoading ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          <LoadingSkeleton height={70} />
          <LoadingSkeleton height={70} />
        </View>
      ) : null}
      {active.error ? (
        <View style={{ marginTop: 10 }}>
          <ErrorState message={mapErrorToMessage(active.error)} onRetry={refresh} />
        </View>
      ) : null}
    </View>
  );

  const footer = active.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined;
  const loadMore = () => {
    if (active.hasNextPage && !active.isFetchingNextPage) void active.fetchNextPage();
  };
  const listProps = {
    contentContainerStyle: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    ListHeaderComponent: header,
    ListFooterComponent: footer,
    onEndReached: loadMore,
    onEndReachedThreshold: 0.5,
    refreshing: active.isRefetching && !active.isFetchingNextPage,
    onRefresh: refresh,
  };

  return (
    <Screen>
      <AppHeader
        title="Conversations"
        subtitle="Supplier WhatsApp messages"
        actions={[
          { icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' },
          { icon: 'refresh', onPress: refresh, accessibilityLabel: 'Refresh' },
        ]}
      />
      {tab === 'conversations' ? (
        <FlatList
          {...listProps}
          data={conversations}
          keyExtractor={(c) => c.id}
          ListEmptyComponent={!convQ.isLoading && !convQ.error ? <EmptyState icon="message-circle" title="No Conversations" message={term ? `Nobody matches “${term}”.` : 'Conversations start when a demand is sent or a supplier writes in.'} /> : undefined}
          renderItem={({ item }) => {
            const open = replyWindowUntil(item.windowOpenUntil, []) !== null;
            return (
              <Pressable accessibilityRole="button" accessibilityLabel={`${conversationTitle(item)}${item.unreadCount ? `, ${item.unreadCount} unread` : ''}`} onPress={() => openThread(item)}>
                <Card style={{ marginBottom: 10 }}>
                  <View style={styles.row}>
                    <Text style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                      {conversationTitle(item)}
                    </Text>
                    {item.unreadCount > 0 ? (
                      <View style={[styles.unread, { backgroundColor: theme.colors.primary }]}>
                        <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700' }]}>{item.unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                    +{item.waId}
                    {item.supplierId ? '' : ' · not a registered supplier'}
                    {open ? ' · reply window open' : ''}
                  </Text>
                  {item.lastMessage ? (
                    <View style={[styles.row, { marginTop: 6 }]}>
                      <Icon name={item.lastMessage.direction === 'outbound' ? 'send' : 'message-circle'} size={12} color={theme.colors.textSecondary} />
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]} numberOfLines={2}>
                        {item.lastMessage.body ?? '(template message)'}
                      </Text>
                      <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{formatRelativeTime(item.lastMessage.createdAt)}</Text>
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            );
          }}
        />
      ) : (
        <FlatList
          {...listProps}
          data={tab === 'unmatched' ? unmatched : failed}
          keyExtractor={(m) => m.id}
          ListEmptyComponent={
            !active.isLoading && !active.error ? (
              <EmptyState icon="check" title={tab === 'unmatched' ? 'Nothing Unmatched' : 'No Failed Messages'} message={tab === 'unmatched' ? 'Every incoming message is tied to a supplier.' : 'Every message went through.'} />
            ) : undefined
          }
          renderItem={({ item }) =>
            tab === 'unmatched' ? (
              <View style={{ marginBottom: 6 }}>
                <MessageCard message={item} showDemand />
                <View style={[styles.row, { marginBottom: 8, flexWrap: 'wrap' }]}>
                  <LinkButton label="Assign" icon="user" onPress={() => setAssigning(item)} disabled={busyId === item.id} />
                  <LinkButton label="Dismiss" icon="close" tone="danger" onPress={() => dismiss(item)} disabled={busyId === item.id} />
                  {item.conversationId ? (
                    <LinkButton
                      label="Thread"
                      icon="message-circle"
                      tone="text"
                      onPress={() => navigation.navigate(Routes.PRODUCTION_WHATSAPP_THREAD, { conversationId: item.conversationId, title: item.supplierName ?? `+${item.waId}`, windowOpenUntil: null, supplierId: item.supplierId })}
                    />
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 6 }}>
                <MessageCard message={item} showDemand showParty onRetry={() => void doRetry(item)} retrying={busyId === item.id} />
                {item.demandId ? (
                  <View style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
                    <LinkButton label="Open demand" tone="text" onPress={() => navigation.navigate(Routes.PRODUCTION_WHATSAPP_DEMAND_DETAIL, { demandId: item.demandId! })} />
                  </View>
                ) : null}
              </View>
            )
          }
        />
      )}

      <SupplierPickerModal
        visible={assigning !== null && assignSupplier === null}
        onSelect={setAssignSupplier}
        onClose={() => {
          setAssigning(null);
          setAssignSupplier(null);
        }}
      />
      <DemandChooser
        visible={assigning !== null && assignSupplier !== null}
        supplier={assignSupplier}
        busy={assigning ? busyId === assigning.id : false}
        onChoose={(demandId) => {
          if (assigning && assignSupplier) void assign(assigning, assignSupplier.id, demandId);
        }}
        onBack={() => setAssignSupplier(null)}
      />
    </Screen>
  );
}

/** After choosing the supplier: which of their open demands the message is about, or none. */
function DemandChooser({ visible, supplier, busy, onChoose, onBack }: { visible: boolean; supplier: Supplier | null; busy: boolean; onChoose: (demandId: string | null) => void; onBack: () => void }) {
  const theme = useAppTheme();
  const demandsQ = usePurchaseDemands({ supplierId: supplier?.id, bucket: 'pending', limit: 50 }, { enabled: visible && !!supplier });
  const rows = demandsQ.data?.demands ?? [];
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg, gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to suppliers" onPress={onBack} hitSlop={10} disabled={busy}>
            <Icon name="chevron-left" color={theme.colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Which demand?</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{supplier?.name}</Text>
          </View>
          {busy ? <ActivityIndicator color={theme.colors.primary} /> : null}
        </View>
        <FlatList
          data={rows}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          ListHeaderComponent={
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onChoose(null)}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700' }]}>Just the supplier — no specific demand</Text>
            </Pressable>
          }
          ListEmptyComponent={demandsQ.isLoading ? <ActivityIndicator style={{ marginTop: 16 }} color={theme.colors.primary} /> : <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 12 }]}>No open demands with this supplier.</Text>}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onChoose(item.id)}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>{item.demandNo}</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{PURCHASE_DEMAND_STATUS_LABEL[item.status]}</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 4, padding: 4 },
  tab: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unread: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
