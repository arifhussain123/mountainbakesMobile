import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useCashTransferDetail } from '@/api';
import type { CashStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { Card, ErrorState, HeroSurface, Icon, InfoBanner, LoadingSkeleton, PhotoViewer, Screen, StatusBadge, type StatusVariant } from '@/shared/ui';
import { BackAppBar, Eyebrow, FLAT_CARD, HERO_TYPE, HeroMini, TYPE, useHeroInk } from '@/features/sales/components';
import { mapErrorToMessage } from '@/shared/helpers';
import { ReportIssueAction } from '@/features/support';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { CashTransfer } from '@/api';
import { isTransferFinal } from '../../calculations';
import { styles } from './styles';

const STATUS_LABEL: Record<CashTransfer['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_VARIANT: Record<CashTransfer['status'], StatusVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

/** "27,900" — the hero's four `mini` figures drop the "Rs." so they fit across a phone. */
const plain = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });

function Row({ label, value, divided }: { label: string; value: string; divided?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, divided ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : null]}>
      <Text style={[TYPE.sm, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[TYPE.label, styles.rowValue, { color: theme.colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** Cash transfer detail (redesign language: back bar, violet total hero) — a single cash transfer's full detail. No edit/withdraw exists for this resource — the only client action after create is wait, or resubmit after rejection. */
export function CashTransferDetailScreen() {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<CashStackParamList, 'CashTransferDetail'>>();
  const { data: transfer, isLoading, error, refetch } = useCashTransferDetail(route.params.transferId);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const { ink: heroInk, muted: heroMuted } = useHeroInk();

  if (isLoading) {
    return (
      <Screen>
        <BackAppBar title="Transfer Detail" />
        <View style={{ padding: 20 }}>
          <LoadingSkeleton height={220} />
        </View>
      </Screen>
    );
  }

  if (error || !transfer) {
    return (
      <Screen>
        <BackAppBar title="Transfer Detail" />
        <View style={{ padding: 20 }}>
          <ErrorState message={error ? mapErrorToMessage(error) : 'Transfer not found.'} onRetry={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  const photo = transfer.attachments[0];

  return (
    <Screen>
      <BackAppBar title={transfer.transferNo} subtitle={`${formatDisplayDate(transfer.date)} · ${formatDisplayTime(transfer.createdAt)}`} />
      <ScrollView contentContainerStyle={styles.body}>
        <HeroSurface style={styles.hero}>
          <Text style={[HERO_TYPE.eyebrow, { color: heroMuted }]}>Total amount</Text>
          <Text style={[HERO_TYPE.amount, { color: heroInk }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatCurrency(transfer.amount)}
          </Text>
          <View style={styles.miniRow}>
            <HeroMini label="Cash" value={plain(transfer.cashAmount)} />
            <HeroMini label="Easypaisa" value={plain(transfer.easypaisaAmount)} />
            <HeroMini label="Bank" value={plain(transfer.bankAmount)} />
            <HeroMini label="Fuel" value={plain(transfer.fuelCharges)} />
          </View>
        </HeroSurface>

        <View style={styles.statusRow}>
          <StatusBadge label={STATUS_LABEL[transfer.status]} variant={STATUS_VARIANT[transfer.status]} />
          {transfer.fuelCharges > 0 ? (
            <Text style={[TYPE.xs, styles.grow, { color: theme.colors.textFaint }]}>Fuel is booked separately as fuel income</Text>
          ) : null}
        </View>

        <Card style={[FLAT_CARD, styles.details]}>
          <Row label="Branch" value={transfer.branchName} />
          {transfer.voucherNo ? <Row label="Voucher" value={transfer.voucherNo} divided /> : null}
        </Card>

        {transfer.note ? (
          <>
            <Eyebrow>Note</Eyebrow>
            <Card style={FLAT_CARD}>
              <Text style={[TYPE.p, { color: theme.colors.text }]}>“{transfer.note}”</Text>
            </Card>
          </>
        ) : null}

        {transfer.status === 'approved' ? (
          <>
            <Eyebrow>Finance review</Eyebrow>
            <InfoBanner kind="ok">
              <Text style={[styles.reviewTitle, { color: theme.colors.success }]}>
                Approved by {transfer.approvedByName ?? 'Finance'}
                {transfer.approvedAt ? ` · ${formatDisplayDate(transfer.approvedAt)}` : ''}
              </Text>
              {transfer.approvalNote ? (
                <Text style={[TYPE.sm, { color: theme.colors.textSecondary, marginTop: 2 }]}>{transfer.approvalNote}</Text>
              ) : null}
            </InfoBanner>
          </>
        ) : null}
        {transfer.status === 'rejected' ? (
          <>
            <Eyebrow>Finance review</Eyebrow>
            <InfoBanner kind="bad">
              <Text style={[styles.reviewTitle, { color: theme.colors.danger }]}>Rejected</Text>
              {transfer.rejectionReason ? (
                <Text style={[TYPE.sm, { color: theme.colors.danger, marginTop: 2 }]}>{transfer.rejectionReason}</Text>
              ) : null}
            </InfoBanner>
          </>
        ) : null}

        {isTransferFinal(transfer.status) ? (
          <View style={styles.finalRow}>
            <Icon name="lock" size={12} color={theme.colors.textFaint} />
            <Text style={[TYPE.xs, styles.grow, { color: theme.colors.textFaint }]}>Final — there is no edit or withdraw for a reviewed transfer.</Text>
          </View>
        ) : (
          <InfoBanner kind="warn" icon="clock">
            Waiting on Finance. A wrong submission is rejected (with a reason) and raised again — it cannot be edited here.
          </InfoBanner>
        )}

        <Eyebrow>Payment photo</Eyebrow>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Payment photo for ${transfer.transferNo}`}
          onPress={() => setPhotoVisible(true)}
          style={[styles.photoFrame, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
          {photo && !photoFailed ? (
            <Image source={{ uri: photo.url }} style={styles.photoImage} resizeMode="cover" onError={() => setPhotoFailed(true)} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Icon name="image" size={28} color={theme.colors.textFaint} />
              <Text style={[TYPE.xs, { color: theme.colors.textFaint, marginTop: 6 }]}>
                {photoFailed ? 'Photo could not load — pull to refresh.' : 'No photo for this transfer.'}
              </Text>
            </View>
          )}
        </Pressable>

        <ReportIssueAction referenceId={transfer.transferNo} />
      </ScrollView>

      <PhotoViewer
        visible={photoVisible}
        uri={photo?.url ?? null}
        accessibilityLabel={`Payment photo for ${transfer.transferNo}`}
        onClose={() => setPhotoVisible(false)}
        onImageError={() => void refetch()}
      />
    </Screen>
  );
}
