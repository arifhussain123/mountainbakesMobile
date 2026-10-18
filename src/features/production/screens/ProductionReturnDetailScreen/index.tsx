import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useProductionReturns, useReviewProductionReturn } from '@/api';
import type { ProductionReturnsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, PhotoViewer, PrimaryButton, Screen, SecondaryButton, StatusBadge } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import type { ProductionReturn, ProductionReturnDisposition } from '@/api';
import { styles } from './styles';
import { useHideTabBarOnFocus } from '@/navigation/tabBar/useTabBarVisibility';

const STATUS_LABEL: Record<ProductionReturn['status'], string> = {
  pending: 'Awaiting Review',
  accepted: 'Approved',
  rejected: 'Rejected',
  returned: 'Sent Back',
};

const DISPOSITION_OPTIONS: { value: ProductionReturnDisposition; label: string }[] = [
  { value: 'saleable', label: 'Saleable' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'expired', label: 'Expired' },
];

/** mountainbakesProduction.html screen 10's own detail — approve, reject, or send back. */
export function ProductionReturnDetailScreen() {
  const theme = useAppTheme();
  useHideTabBarOnFocus();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ProductionReturnsStackParamList, 'ProductionReturnDetail'>>();
  const { returnId } = route.params;

  const { data, refetch } = useProductionReturns();
  const item = useMemo(() => data?.returns.find((r) => r.id === returnId), [data, returnId]);

  const review = useReviewProductionReturn();
  const [disposition, setDisposition] = useState<ProductionReturnDisposition>('saleable');
  const [dispositionNote, setDispositionNote] = useState('');
  const [photoVisible, setPhotoVisible] = useState(false);

  if (!item) {
    return (
      <Screen>
        <AppHeader title="Return Detail" />
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, padding: theme.spacing.lg }]}>
          This return is no longer in the list — pull to refresh Product Returns and reopen it.
        </Text>
      </Screen>
    );
  }

  const noteRequired = disposition !== 'saleable';
  const canApprove = !noteRequired || dispositionNote.trim().length > 0;

  const handleApprove = () => {
    review.mutate(
      { id: item.id, input: { status: 'accepted', disposition, dispositionNote: noteRequired ? dispositionNote.trim() : undefined } },
      { onSuccess: () => navigation.goBack(), onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)) },
    );
  };

  const handleReject = () => {
    Alert.alert('Reject Return', `Reject ${item.qty} × ${item.productName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () =>
          review.mutate(
            { id: item.id, input: { status: 'rejected' } },
            { onSuccess: () => navigation.goBack(), onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)) },
          ),
      },
    ]);
  };

  const handleSendBack = () => {
    Alert.alert('Send Back to Branch', 'The branch will need to correct and resubmit this return.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Back',
        onPress: () =>
          review.mutate(
            { id: item.id, input: { status: 'returned' } },
            { onSuccess: () => navigation.goBack(), onError: (e) => Alert.alert('Could Not Send Back', mapErrorToMessage(e)) },
          ),
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader title={item.productName} subtitle={item.branchName} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={styles.row}>
          <StatusBadge
            label={STATUS_LABEL[item.status] ?? item.status}
            variant={item.status === 'accepted' ? 'success' : item.status === 'pending' ? 'warning' : item.status === 'rejected' ? 'danger' : 'neutral'}
          />
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>× {item.qty}</Text>
        </View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 8 }]}>
          {formatDisplayDate(item.date)} · {item.source === 'branch' ? 'Raised by the branch' : 'Recorded by Production'}
        </Text>

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>REASON</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{item.reason || '—'}</Text>

        {item.photo ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PHOTO</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open return photo"
              onPress={() => setPhotoVisible(true)}
              style={{ marginTop: 6, aspectRatio: 1, maxWidth: 220, borderRadius: theme.radii.md, overflow: 'hidden' }}>
              <Image source={{ uri: item.photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => void refetch()} />
            </Pressable>
          </View>
        ) : null}

        {item.status === 'pending' ? (
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>
              DISPOSITION (IF APPROVING)
            </Text>
            <View style={[styles.chipsRow, { marginTop: 6 }]}>
              {DISPOSITION_OPTIONS.map((option) => {
                const active = option.value === disposition;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setDisposition(option.value)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border },
                    ]}>
                    <Text style={[theme.typography.bodySmall, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {noteRequired ? (
              <TextInput
                value={dispositionNote}
                onChangeText={setDispositionNote}
                placeholder="Say why the stock is damaged or expired"
                placeholderTextColor={theme.colors.textSecondary}
                style={[styles.input, { marginTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
              />
            ) : null}

            <View style={styles.actionsRow}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Reject" onPress={handleReject} loading={review.isPending} />
              </View>
              {item.source === 'branch' ? (
                <View style={{ flex: 1 }}>
                  <SecondaryButton label="Send Back" onPress={handleSendBack} loading={review.isPending} />
                </View>
              ) : null}
              <View style={{ flex: 1.2 }}>
                <PrimaryButton label="Approve" onPress={handleApprove} loading={review.isPending} disabled={!canApprove} />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <PhotoViewer
        visible={photoVisible}
        uri={item.photo?.url ?? null}
        accessibilityLabel={`Return photo of ${item.productName}`}
        onClose={() => setPhotoVisible(false)}
        onImageError={() => void refetch()}
      />
    </Screen>
  );
}
