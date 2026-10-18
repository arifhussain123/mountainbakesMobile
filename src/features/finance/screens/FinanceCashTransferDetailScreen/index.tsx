import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  financeCan,
  useFinanceCashTransfer,
  useFinanceCashTransfers,
  useFinanceDailySales,
  type CashTransfer,
  type CashTransferStatus,
} from '@/api';
import { ChannelBreakdown } from '@/features/cash/components';
import { Routes, navigateToRecord, openNewQuery, type FinanceCashTransfersStackParamList } from '@/navigation';
import { useHideTabBarOnFocus } from '@/navigation/tabBar/useTabBarVisibility';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, Icon, LoadingSkeleton, PhotoViewer, Screen, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { approvalPostings, useCashTransferDecision } from '../../hooks/useCashTransferDecision';
import {
  NOTE_CHANNEL_LABEL,
  NOTE_CHANNELS,
  noteAmountMismatches,
  noteMentionsUnrecorded,
  parseTransferNote,
  type ParsedNote,
} from '../../utils/cashTransferNote';
import { dailySalesWindow, findShareMatch, shareMatchLabel, shortDay, submittedAt, type ShareMatch } from '../../utils/cashTransferMatch';
import { styles } from './styles';

/**
 * mountainbakesFinance.html screen 03's own detail — the record, its photo,
 * how it stands against the day's Company Share, and the decision.
 *
 * The matching panel reads; it never decides. The share and the pairing are
 * Daily Closing's (`cashTransferMatch.ts`), the note reading is a hint
 * (`cashTransferNote.ts`), and when either looks wrong the approval still goes
 * ahead if Finance confirms — the warning is on the confirmation, not a lock.
 *
 * There is no "send back for correction": the API has only pending, approved
 * and rejected, and a rejected transfer is raised again by the branch.
 */

const STATUS_VARIANT: Record<CashTransferStatus, StatusVariant> = { pending: 'warning', approved: 'success', rejected: 'danger' };
const STATUS_LABEL: Record<CashTransferStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
const MATCH_VARIANT: Record<ShareMatch['kind'], StatusVariant> = { matches: 'success', over: 'warning', short: 'danger', none: 'neutral' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={{ marginTop: theme.spacing.lg }}>
      <Text accessibilityRole="header" style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>
        {title.toUpperCase()}
      </Text>
      <Card>{children}</Card>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string | null | undefined; strong?: boolean }) {
  const theme = useAppTheme();
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: strong ? '800' : '600', textAlign: 'right', flexShrink: 1 }]}>{value}</Text>
    </View>
  );
}

function channelsText(amounts: { channel: (typeof NOTE_CHANNELS)[number]; amount: number; truncated?: boolean }[]): string {
  return amounts.map((a) => `${NOTE_CHANNEL_LABEL[a.channel]} ${a.amount.toLocaleString('en-US')}${a.truncated ? '… (cut off)' : ''}`).join(' · ');
}

/** "Note: Cash 24,050 · Easypaisa 7,150 (total 31,200). Recorded: Cash 23,720 · Easypaisa 0." */
function noteComparison(t: CashTransfer, parsed: ParsedNote): string | null {
  if (parsed.amounts.length === 0) return null;
  const recorded = parsed.amounts.map((a) => ({
    channel: a.channel,
    amount: a.channel === 'cash' ? t.cashAmount : a.channel === 'easypaisa' ? t.easypaisaAmount : t.bankAmount,
  }));
  const total = parsed.total !== null && parsed.amounts.length > 1 ? ` (total ${parsed.total.toLocaleString('en-US')})` : '';
  return `Note: ${channelsText(parsed.amounts)}${total}. Recorded: ${channelsText(recorded)}.`;
}

function DecisionButton({ label, color, onPress, busy, disabled }: { label: string; color: string; onPress: () => void; busy: boolean; disabled: boolean }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[styles.decisionButton, { backgroundColor: color, borderRadius: theme.radii.md, opacity: disabled ? 0.5 : 1 }]}>
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[theme.typography.cardTitle, { color: '#FFFFFF', fontWeight: '700' }]}>{label}</Text>}
    </Pressable>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.linkRow}>
      <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '600' }]}>{label}</Text>
      <Icon name="chevron-right" size={14} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

export function FinanceCashTransferDetailScreen() {
  const theme = useAppTheme();
  useHideTabBarOnFocus();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<FinanceCashTransfersStackParamList, 'FinanceCashTransferDetail'>>();
  const { transferId } = route.params;
  const role = useAuthStore((state) => state.user?.role);
  const canApprove = financeCan(role, 'approve');

  const { data: transfer, isLoading, error, refetch } = useFinanceCashTransfer(transferId);
  const decision = useCashTransferDecision(transferId);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);

  const window = transfer ? dailySalesWindow([transfer]) : null;
  const salesQ = useFinanceDailySales(window && transfer ? { ...window, branchId: transfer.branchId } : null);
  // Every deposit the branch dated on the same business day — "1 deposit already made: CT-000055".
  const sameDayQ = useFinanceCashTransfers(
    { branchId: transfer?.branchId, from: transfer?.date, to: transfer?.date, sortBy: 'createdAt', sortDir: 'asc', limit: 10 },
    { enabled: !!transfer },
  );

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Cash Transfer" />
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton height={200} />
        </View>
      </Screen>
    );
  }
  if (error || !transfer) {
    return (
      <Screen>
        <AppHeader title="Cash Transfer" />
        <View style={{ padding: theme.spacing.lg }}>
          <ErrorState message={error ? mapErrorToMessage(error) : 'Not found'} onRetry={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  const t = transfer;
  const photo = t.attachments[0];
  const parsed = parseTransferNote(t.note);
  const unrecorded = noteMentionsUnrecorded(t, parsed);
  const mismatched = noteAmountMismatches(t, parsed);
  const comparison = noteComparison(t, parsed);
  const match = salesQ.data ? findShareMatch(t, salesQ.data.records) : null;
  const sameDayOthers = (sameDayQ.data?.transfers ?? []).filter((o) => o.id !== t.id && o.status !== 'rejected');
  const postings = approvalPostings(t);

  const warnings = [
    match && match.kind !== 'matches' ? `Share check: ${shareMatchLabel(match)}.` : null,
    ...unrecorded.map((c) => `The note mentions ${NOTE_CHANNEL_LABEL[c]}, but ${NOTE_CHANNEL_LABEL[c]} is recorded as Rs. 0.`),
    mismatched.length > 0 && unrecorded.length === 0 ? `The note's ${mismatched.map((c) => NOTE_CHANNEL_LABEL[c]).join(' and ')} amount differs from the record.` : null,
  ].filter((w): w is string => !!w);

  const handleOutcome = async (run: Promise<Awaited<ReturnType<typeof decision.approve>>>, verb: string) => {
    const outcome = await run;
    if (outcome.kind === 'done') {
      Alert.alert(outcome.decision === 'approved' ? 'Approved' : 'Rejected', outcome.decision === 'approved' ? `${t.transferNo} approved. The receipts are in the Daily Ledger.` : `${t.transferNo} rejected. The branch has been told.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else if (outcome.kind === 'already-decided') {
      // Someone else decided first; the transfer refetches and shows their decision.
      Alert.alert('Already Decided', outcome.message);
      void refetch();
    } else if (outcome.kind === 'failed') {
      Alert.alert(`Could Not ${verb}`, outcome.message);
    }
  };

  const confirmApprove = () => {
    const lines = postings.map((p) => `• RV for ${formatCurrency(p.amount)} to ${p.head} (${p.code})`).join('\n');
    const warn = warnings.length > 0 ? `\n\nCheck before approving:\n${warnings.map((w) => `• ${w}`).join('\n')}` : '';
    Alert.alert('Approve Transfer?', `This posts to the Daily Ledger:\n${lines}${warn}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: warnings.length > 0 ? 'Approve Anyway' : 'Approve', onPress: () => void handleOutcome(decision.approve(note), 'Approve') },
    ]);
  };

  const confirmReject = () => {
    if (reason.trim().length < 3) {
      Alert.alert('Reason Required', 'Say why this transfer is refused (at least 3 characters). The branch sees it.');
      return;
    }
    Alert.alert('Reject Transfer?', `Reject ${formatCurrency(t.amount)} from ${t.branchName}? Nothing is posted, and the branch raises it again if needed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => void handleOutcome(decision.reject(reason), 'Reject') },
    ]);
  };

  return (
    <Screen>
      <AppHeader title={t.transferNo} subtitle={t.branchName} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }} keyboardShouldPersistTaps="handled">
        {/* ── 1. Transfer ── */}
        <Card>
          <View style={styles.headRow}>
            <Text style={[theme.typography.screenTitle, { color: theme.colors.text, flexShrink: 1 }]} accessibilityLabel={`Total ${t.amount} rupees`}>
              {formatCurrency(t.amount)}
            </Text>
            <StatusBadge label={STATUS_LABEL[t.status]} variant={STATUS_VARIANT[t.status]} />
          </View>
          <ChannelBreakdown cashAmount={t.cashAmount} easypaisaAmount={t.easypaisaAmount} bankAmount={t.bankAmount} fuelCharges={t.fuelCharges} />
          {t.fuelCharges > 0 ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
              Fuel {formatCurrency(t.fuelCharges)} is booked separately as fuel income, not part of the Total.
            </Text>
          ) : null}
          <View style={{ marginTop: theme.spacing.md }}>
            <Row label="Transfer ID" value={t.transferNo} />
            <Row label="Branch" value={t.branchName} />
            <Row label="Business date" value={shortDay(t.date)} />
            <Row label="Submitted" value={`${submittedAt(t.createdAt)}${t.createdByName ? ` by ${t.createdByName}` : ''}`} />
            <Row label="Vouchers" value={t.voucherNo} />
            <Row label={t.status === 'rejected' ? 'Rejected by' : 'Approved by'} value={t.approvedByName} />
            <Row label="Approval note" value={t.approvalNote} />
            <Row label="Rejection reason" value={t.rejectionReason} />
          </View>
          {t.note ? (
            <View style={[styles.noteBox, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm }]}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>NOTE</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 2 }]}>{t.note}</Text>
            </View>
          ) : null}
        </Card>

        {/* ── 2. Photo ── */}
        <Section title="Photo">
          {photo ? (
            <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Payment photo for ${t.transferNo}. Tap to zoom`} onPress={() => setPhotoOpen(true)}>
              <Image source={{ uri: photo.url }} style={[styles.photo, { borderRadius: theme.radii.md }]} resizeMode="cover" />
            </Pressable>
          ) : (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No photo attached.</Text>
          )}
        </Section>

        {/* ── 3. Matching ── */}
        <Section title="Matching">
          {salesQ.isLoading ? <LoadingSkeleton height={80} /> : null}
          {salesQ.error ? <ErrorState message={mapErrorToMessage(salesQ.error)} onRetry={() => void salesQ.refetch()} /> : null}
          {match ? (
            <View>
              <View style={styles.headRow}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>This deposit vs share</Text>
                <StatusBadge label={shareMatchLabel(match)} variant={MATCH_VARIANT[match.kind]} />
              </View>
              {match.day ? (
                <>
                  <Row label="Sales day" value={`${shortDay(match.day.businessDate)}${match.day.reconciliation.match === 'nearest' ? ' · nearest deposit' : ' · same amount'}`} />
                  <Row label="Total Sale" value={formatCurrency(match.day.autoTotalSale)} />
                  <Row label={`Company Share (${match.day.companySharePct}%)`} value={formatCurrency(match.day.companyShare)} strong />
                  <Row label="Deposited for that day" value={formatCurrency(match.deposited)} />
                  <Row
                    label="Difference"
                    value={match.kind === 'matches' ? 'None' : `${formatCurrency(Math.abs(match.difference))} ${match.kind}`}
                    strong
                  />
                  {match.otherDeposits.length > 0 ? (
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                      Also set against that day: {match.otherDeposits.map((d) => `${d.transferNo} (${formatCurrency(d.amount)})`).join(', ')}
                    </Text>
                  ) : null}
                  {match.day.reconciliation.provisional ? (
                    <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: 4 }]}>The day's record is still open, so its share can still change.</Text>
                  ) : null}
                </>
              ) : (
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                  Daily Closing has not set this deposit against any sales day between {shortDay(window!.from)} and {shortDay(window!.to)}.
                </Text>
              )}
            </View>
          ) : null}

          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: theme.spacing.sm }]}>
            {sameDayQ.isLoading
              ? 'Checking other deposits that day…'
              : sameDayOthers.length === 0
                ? `No other deposit dated ${shortDay(t.date)}.`
                : `${sameDayOthers.length} other ${sameDayOthers.length === 1 ? 'deposit' : 'deposits'} dated ${shortDay(t.date)}: ${sameDayOthers.map((o) => `${o.transferNo} (${formatCurrency(o.amount)}, ${STATUS_LABEL[o.status].toLowerCase()})`).join(', ')}`}
          </Text>

          {comparison ? (
            <View style={[styles.noteBox, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm }]}>
              <Text style={[theme.typography.bodySmall, { color: unrecorded.length > 0 || mismatched.length > 0 ? theme.colors.warning : theme.colors.text }]}>{comparison}</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4 }]}>Read from the note — a hint only; it changes nothing.</Text>
            </View>
          ) : unrecorded.length > 0 ? (
            <View style={[styles.noteBox, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm }]}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.warning }]}>
                The note mentions {unrecorded.map((c) => NOTE_CHANNEL_LABEL[c]).join(' and ')}, recorded as Rs. 0.
              </Text>
            </View>
          ) : null}
        </Section>

        {/* ── 4. Actions ── */}
        {t.status === 'pending' && canApprove ? (
          <Section title="Decision">
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>APPROVAL NOTE (OPTIONAL)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={500}
              placeholder="Optional note"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
            />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>REASON (REQUIRED TO REJECT)</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              maxLength={500}
              placeholder="Why is this transfer refused?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              style={[styles.input, styles.inputMulti, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
            />
            {warnings.length > 0 ? (
              <Text accessibilityRole="alert" style={[theme.typography.label, { color: theme.colors.warning, marginTop: theme.spacing.sm }]}>
                {warnings.join(' ')} You can still approve.
              </Text>
            ) : null}
            <View style={styles.actionsRow}>
              <DecisionButton label="Reject" color={theme.colors.danger} onPress={confirmReject} busy={decision.pending === 'reject'} disabled={decision.pending === 'approve'} />
              <DecisionButton label="Approve" color={theme.colors.success} onPress={confirmApprove} busy={decision.pending === 'approve'} disabled={decision.pending === 'reject'} />
            </View>
          </Section>
        ) : null}

        {/* ── 5. Links ── */}
        <Section title="Related">
          <LinkRow label="Daily Closing (Daily Sale Record)" onPress={() => navigateToRecord(Routes.FINANCE_CLOSING_STACK, {})} />
          {t.voucherNo ? <LinkRow label={`Daily Ledger · ${t.voucherNo}`} onPress={() => navigateToRecord(Routes.FINANCE_LEDGER_TAB, {})} /> : null}
          <LinkRow label="Audit Trail" onPress={() => navigateToRecord(Routes.FINANCE_AUDIT_TRAIL_STACK, {})} />
          <LinkRow label="Report an issue" onPress={() => openNewQuery(t.transferNo)} />
        </Section>
      </ScrollView>

      <PhotoViewer visible={photoOpen && !!photo} uri={photo?.url ?? null} accessibilityLabel={`Payment photo for ${t.transferNo}`} onClose={() => setPhotoOpen(false)} />
    </Screen>
  );
}
