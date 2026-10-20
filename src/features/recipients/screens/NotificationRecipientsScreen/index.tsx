import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getBusinessDate,
  useBranches,
  useClosingRecipients,
  useMessagingProvider,
  useRecentNotificationLogs,
  useUpdateRecipient,
  type NotificationRecipient,
} from '@/api';
import { Routes, type RecipientsStackParamList } from '@/navigation';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen, SearchBar } from '@/shared/ui';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatDisplayTime, includesTerm } from '@/shared/utils';
import { CoverageStrip } from '../../components/CoverageStrip';
import { ProviderBanner } from '../../components/ProviderBanner';
import { RecipientCard } from '../../components/RecipientCard';
import { RecipientFormSheetContent } from '../../components/RecipientFormSheetContent';
import { SendNowSheetContent } from '../../components/SendNowSheetContent';
import { coverageOf, latestLogByRecipient, receivesLine } from '../../utils/recipientRules';

const CACHE_KEY = 'closingRecipients';

/**
 * Notification Recipients — who gets the 2:00 AM closing summary by SMS and/or
 * WhatsApp (Super Admin). A branch recipient gets only that branch's figures;
 * a company recipient gets every summary.
 *
 * Phone numbers are personal data: they are shown here (this screen and its
 * endpoint are super_admin only) but never put into an export or share sheet.
 */
export function NotificationRecipientsScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RecipientsStackParamList>>();
  const formRef = useRef<BottomSheetModal>(null);
  const sendRef = useRef<BottomSheetModal>(null);
  const today = getBusinessDate();

  const recipientsQ = useClosingRecipients();
  const providerQ = useMessagingProvider();
  const branchesQ = useBranches();
  const logsQ = useRecentNotificationLogs();
  const toggle = useUpdateRecipient();

  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search).trim();
  const [editing, setEditing] = useState<NotificationRecipient | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);

  // ── Offline: the last loaded list, read-only.
  const [cached, setCached] = useState<{ data: { recipients: NotificationRecipient[] }; updatedAt: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getCachedResponse<{ recipients: NotificationRecipient[] }>(CACHE_KEY).then((r) => {
      if (!cancelled) setCached(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (recipientsQ.data) void setCachedResponse(CACHE_KEY, recipientsQ.data);
  }, [recipientsQ.data]);
  const showingCache = !recipientsQ.data && !!recipientsQ.error && !!cached;

  const recipients = useMemo(
    () => (showingCache ? cached!.data.recipients : recipientsQ.data?.recipients ?? []),
    [showingCache, cached, recipientsQ.data],
  );
  const branches = useMemo(() => branchesQ.data?.branches ?? [], [branchesQ.data]);
  const activeBranchCount = branches.filter((b) => b.isActive !== false).length;
  const coverage = useMemo(() => coverageOf(branches, recipients), [branches, recipients]);
  const lastLogs = useMemo(() => latestLogByRecipient(logsQ.data?.logs ?? []), [logsQ.data]);
  const live = providerQ.data?.live ?? false;

  const rows = useMemo(
    () =>
      recipients.filter(
        (r) => !term || includesTerm(r.recipientName, term) || includesTerm(r.mobileNumber, term.replace(/^0/, '')) || includesTerm(receivesLine(r), term),
      ),
    [recipients, term],
  );

  const openForm = (r?: NotificationRecipient) => {
    setEditing(r);
    setFormKey((k) => k + 1);
    formRef.current?.present();
  };

  const refresh = () => {
    void recipientsQ.refetch();
    void providerQ.refetch();
    void logsQ.refetch();
    void branchesQ.refetch();
  };

  return (
    <Screen>
      <AppHeader
        title="Notification Recipients"
        subtitle="Who receives the 2:00 AM closing summary. Each branch number gets only that branch's figures."
        actions={[
          { icon: 'list-indent', onPress: () => navigation.navigate(Routes.RECIPIENTS_DELIVERY_LOG), accessibilityLabel: 'Delivery log' },
          ...(showingCache ? [] : [{ icon: 'transfer' as const, onPress: () => sendRef.current?.present(), accessibilityLabel: live ? 'Send summaries now' : 'Log a test send' }]),
        ]}
      />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: theme.spacing.md }}>
            <ProviderBanner provider={providerQ.data} />
            {showingCache ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                Offline · Last updated {formatDisplayTime(new Date(cached!.updatedAt).toISOString())} · read-only
              </Text>
            ) : null}
            {branches.length > 0 ? <CoverageStrip coverage={coverage} /> : null}
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search recipients…" />
            {showingCache ? null : <PrimaryButton label="+ Add Recipient" onPress={() => openForm()} />}
            {recipientsQ.isLoading ? <LoadingSkeleton height={120} /> : null}
            {recipientsQ.error && !showingCache ? <ErrorState message={mapErrorToMessage(recipientsQ.error)} onRetry={refresh} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <RecipientCard
            recipient={item}
            lastLog={lastLogs.get(item.id)}
            toggling={toggle.isPending || showingCache}
            onToggleActive={(active) =>
              toggle.mutate({ id: item.id, input: { active } }, { onError: (e) => Alert.alert('Could Not Update the Recipient', mapErrorToMessage(e)) })
            }
            onEdit={() => (showingCache ? undefined : openForm(item))}
          />
        )}
        ListEmptyComponent={
          !recipientsQ.isLoading && !recipientsQ.error ? (
            <EmptyState
              title={term ? 'No Matches' : 'No Recipients'}
              message={term ? 'Nobody matches this search.' : 'Add who should get each branch’s 2:00 AM closing summary.'}
              actionLabel={term ? undefined : 'Add Recipient'}
              onAction={term ? undefined : () => openForm()}
            />
          ) : undefined
        }
        refreshing={recipientsQ.isRefetching}
        onRefresh={refresh}
      />

      <FormBottomSheet
        ref={formRef}
        title={editing ? 'Edit Recipient' : 'Add Recipient'}
        subtitle={editing?.recipientName}
        onRequestClose={() => formRef.current?.dismiss()}>
        <RecipientFormSheetContent
          key={formKey}
          recipient={editing}
          recipients={recipients}
          branches={branches}
          activeBranchCount={activeBranchCount}
          onClose={() => formRef.current?.dismiss()}
        />
      </FormBottomSheet>
      <FormBottomSheet ref={sendRef} title={live ? 'Send Summaries Now' : 'Log a Test Send'} onRequestClose={() => sendRef.current?.dismiss()} snapPoints={['70%']}>
        <SendNowSheetContent live={live} recipients={recipients} activeBranchCount={activeBranchCount} today={today} onClose={() => sendRef.current?.dismiss()} />
      </FormBottomSheet>
    </Screen>
  );
}
