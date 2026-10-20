import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import {
  useApproveSupplierPayment,
  useDecideSupplierCredit,
  useRejectSupplierPayment,
  useReverseSupplierPayment,
  useSupplierCreditPages,
  useSupplierPaymentBalances,
  useSupplierPaymentHeads,
  useSupplierPaymentPages,
  type SupplierCredit,
  type SupplierCreditStatus,
  type SupplierPayment,
  type SupplierPaymentStatus,
} from '@/api';
import {
  CREDIT_STATUS_LABEL,
  CREDIT_STATUS_VARIANT,
  FormModal,
  LinkButton,
  Notice,
  ReasonModal,
  Row,
  SUPPLIER_PAYMENT_STATUS_LABEL,
  SUPPLIER_PAYMENT_STATUS_VARIANT,
  parseMoney,
  useSubmission,
} from '@/features/purchasing';
import { openDrawer } from '@/navigation';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, Dropdown, EmptyState, ErrorState, FilterChipRow, LoadingSkeleton, Screen, SearchBar, StatusBadge, TextField, type DropdownOption, type FilterChipOption } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { useFinanceCan } from '../../hooks/useFinanceCan';
import { styles } from './styles';

type Tab = 'payments' | 'credits' | 'balances';
type PaymentFilter = SupplierPaymentStatus | 'all';
type CreditFilter = SupplierCreditStatus | 'all';

const PAYMENT_FILTERS: FilterChipOption<PaymentFilter>[] = [
  { value: 'pending_approval', label: 'Waiting' },
  { value: 'posted', label: 'Posted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reversed', label: 'Reversed' },
  { value: 'all', label: 'All' },
];
const CREDIT_FILTERS: FilterChipOption<CreditFilter>[] = [
  { value: 'pending_approval', label: 'Waiting' },
  { value: 'active', label: 'Active' },
  { value: 'settled', label: 'Settled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];
const METHOD_LABEL: Record<SupplierPayment['method'], string> = { cash: 'Cash', easypaisa: 'Easypaisa', bank: 'Bank' };
/** The server's default head when none is chosen (`finance.service.ts`). */
const DEFAULT_HEAD = '__default__';

type Prompt = { kind: 'rejectPayment' | 'reversePayment'; payment: SupplierPayment } | { kind: 'rejectCredit'; credit: SupplierCredit };

/**
 * Finance → Supplier Payments: what Production recorded or requested from
 * WhatsApp Purchasing, waiting for Finance. Only an approval here posts to
 * the book (a PV- voucher); a reversal posts the opposite RV- and keeps the PV.
 *
 * `view` lists everything; `approve` (Finance Manager, Finance Admin, or Super
 * Admin when Finance Settings allows it) decides — the same `useFinanceCan`
 * gate as Cash Transfers. The server decides again on every call.
 */
export function FinanceSupplierPaymentsScreen() {
  const theme = useAppTheme();
  const can = useFinanceCan();
  const canApprove = can('approve');
  const [tab, setTab] = useState<Tab>('payments');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('pending_approval');
  const [creditFilter, setCreditFilter] = useState<CreditFilter>('pending_approval');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search).trim();

  const paymentsQ = useSupplierPaymentPages({ status: paymentFilter === 'all' ? undefined : paymentFilter, search: term || undefined });
  const creditsQ = useSupplierCreditPages({ status: creditFilter === 'all' ? undefined : creditFilter });
  const balancesQ = useSupplierPaymentBalances({ enabled: tab === 'balances' });
  const headsQ = useSupplierPaymentHeads({ enabled: canApprove });

  const approvePayment = useApproveSupplierPayment();
  const rejectPayment = useRejectSupplierPayment();
  const reversePayment = useReverseSupplierPayment();
  const decideCredit = useDecideSupplierCredit();
  const sub = useSubmission('finance_supplier_payment');

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [approving, setApproving] = useState<SupplierPayment | null>(null);
  const [headId, setHeadId] = useState<string>(DEFAULT_HEAD);
  const [creditToApprove, setCreditToApprove] = useState<SupplierCredit | null>(null);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    setHeadId(DEFAULT_HEAD);
    setModalError(null);
  }, [approving]);
  useEffect(() => {
    setApprovedAmount(creditToApprove ? String(creditToApprove.requestedAmount) : '');
    setModalError(null);
  }, [creditToApprove]);

  const payments = useMemo(() => paymentsQ.data?.pages.flatMap((p) => p.payments) ?? [], [paymentsQ.data]);
  const credits = useMemo(() => creditsQ.data?.pages.flatMap((p) => p.credits) ?? [], [creditsQ.data]);
  const headOptions = useMemo<DropdownOption[]>(
    () => [{ value: DEFAULT_HEAD, label: 'Default (Raw Materials)' }, ...(headsQ.data ?? []).map((h) => ({ value: h.id, label: h.name, hint: h.code }))],
    [headsQ.data],
  );

  const tell = (title: string, message: string) => Alert.alert(title, message);

  const submitPrompt = async (reason: string) => {
    if (!prompt) return;
    setPromptError(null);
    const p = prompt;
    const call: () => Promise<unknown> =
      p.kind === 'rejectCredit'
        ? () => decideCredit.mutateAsync({ id: p.credit.id, input: { decision: 'reject', reason } })
        : p.kind === 'rejectPayment'
          ? () => rejectPayment.mutateAsync({ id: p.payment.id, reason })
          : () => reversePayment.mutateAsync({ id: p.payment.id, reason });
    const outcome = await sub.run({ prompt: prompt.kind, reason }, call);
    if (outcome.kind === 'done') setPrompt(null);
    else if (outcome.kind === 'failed') {
      if (outcome.conflict) {
        setPrompt(null);
        tell('Already decided', outcome.message);
      } else setPromptError(outcome.message);
    }
  };

  const submitApprovePayment = async () => {
    if (!approving) return;
    const ledgerHeadId = headId === DEFAULT_HEAD ? null : headId;
    setModalError(null);
    const outcome = await sub.run({ approve: approving.id, ledgerHeadId }, () => approvePayment.mutateAsync({ id: approving.id, ledgerHeadId }));
    if (outcome.kind === 'done') {
      setApproving(null);
      tell('Payment posted', `${outcome.value.paymentNo} posted as ${outcome.value.voucherNo ?? 'a payment voucher'}.`);
    } else if (outcome.kind === 'failed') {
      if (outcome.conflict) {
        setApproving(null);
        tell('Already decided', outcome.message);
      } else setModalError(outcome.message);
    }
  };

  const submitApproveCredit = async () => {
    if (!creditToApprove) return;
    const parsed = parseMoney(approvedAmount, { positive: true });
    if (!parsed.ok) {
      setModalError(parsed.error);
      return;
    }
    setModalError(null);
    const input = { decision: 'approve' as const, approvedAmount: parsed.value };
    const outcome = await sub.run({ credit: creditToApprove.id, ...input }, () => decideCredit.mutateAsync({ id: creditToApprove.id, input }));
    if (outcome.kind === 'done') setCreditToApprove(null);
    else if (outcome.kind === 'failed') {
      if (outcome.conflict) {
        setCreditToApprove(null);
        tell('Already decided', outcome.message);
      } else setModalError(outcome.message);
    }
  };

  const active = tab === 'payments' ? paymentsQ : creditsQ;
  const refresh = () => {
    void paymentsQ.refetch();
    void creditsQ.refetch();
    if (tab === 'balances') void balancesQ.refetch();
  };

  const tabs: { value: Tab; label: string }[] = [
    { value: 'payments', label: 'Payments' },
    { value: 'credits', label: 'Credits' },
    { value: 'balances', label: 'Balances' },
  ];

  const header = (
    <View style={{ gap: 10, marginBottom: theme.spacing.md }}>
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
              <Text style={[theme.typography.label, { color: on ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {!canApprove ? <Notice text="View only — approving, rejecting and reversing needs a Finance Manager or Finance Admin." icon="lock" /> : null}
      {tab === 'payments' ? (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Payment #, demand #, supplier, reference…" />
          <FilterChipRow options={PAYMENT_FILTERS} value={paymentFilter} onChange={setPaymentFilter} />
        </>
      ) : tab === 'credits' ? (
        <FilterChipRow options={CREDIT_FILTERS} value={creditFilter} onChange={setCreditFilter} />
      ) : null}
      {tab !== 'balances' && active.isLoading ? <LoadingSkeleton height={110} /> : null}
      {tab !== 'balances' && active.error ? <ErrorState message={mapErrorToMessage(active.error)} onRetry={refresh} /> : null}
      {tab === 'balances' && balancesQ.isLoading ? <LoadingSkeleton height={110} /> : null}
      {tab === 'balances' && balancesQ.error ? <ErrorState message={mapErrorToMessage(balancesQ.error)} onRetry={refresh} /> : null}
    </View>
  );

  const footer = active.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined;
  const common = {
    contentContainerStyle: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    ListHeaderComponent: header,
    onRefresh: refresh,
  };

  return (
    <Screen>
      <AppHeader
        title="Supplier Payments"
        subtitle="From WhatsApp Purchasing. Approving posts a PV- to the Daily Ledger."
        actions={[
          { icon: 'refresh', onPress: refresh, accessibilityLabel: 'Refresh' },
          { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' },
        ]}
      />
      {tab === 'payments' ? (
        <FlatList
          {...common}
          data={payments}
          keyExtractor={(p) => p.id}
          refreshing={paymentsQ.isRefetching && !paymentsQ.isFetchingNextPage}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (paymentsQ.hasNextPage && !paymentsQ.isFetchingNextPage) void paymentsQ.fetchNextPage();
          }}
          ListFooterComponent={footer}
          ListEmptyComponent={!paymentsQ.isLoading && !paymentsQ.error ? <EmptyState title="No Payments" message={paymentFilter === 'pending_approval' ? 'Nothing is waiting for Finance.' : 'No supplier payments match.'} /> : undefined}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }}>
              <View style={styles.rowBetween}>
                <Text style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]}>{formatCurrency(item.amount)}</Text>
                <StatusBadge label={SUPPLIER_PAYMENT_STATUS_LABEL[item.status]} variant={SUPPLIER_PAYMENT_STATUS_VARIANT[item.status]} />
              </View>
              <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 2 }]}>{item.supplierName ?? 'Supplier'}</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                {item.paymentNo} · {item.demandNo ?? ''}
                {item.supplierBillNo ? ` · bill ${item.supplierBillNo}` : ''}
              </Text>
              <View style={{ marginTop: 6 }}>
                <Row label="Method" value={`${METHOD_LABEL[item.method]} · from ${item.account === 'bank' ? 'Bank' : 'Cash in Hand'}`} />
                {item.referenceNo ? <Row label="Reference" value={item.referenceNo} /> : null}
                <Row label="Paid on" value={formatDisplayDate(item.paidOn)} />
                {item.creditId ? <Row label="Type" value="Credit repayment" /> : null}
                <Row label="Recorded by" value={item.recordedByName ?? '-'} />
                {item.voucherNo ? <Row label="Voucher" value={`${item.voucherNo}${item.approvedByName ? ` · ${item.approvedByName}` : ''}`} tone="success" /> : null}
                {item.rejectionReason ? <Row label="Rejected" value={item.rejectionReason} tone="danger" /> : null}
                {item.reversalReason ? <Row label={`Reversed${item.reversalVoucherNo ? ` (${item.reversalVoucherNo})` : ''}`} value={item.reversalReason} tone="danger" /> : null}
              </View>
              {item.notes ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>{item.notes}</Text> : null}
              {canApprove && item.status === 'pending_approval' ? (
                <View style={[styles.actions, { marginTop: 10 }]}>
                  <LinkButton label="Approve" icon="check" onPress={() => setApproving(item)} disabled={sub.pending} />
                  <LinkButton label="Reject" icon="close" tone="danger" onPress={() => setPrompt({ kind: 'rejectPayment', payment: item })} disabled={sub.pending} />
                </View>
              ) : null}
              {canApprove && item.status === 'posted' ? (
                <View style={[styles.actions, { marginTop: 10 }]}>
                  <LinkButton label="Reverse" icon="rotate-ccw" tone="danger" onPress={() => setPrompt({ kind: 'reversePayment', payment: item })} disabled={sub.pending} />
                </View>
              ) : null}
            </Card>
          )}
        />
      ) : tab === 'credits' ? (
        <FlatList
          {...common}
          data={credits}
          keyExtractor={(c) => c.id}
          refreshing={creditsQ.isRefetching && !creditsQ.isFetchingNextPage}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (creditsQ.hasNextPage && !creditsQ.isFetchingNextPage) void creditsQ.fetchNextPage();
          }}
          ListFooterComponent={footer}
          ListEmptyComponent={!creditsQ.isLoading && !creditsQ.error ? <EmptyState title="No Credit" message={creditFilter === 'pending_approval' ? 'No credit request is waiting.' : 'No supplier credit matches.'} /> : undefined}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }}>
              <View style={styles.rowBetween}>
                <Text style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]}>{formatCurrency(item.approvedAmount ?? item.requestedAmount)}</Text>
                <StatusBadge label={CREDIT_STATUS_LABEL[item.status]} variant={CREDIT_STATUS_VARIANT[item.status]} />
              </View>
              <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 2 }]}>{item.supplierName ?? 'Supplier'}</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                {item.creditNo} · {item.demandNo ?? ''}
              </Text>
              <View style={{ marginTop: 6 }}>
                <Row label="Requested" value={formatCurrency(item.requestedAmount)} />
                {item.approvedAmount !== null ? <Row label="Approved" value={formatCurrency(item.approvedAmount)} /> : null}
                {item.status === 'active' ? <Row label="Outstanding" value={formatCurrency(item.outstanding)} strong /> : null}
                {item.terms ? <Row label="Terms" value={item.terms} /> : null}
                {item.dueDate ? <Row label="Due" value={formatDisplayDate(item.dueDate)} /> : null}
                {item.reference ? <Row label="Reference" value={item.reference} /> : null}
                <Row label="Requested by" value={item.requestedByName ?? '-'} />
                {item.decisionReason ? <Row label="Decision" value={item.decisionReason} /> : null}
              </View>
              {canApprove && item.status === 'pending_approval' ? (
                <View style={[styles.actions, { marginTop: 10 }]}>
                  <LinkButton label="Approve" icon="check" onPress={() => setCreditToApprove(item)} disabled={sub.pending} />
                  <LinkButton label="Reject" icon="close" tone="danger" onPress={() => setPrompt({ kind: 'rejectCredit', credit: item })} disabled={sub.pending} />
                </View>
              ) : null}
            </Card>
          )}
        />
      ) : (
        <FlatList
          {...common}
          data={balancesQ.data ?? []}
          keyExtractor={(b) => b.supplierId}
          refreshing={balancesQ.isRefetching}
          ListEmptyComponent={!balancesQ.isLoading && !balancesQ.error ? <EmptyState title="No Balances" message="Supplier balances appear once a bill is approved." /> : undefined}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }}>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{item.supplierName}</Text>
              <View style={{ marginTop: 6 }}>
                <Row label="Billed" value={formatCurrency(item.billed)} />
                <Row label="Paid (posted)" value={formatCurrency(item.paid)} />
                <Row label="Outstanding" value={formatCurrency(item.outstanding)} strong tone={item.outstanding > 0 ? 'warning' : undefined} />
                {item.pendingPayments > 0 ? <Row label="Waiting for approval" value={formatCurrency(item.pendingPayments)} /> : null}
                {item.creditApproved > 0 ? <Row label="Credit approved / repaid" value={`${formatCurrency(item.creditApproved)} / ${formatCurrency(item.creditRepaid)}`} /> : null}
                {item.creditOutstanding > 0 ? <Row label="Credit outstanding" value={formatCurrency(item.creditOutstanding)} strong /> : null}
              </View>
            </Card>
          )}
        />
      )}

      <ReasonModal
        visible={prompt !== null}
        title={prompt?.kind === 'reversePayment' ? `Reverse ${prompt.payment.paymentNo}?` : prompt?.kind === 'rejectPayment' ? `Reject ${prompt.payment.paymentNo}?` : prompt?.kind === 'rejectCredit' ? `Reject ${prompt.credit.creditNo}?` : ''}
        message={
          prompt?.kind === 'reversePayment'
            ? `Posts an opposite RV- entry for ${formatCurrency(prompt.payment.amount)}; the original PV- stays, marked reversed. This cannot be undone.`
            : prompt?.kind === 'rejectPayment'
              ? 'Nothing is posted. Production is told why.'
              : 'The credit is not granted. Production is told why.'
        }
        confirmLabel={prompt?.kind === 'reversePayment' ? 'Reverse Payment' : 'Reject'}
        submitting={sub.pending}
        error={promptError}
        onClose={() => {
          setPrompt(null);
          setPromptError(null);
        }}
        onSubmit={(reason) => void submitPrompt(reason)}
      />

      <FormModal
        visible={approving !== null}
        title={approving ? `Approve ${approving.paymentNo}` : ''}
        subtitle={approving ? `${formatCurrency(approving.amount)} to ${approving.supplierName ?? 'supplier'}` : undefined}
        onClose={() => setApproving(null)}
        submitLabel="Approve & Post"
        onSubmit={() => void submitApprovePayment()}
        submitting={sub.pending}
        error={modalError}>
        <Notice text={`Posts one PV- payment voucher from ${approving?.account === 'bank' ? 'Bank' : 'Cash in Hand'} to the Daily Ledger.`} />
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: 16, marginBottom: 6 }]}>LEDGER HEAD</Text>
        <Dropdown options={headOptions} value={headId} onChange={setHeadId} loading={headsQ.isLoading} />
        {approving ? (
          <View style={{ marginTop: 12 }}>
            <Row label="Demand" value={approving.demandNo ?? '-'} />
            <Row label="Method" value={METHOD_LABEL[approving.method]} />
            {approving.referenceNo ? <Row label="Reference" value={approving.referenceNo} /> : null}
            <Row label="Paid on" value={formatDisplayDate(approving.paidOn)} />
          </View>
        ) : null}
      </FormModal>

      <FormModal
        visible={creditToApprove !== null}
        title={creditToApprove ? `Approve ${creditToApprove.creditNo}` : ''}
        subtitle={creditToApprove ? `${creditToApprove.supplierName ?? 'Supplier'} · requested ${formatCurrency(creditToApprove.requestedAmount)}` : undefined}
        onClose={() => setCreditToApprove(null)}
        submitLabel="Approve Credit"
        onSubmit={() => void submitApproveCredit()}
        submitting={sub.pending}
        error={modalError}>
        <Notice text="Approved credit becomes a liability to the supplier until repayments settle it." />
        <View style={{ marginTop: 12 }}>
          <TextField label="Approved amount" required value={approvedAmount} onChangeText={setApprovedAmount} keyboardType="decimal-pad" />
        </View>
      </FormModal>
    </Screen>
  );
}
