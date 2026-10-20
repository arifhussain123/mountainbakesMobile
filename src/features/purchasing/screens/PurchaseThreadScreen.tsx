import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMarkPurchaseConversationRead, usePurchaseMessagePages, useReplyToPurchaseConversation, useRetryPurchaseMessage, type WhatsAppMessage } from '@/api';
import { Routes, type ProductionWhatsAppStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen } from '@/shared/ui';
import { formatDisplayTime } from '@/shared/utils';
import { LinkButton, MessageCard, Notice } from '../components';
import { useSubmission } from '../hooks';
import { replyWindowUntil } from '../utils';

type Nav = NativeStackNavigationProp<ProductionWhatsAppStackParamList>;
type ThreadRoute = RouteProp<ProductionWhatsAppStackParamList, typeof Routes.PRODUCTION_WHATSAPP_THREAD>;

/**
 * One WhatsApp conversation, newest at the bottom. A free-text reply is only
 * possible inside WhatsApp's 24-hour window after the supplier last wrote;
 * outside it the box is disabled and says why (the server refuses anyway).
 */
export function PurchaseThreadScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  const { conversationId, title, windowOpenUntil } = useRoute<ThreadRoute>().params;
  const messagesQ = usePurchaseMessagePages({ conversationId });
  const markRead = useMarkPurchaseConversationRead();
  const reply = useReplyToPurchaseConversation();
  const retry = useRetryPurchaseMessage();
  const replySub = useSubmission('purchase_reply');
  const retrySub = useSubmission('purchase_message_retry');
  const [body, setBody] = useState('');
  const [linkDemand, setLinkDemand] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const markedRef = useRef(false);

  useEffect(() => {
    if (!markedRef.current) {
      markedRef.current = true;
      markRead.mutate(conversationId);
    }
  }, [conversationId, markRead]);

  const messages = useMemo(() => messagesQ.data?.pages.flatMap((p) => p.messages) ?? [], [messagesQ.data]);
  const until = replyWindowUntil(windowOpenUntil, messages);
  const latestDemand = messages.find((m) => m.demandId && m.demandNo) ?? null;
  const demandId = linkDemand ? (latestDemand?.demandId ?? null) : null;

  const send = async () => {
    const text = body.trim();
    if (!text || !until) return;
    setError(null);
    const input = { body: text, demandId };
    const outcome = await replySub.run(input, (key) => reply.mutateAsync({ id: conversationId, input: { ...input, clientRequestId: key }, idempotencyKey: key }));
    if (outcome.kind === 'done') setBody('');
    else if (outcome.kind === 'failed') setError(outcome.message);
  };

  const doRetry = async (m: WhatsAppMessage) => {
    setRetryingId(m.id);
    const outcome = await retrySub.run({ id: m.id }, () => retry.mutateAsync(m.id));
    setRetryingId(null);
    if (outcome.kind === 'failed') setError(outcome.message);
  };

  return (
    <Screen>
      <AppHeader
        title={title}
        subtitle={until ? `Reply window open until ${formatDisplayTime(until.toISOString())}` : 'Reply window closed'}
        actions={[
          { icon: 'chevron-left', onPress: () => navigation.goBack(), accessibilityLabel: 'Back' },
          { icon: 'refresh', onPress: () => void messagesQ.refetch(), accessibilityLabel: 'Refresh' },
        ]}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {messagesQ.isLoading ? (
          <View style={{ padding: theme.spacing.lg, gap: 8 }}>
            <LoadingSkeleton height={60} />
            <LoadingSkeleton height={60} />
          </View>
        ) : null}
        {messagesQ.error ? (
          <View style={{ padding: theme.spacing.lg }}>
            <ErrorState message={mapErrorToMessage(messagesQ.error)} onRetry={() => void messagesQ.refetch()} />
          </View>
        ) : null}
        <FlatList
          inverted
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (messagesQ.hasNextPage && !messagesQ.isFetchingNextPage) void messagesQ.fetchNextPage();
          }}
          ListFooterComponent={messagesQ.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 8 }} color={theme.colors.primary} /> : undefined}
          ListEmptyComponent={!messagesQ.isLoading && !messagesQ.error ? <EmptyState icon="message-circle" title="No Messages" message="Nothing in this conversation yet." /> : undefined}
          renderItem={({ item }) => (
            <View>
              <MessageCard message={item} showDemand onRetry={() => void doRetry(item)} retrying={retryingId === item.id} />
              {item.demandId && item.direction === 'inbound' ? (
                <View style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                  <LinkButton label={`Open ${item.demandNo ?? 'demand'}`} tone="text" onPress={() => navigation.navigate(Routes.PRODUCTION_WHATSAPP_DEMAND_DETAIL, { demandId: item.demandId! })} />
                </View>
              ) : null}
            </View>
          )}
        />
        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, padding: theme.spacing.lg, backgroundColor: theme.colors.surface }}>
          {until ? (
            <>
              {latestDemand ? (
                <View style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                  <LinkButton label={linkDemand ? `About ${latestDemand.demandNo} ✕` : 'Not linked to a demand · link'} tone="text" onPress={() => setLinkDemand((v) => !v)} />
                </View>
              ) : null}
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Write a reply…"
                placeholderTextColor={theme.colors.textFaint}
                multiline
                maxLength={1000}
                style={{ minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.cardFill }}
              />
              {error ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 6 }]}>{error}</Text> : null}
              <View style={{ marginTop: 8 }}>
                <PrimaryButton label="Send Reply" onPress={() => void send()} loading={replySub.pending} disabled={!body.trim()} />
              </View>
            </>
          ) : (
            <>
              <Notice
                tone="warning"
                icon="lock"
                text="Replies are closed: WhatsApp only allows a free-text message within 24 hours of the supplier's last message. Until they write again, use Resend link on the demand to reach them."
              />
              {latestDemand?.demandId ? (
                <View style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                  <LinkButton label={`Open ${latestDemand.demandNo}`} onPress={() => navigation.navigate(Routes.PRODUCTION_WHATSAPP_DEMAND_DETAIL, { demandId: latestDemand.demandId! })} />
                </View>
              ) : null}
              {error ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 6 }]}>{error}</Text> : null}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
