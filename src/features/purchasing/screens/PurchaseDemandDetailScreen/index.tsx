import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useAddPurchaseNote,
  useCancelPurchaseDemand,
  useDecidePurchaseBill,
  useDecidePurchaseQuotation,
  usePurchaseDemand,
  usePurchasingStatus,
  useResendPurchaseLink,
  useRetryPurchaseMessage,
  type Quotation,
  type SupplierBill,
  type WhatsAppMessage,
} from '@/api';
import { Routes, type ProductionWhatsAppStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { LinkButton, Notice, ReasonModal } from '../../components';
import { useSubmission } from '../../hooks';
import { connectionInfo } from '../../utils';
import { BillApproveModal, CreditModal, DeliveryModal, PaymentModal } from './modals';
import {
  BillsSection,
  DeliverySection,
  ItemsSection,
  MessagesSection,
  OverviewCard,
  PaymentsSection,
  QuotationsSection,
  ReceiptSection,
  TimelineSection,
} from './sections';
import { styles } from './styles';

type Nav = NativeStackNavigationProp<ProductionWhatsAppStackParamList>;
type DetailRoute = RouteProp<ProductionWhatsAppStackParamList, typeof Routes.PRODUCTION_WHATSAPP_DEMAND_DETAIL>;

/** Which reason prompt is open, and for what. */
type ReasonPrompt =
  | { kind: 'cancel' }
  | { kind: 'note' }
  | { kind: 'quotation'; decision: 'request_changes' | 'reject'; quotation: Quotation }
  | { kind: 'billReject'; bill: SupplierBill };

type FormOpen = 'delivery' | 'payment' | 'credit' | null;

/** Mentions the demand's Resend link — the server's hint that a retry cannot carry the masked link again. */
const NEEDS_RESEND = /resend link/i;

/**
 * One purchase demand, end to end: items, every quotation version
 * (requested vs offered), bills with their differences, delivery, goods
 * receipt, payment and credit, messages and the timeline.
 *
 * Which buttons show is `detail.actions`, computed by the server — never
 * guessed from the status. Every decision re-checks on the server under the
 * demand's row lock; a stale screen gets a 409 and a sentence, and the demand
 * is refetched so the screen shows where it is now.
 */
export function PurchaseDemandDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  const { demandId } = useRoute<DetailRoute>().params;
  const demandQ = usePurchaseDemand(demandId);
  const statusQ = usePurchasingStatus();

  const decideQuotation = useDecidePurchaseQuotation();
  const decideBill = useDecidePurchaseBill();
  const cancel = useCancelPurchaseDemand();
  const addNote = useAddPurchaseNote();
  const resend = useResendPurchaseLink();
  const retry = useRetryPurchaseMessage();

  // Decisions share one in-flight guard (no two at once); endpoints with
  // replay protection keep their own key.
  const actionSub = useSubmission('purchase_action');
  const resendSub = useSubmission('purchase_resend_link');
  const retrySub = useSubmission('purchase_message_retry');

  const [prompt, setPrompt] = useState<ReasonPrompt | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<FormOpen>(null);
  const [billToApprove, setBillToApprove] = useState<SupplierBill | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const d = demandQ.data;
  const back = { icon: 'chevron-left' as const, onPress: () => navigation.goBack(), accessibilityLabel: 'Back' };
  const refresh = useCallback(() => {
    void demandQ.refetch();
  }, [demandQ]);

  if (!d) {
    return (
      <Screen>
        <AppHeader title="Demand" actions={[back]} />
        <View style={{ padding: theme.spacing.lg, gap: 10 }}>
          {demandQ.error ? (
            <ErrorState message={mapErrorToMessage(demandQ.error)} onRetry={refresh} />
          ) : (
            <>
              <LoadingSkeleton height={160} />
              <LoadingSkeleton height={120} />
            </>
          )}
        </View>
      </Screen>
    );
  }

  const busy = actionSub.pending || resendSub.pending;
  const testMode = statusQ.data ? connectionInfo(statusQ.data).isTestMode : false;
  const tell = (text: string, tone: 'success' | 'danger' = 'success') => setNotice({ tone, text });
  const fail = (title: string, message: string) => Alert.alert(title, message);

  /** Run a decision; on success close the prompt and say so, on failure keep the prompt open with the server's sentence. */
  const runAction = async (body: unknown, call: () => Promise<unknown>, success: string, inPrompt: boolean) => {
    setPromptError(null);
    const outcome = await actionSub.run(body, call);
    if (outcome.kind === 'done') {
      setPrompt(null);
      tell(success);
    } else if (outcome.kind === 'failed') {
      if (inPrompt && !outcome.conflict) setPromptError(outcome.message);
      else {
        setPrompt(null);
        fail(outcome.conflict ? 'This demand has changed' : 'Could not save', outcome.message);
      }
    }
  };

  const doResend = () => {
    Alert.alert(
      'Resend link?',
      `${d.supplierName} gets a fresh link on WhatsApp; the previous link stops working.${testMode ? '\n\nTest mode, no real WhatsApp messages are sent.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resend',
          onPress: async () => {
            const outcome = await resendSub.run({ id: d.id }, (key) => resend.mutateAsync({ id: d.id, idempotencyKey: key }));
            if (outcome.kind === 'done') tell('A fresh link was queued to the supplier.');
            else if (outcome.kind === 'failed') fail('Could not resend the link', outcome.message);
          },
        },
      ],
    );
  };

  const doRetry = async (m: WhatsAppMessage) => {
    setRetryingId(m.id);
    const outcome = await retrySub.run({ id: m.id }, () => retry.mutateAsync(m.id));
    setRetryingId(null);
    if (outcome.kind === 'done') tell('Message queued again.');
    else if (outcome.kind === 'failed') {
      if (outcome.conflict && NEEDS_RESEND.test(outcome.message) && d.actions.resendLink) {
        Alert.alert('Cannot retry this message', outcome.message, [
          { text: 'Close', style: 'cancel' },
          { text: 'Resend link', onPress: doResend },
        ]);
      } else fail('Could not retry', outcome.message);
    }
  };

  const approveQuotation = (q: Quotation) =>
    Alert.alert(
      `Approve version ${q.version}?`,
      `${formatCurrency(q.total)} from ${d.supplierName}. The supplier is then asked for their bill against exactly this version.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () =>
            void runAction(
              { q: q.id, decision: 'approve' },
              () => decideQuotation.mutateAsync({ id: d.id, quotationId: q.id, input: { version: q.version, decision: 'approve' } }),
              `Quotation v${q.version} approved.`,
              false,
            ),
        },
      ],
    );

  const approveBill = (b: SupplierBill) => {
    if (b.differsFromQuotation) {
      setBillToApprove(b);
      return;
    }
    Alert.alert(`Approve bill ${b.supplierBillNo}?`, `${formatCurrency(b.grandTotal)} becomes payable to ${d.supplierName}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () =>
          void runAction(
            { b: b.id, decision: 'approve' },
            () => decideBill.mutateAsync({ id: d.id, billId: b.id, input: { decision: 'approve' } }),
            `Bill ${b.supplierBillNo} approved.`,
            false,
          ),
      },
    ]);
  };

  const submitPrompt = (text: string) => {
    if (!prompt) return;
    switch (prompt.kind) {
      case 'cancel':
        void runAction({ cancel: text }, () => cancel.mutateAsync({ id: d.id, reason: text }), `${d.demandNo} cancelled.`, true);
        break;
      case 'note':
        void runAction({ note: text }, () => addNote.mutateAsync({ id: d.id, note: text }), 'Note added to the timeline.', true);
        break;
      case 'quotation': {
        const q = prompt.quotation;
        void runAction(
          { q: q.id, decision: prompt.decision, text },
          () => decideQuotation.mutateAsync({ id: d.id, quotationId: q.id, input: { version: q.version, decision: prompt.decision, reason: text } }),
          prompt.decision === 'reject' ? `Quotation v${q.version} rejected.` : `Changes requested on v${q.version}; the supplier gets a fresh link.`,
          true,
        );
        break;
      }
      case 'billReject': {
        const b = prompt.bill;
        void runAction(
          { b: b.id, decision: 'reject', text },
          () => decideBill.mutateAsync({ id: d.id, billId: b.id, input: { decision: 'reject', reason: text } }),
          `Bill ${b.supplierBillNo} rejected; the supplier gets a link for a corrected one.`,
          true,
        );
        break;
      }
    }
  };

  const promptCopy = (() => {
    if (!prompt) return null;
    switch (prompt.kind) {
      case 'cancel':
        return { title: `Cancel ${d.demandNo}?`, message: 'The supplier is told and their link stops working. This cannot be undone.', confirm: 'Cancel Demand', label: 'Reason', min: 3 };
      case 'note':
        return { title: 'Internal note', message: undefined, confirm: 'Add Note', label: 'Note', min: 1 };
      case 'quotation':
        return prompt.decision === 'reject'
          ? { title: `Reject version ${prompt.quotation.version}?`, message: 'Rejecting closes this demand and the supplier link. This cannot be undone.', confirm: 'Reject Quotation', label: 'Reason', min: 3 }
          : { title: `Request changes on v${prompt.quotation.version}`, message: 'The supplier sees your reason and gets a link to send a revised quotation.', confirm: 'Request Changes', label: 'What should change', min: 3 };
      case 'billReject':
        return { title: `Reject bill ${prompt.bill.supplierBillNo}?`, message: 'Nothing becomes payable; the supplier is asked for a corrected bill.', confirm: 'Reject Bill', label: 'Reason', min: 3 };
    }
  })();

  const a = d.actions;
  const conversationId = d.messages[0]?.conversationId ?? null;
  const openConversation = conversationId
    ? () =>
        navigation.navigate(Routes.PRODUCTION_WHATSAPP_THREAD, {
          conversationId,
          title: d.supplierName,
          windowOpenUntil: null,
          supplierId: d.supplierId,
        })
    : null;

  return (
    <Screen>
      <AppHeader title={d.demandNo} subtitle={d.supplierName} actions={[back, { icon: 'refresh', onPress: refresh, accessibilityLabel: 'Refresh' }]} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
        refreshControl={<RefreshControl refreshing={demandQ.isRefetching} onRefresh={refresh} tintColor={theme.colors.primary} />}>
        <View style={styles.topActions}>
          {a.edit || a.verify || a.send ? (
            <LinkButton label={a.send ? 'Review & send' : 'Edit · verify · send'} icon="pencil" onPress={() => navigation.navigate(Routes.PRODUCTION_WHATSAPP_DEMAND_FORM, { demandId: d.id })} disabled={busy} />
          ) : null}
          {a.resendLink ? <LinkButton label="Resend link" icon="send" onPress={doResend} disabled={busy} /> : null}
          <LinkButton label="Add note" icon="pencil" tone="text" onPress={() => setPrompt({ kind: 'note' })} disabled={busy} />
          {a.cancel ? <LinkButton label="Cancel demand" icon="close" tone="danger" onPress={() => setPrompt({ kind: 'cancel' })} disabled={busy} /> : null}
        </View>

        {notice ? <Notice text={notice.text} tone={notice.tone} icon={notice.tone === 'success' ? 'check' : 'warning'} /> : null}
        {demandQ.error ? <Notice text={`Showing the last loaded version: ${mapErrorToMessage(demandQ.error)}`} tone="danger" icon="warning" /> : null}
        <View style={{ height: notice || demandQ.error ? theme.spacing.md : 0 }} />

        <OverviewCard d={d} />
        <ItemsSection d={d} />
        <QuotationsSection
          d={d}
          busy={busy}
          onEnter={a.enterQuotation ? () => navigation.navigate(Routes.PRODUCTION_WHATSAPP_QUOTATION_ENTRY, { demandId: d.id }) : null}
          actions={
            a.decideQuotation
              ? {
                  onApprove: approveQuotation,
                  onRequestChanges: (q) => setPrompt({ kind: 'quotation', decision: 'request_changes', quotation: q }),
                  onReject: (q) => setPrompt({ kind: 'quotation', decision: 'reject', quotation: q }),
                }
              : null
          }
        />
        <BillsSection
          d={d}
          busy={busy}
          onEnter={a.enterBill ? () => navigation.navigate(Routes.PRODUCTION_WHATSAPP_BILL_ENTRY, { demandId: d.id }) : null}
          actions={a.decideBill ? { onApprove: approveBill, onReject: (b) => setPrompt({ kind: 'billReject', bill: b }) } : null}
        />
        <DeliverySection d={d} onEdit={a.saveDelivery ? () => setFormOpen('delivery') : null} />
        <ReceiptSection d={d} onReceive={a.receive ? () => navigation.navigate(Routes.PRODUCTION_WHATSAPP_RECEIPT, { demandId: d.id }) : null} />
        <PaymentsSection d={d} onPay={a.recordPayment ? () => setFormOpen('payment') : null} onCredit={a.requestCredit ? () => setFormOpen('credit') : null} />
        <MessagesSection messages={d.messages} onRetry={(m) => void doRetry(m)} retryingId={retryingId} onOpenConversation={a.message ? openConversation : null} />
        <TimelineSection d={d} />
      </ScrollView>

      <ReasonModal
        visible={prompt !== null}
        title={promptCopy?.title ?? ''}
        message={promptCopy?.message}
        label={promptCopy?.label}
        confirmLabel={promptCopy?.confirm ?? 'Save'}
        minLength={promptCopy?.min}
        submitting={actionSub.pending}
        error={promptError}
        onClose={() => {
          setPrompt(null);
          setPromptError(null);
        }}
        onSubmit={submitPrompt}
      />
      <DeliveryModal
        visible={formOpen === 'delivery'}
        detail={d}
        onClose={() => setFormOpen(null)}
        onDone={(m) => {
          setFormOpen(null);
          tell(m);
        }}
      />
      <PaymentModal
        visible={formOpen === 'payment'}
        detail={d}
        onClose={() => setFormOpen(null)}
        onDone={(m) => {
          setFormOpen(null);
          tell(m);
        }}
      />
      <CreditModal
        visible={formOpen === 'credit'}
        detail={d}
        onClose={() => setFormOpen(null)}
        onDone={(m) => {
          setFormOpen(null);
          tell(m);
        }}
      />
      <BillApproveModal
        visible={billToApprove !== null}
        detail={d}
        bill={billToApprove}
        onClose={() => setBillToApprove(null)}
        onDone={(m) => {
          setBillToApprove(null);
          tell(m);
        }}
      />
    </Screen>
  );
}
