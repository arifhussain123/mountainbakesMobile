import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  MBButton,
  MBCard,
  MBConfirmDialog,
  MBEmptyState,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBInput,
  MBModal,
  MBMoney,
  MBSearchBar,
  MBFab,
  MBSkeletonList,
  MBStatCard,
  MBStatGrid,
  MBStatusTag,
  type FilterChip,
} from '@/common/ui';
import { useDebouncedValue } from '@/common/hooks/useDebouncedValue';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { useNetworkStore } from '@/state/networkStore';
import { formatBusinessDate } from '@/common/helpers/businessDay';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import { toNumber } from '@/common/utils/money';
import type { BranchDiscount } from '@/shared/types/discount.types';

import {
  isDiscountOpen,
  matchesClaim,
  turnaround,
} from '../helpers/claimState';
import { sanitiseMoney } from '../helpers/requestChecks';
import { useBranchDiscounts, WINDOW_DAYS } from '../hooks/useBranchDiscounts';
import { RequestDiscountSheet } from '../components/RequestDiscountSheet';

/**
 * Discount claims — money the branch asks back against a demand.
 *
 * Three things this screen is not about, all separate resources: the per-line
 * discount on a customer sale, a branch return (stock physically going back),
 * and Production's review board, which a branch role is 403'd from at the mount.
 *
 * ---------------------------------------------------------------------------
 * "Still open" is the STATUS, never the review timestamp
 * ---------------------------------------------------------------------------
 * `isDiscountOpen` from the shared mirror, and the distinction is load-bearing
 * rather than pedantic. `reviewedAt` is stamped on all three review outcomes —
 * `returned` included, because a send-back is a review — so a claim Production
 * handed back for correction has a review timestamp AND must still be editable.
 * Gating on the timestamp would strand exactly the claims the branch was asked
 * to fix, which is the one failure this screen exists to prevent.
 *
 * ---------------------------------------------------------------------------
 * The client check explains the buttons; the server is the control
 * ---------------------------------------------------------------------------
 * Both writes 409 once Production has decided, and that answer can arrive
 * between this list loading and a button being pressed. So a refusal is reported
 * in the server's own words rather than as a failure — "already been decided" is
 * information, not an error to retry.
 */

/** The window asked for, stated because it is the request rather than a guess. */
const WINDOW_NOTE = `Last ${WINDOW_DAYS} days`;

const FILTERS: readonly FilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Awaiting review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export function DiscountsScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const { currencySymbol } = useCatalogSettings();
  const isOnline = useNetworkStore(s => s.isOnline);
  const api = useBranchDiscounts();

  const [filter, setFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 250);

  const [editing, setEditing] = useState<BranchDiscount | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState<BranchDiscount | null>(null);
  const [raising, setRaising] = useState(false);

  const visible = useMemo(
    () =>
      api.claims
        .filter(claim => {
          if (filter === 'open') return isDiscountOpen(claim.status);
          if (filter === 'approved') return claim.status === 'approved';
          if (filter === 'rejected') return claim.status === 'rejected';
          return true;
        })
        .filter(claim => matchesClaim(claim, search)),
    [api.claims, filter, search],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Discount claims"
        subtitle={`Money claimed back against a demand · ${WINDOW_NOTE}`}
        onBack={() => navigation.goBack()}
      />

      {api.isPending ? (
        <MBSkeletonList rows={6} />
      ) : api.isError ? (
        <MBErrorState error={api.error} onRetry={api.refetch} retrying={api.isFetching} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            contentColumn,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={api.isFetching && !api.isPending}
              onRefresh={api.refetch}
              tintColor={theme.colors.primary}
            />
          }>
          <MBStatGrid>
            <MBStatCard
              label="Claimed"
              value={api.totals.claimed}
              subtitle={WINDOW_NOTE}
              currencySymbol={currencySymbol}
              tone="brand"
              testID="claims-total"
            />
            <MBStatCard
              label="Approved"
              value={api.totals.approved}
              subtitle="Settled by Production"
              currencySymbol={currencySymbol}
              tone="success"
              testID="claims-approved"
            />
            {/* The only one that is a task, so it is the only one that is a
                control: it taps through to the claims it counts. Claimed and
                Approved are history and go nowhere. */}
            <MBStatCard
              label="Awaiting review"
              value={api.totals.awaitingReview}
              subtitle={`${api.totals.awaitingCount} still yours to change`}
              currencySymbol={currencySymbol}
              tone="warning"
              onPress={() => setFilter('open')}
              testID="claims-awaiting"
            />
          </MBStatGrid>

          <MBFilterChips
            options={FILTERS}
            selectedKey={filter}
            onSelect={setFilter}
            testIDPrefix="claims-filter"
          />

          <MBSearchBar
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search claims, demands, reasons"
            testID="claims-search"
          />

          {api.actionError ? (
            <MBCard>
              <Text
                accessibilityRole="alert"
                style={[theme.type.caption, { color: theme.colors.danger }]}
                testID="claims-action-error">
                {api.actionError}
              </Text>
            </MBCard>
          ) : null}

          {api.outcome ? (
            <MBCard>
              <Text
                accessibilityRole="alert"
                style={[theme.type.caption, { color: theme.colors.success }]}
                testID="claims-outcome">
                {api.outcome}
              </Text>
            </MBCard>
          ) : null}

          {visible.length === 0 ? (
            <MBEmptyState
              title={search || filter !== 'all' ? 'Nothing matches' : 'No claims raised'}
              message={
                search || filter !== 'all'
                  ? 'Try another search, or clear the filter.'
                  : `Nothing has been claimed in the ${WINDOW_DAYS} days covered here.`
              }
            />
          ) : (
            visible.map(claim => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                currencySymbol={currencySymbol}
                onChange={() => setEditing(claim)}
                onWithdraw={() => setConfirmWithdraw(claim)}
                disabled={Boolean(api.busy) || !isOnline}
              />
            ))
          )}

          {!isOnline ? (
            <Text style={[theme.type.caption, { color: theme.colors.offline }]}>
              You&apos;re offline. A claim is raised on the server, so this needs a
              connection — nothing typed here is kept on the device.
            </Text>
          ) : null}
        </ScrollView>
      )}

      {/* The corner FAB is where a create action lives now that the centre
          navigation button is gone — the resource's own list offers it. */}
      {!api.isPending && !api.isError ? (
        <MBFab
          icon="add"
          label="Request discount"
          onPress={() => setRaising(true)}
          testID="raise-claim"
        />
      ) : null}

      <MBModal
        visible={raising}
        onRequestClose={() => (api.busy ? undefined : setRaising(false))}
        testID="request-claim-modal">
        {raising ? (
          <RequestDiscountSheet
            claims={api.claims}
            busy={api.busy === 'create'}
            error={api.actionError}
            onSend={api.create}
            onClose={() => setRaising(false)}
            /* Already on that list — closing IS opening it. */
            onOpenList={() => setRaising(false)}
          />
        ) : null}
      </MBModal>

      <MBModal
        visible={editing !== null}
        onRequestClose={() => (api.busy ? undefined : setEditing(null))}
        testID="claim-form-modal">
        {editing ? (
          <ClaimForm
            claim={editing}
            currencySymbol={currencySymbol}
            busy={api.busy}
            error={api.actionError}
            onClose={() => setEditing(null)}
            onSave={async (amount, reason) => {
              const ok = await api.revise(editing.id, { amount, reason });
              if (ok) setEditing(null);
            }}
          />
        ) : null}
      </MBModal>

      <MBConfirmDialog
        visible={confirmWithdraw !== null}
        title="Withdraw this claim?"
        /* Said plainly because it is a real delete rather than a cancelled
           status — nothing was booked, so there is no record left behind. */
        message="The claim is removed entirely. Production will not see it, and it cannot be restored."
        confirmLabel="Withdraw"
        confirmVariant="danger"
        onConfirm={async () => {
          const claim = confirmWithdraw;
          setConfirmWithdraw(null);
          if (claim) await api.withdraw(claim.id);
        }}
        onCancel={() => setConfirmWithdraw(null)}
      />
    </View>
  );
}

/**
 * One claim.
 *
 * `Final` is stated in the sentence rather than kept as a column, because it is
 * the fact that decides whether the reader can still do anything — and a column
 * is the thing a person scans past.
 */
function ClaimCard({
  claim,
  currencySymbol,
  onChange,
  onWithdraw,
  disabled,
}: {
  claim: BranchDiscount;
  currencySymbol?: string;
  onChange: () => void;
  onWithdraw: () => void;
  disabled: boolean;
}): React.ReactElement {
  const theme = useTheme();
  const open = isDiscountOpen(claim.status);
  const took = turnaround(claim);

  return (
    <MBCard testID={`claim-${claim.id}`}>
      <View style={styles.row}>
        <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
          {claim.demandNumber}
        </Text>
        <MBMoney value={claim.amount} size="sm" symbol={currencySymbol} />
      </View>

      <View style={styles.row}>
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          {formatBusinessDate(claim.date)}
        </Text>
        {/* `returned` is a real backend status with no hue in
            `theme.statusColors`, and MBStatusTag only accepts keys that map. It
            falls back to muted text at runtime, but the type will not allow the
            key — so it is passed as a plain label and the word carries it. */}
        <MBStatusTag
          label={STATUS_LABEL[claim.status]}
          {...(claim.status === 'returned' ? {} : { status: claim.status })}
        />
      </View>

      {/* Exactly as typed, typos included — this is a claim record, not copy. */}
      <Text style={[theme.type.body, { color: theme.colors.text }]}>{claim.reason}</Text>

      {claim.reviewNote ? (
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          {`Production said: ${claim.reviewNote}`}
        </Text>
      ) : null}

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {open
          ? took
            ? `Sent back after ${took} — still yours to change.`
            : 'Awaiting review — still yours to change.'
          : `Final${took ? ` · reviewed in ${took}` : ''}. This can no longer be changed.`}
      </Text>

      {open ? (
        <View style={styles.actions}>
          <MBButton
            label="Change"
            variant="secondary"
            onPress={onChange}
            disabled={disabled}
            testID={`claim-change-${claim.id}`}
          />
          <MBButton
            label="Withdraw"
            variant="ghost"
            onPress={onWithdraw}
            disabled={disabled}
            testID={`claim-withdraw-${claim.id}`}
          />
        </View>
      ) : null}
    </MBCard>
  );
}

/** Correcting a claim: amount and reason, which is all the server accepts. */
function ClaimForm({
  claim,
  currencySymbol,
  busy,
  error,
  onClose,
  onSave,
}: {
  claim: BranchDiscount;
  currencySymbol?: string;
  busy: string | null;
  error: string | null;
  onClose: () => void;
  onSave: (amount: number, reason: string) => Promise<void>;
}): React.ReactElement {
  const theme = useTheme();
  const [amount, setAmount] = useState(String(claim.amount));
  const [reason, setReason] = useState(claim.reason);

  const parsed = toNumber(amount);
  const amountError =
    amount.trim() === ''
      ? 'Enter the amount claimed.'
      : !(parsed > 0)
        ? 'Amount must be more than 0.'
        : null;
  const reasonError = reason.trim() === '' ? 'Say what the claim is for.' : null;
  const saving = busy === 'revise';

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Change claim"
        subtitle={claim.demandNumber}
        {...(saving ? {} : { onBack: onClose })}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        keyboardShouldPersistTaps="handled">
        <MBInput
          label={`Amount (${currencySymbol ?? 'Rs.'})`}
          required
          value={amount}
          /* Decimal, matching the raise form and the server's own
             `multipleOf(0.01)`. A short-delivery claim can genuinely carry
             paise, and two fields for one resource must not disagree about
             whether it can. */
          onChangeText={text => setAmount(sanitiseMoney(text))}
          keyboardType="decimal-pad"
          error={amountError ?? undefined}
          editable={!saving}
          testID="claim-amount"
        />

        {/*
          Free text, deliberately. The reason is the one field that makes a claim
          reviewable, and a fixed list silently drops the cases nobody
          anticipated — the server takes any string and Production reads it.
        */}
        <MBInput
          label="Reason"
          required
          value={reason}
          onChangeText={setReason}
          multiline
          error={reasonError ?? undefined}
          editable={!saving}
          testID="claim-reason"
        />

        {/* Re-pointing at another demand is a different claim, not an edit of
            this one — the server does not accept it on a revise. */}
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          {`This claim stays against ${claim.demandNumber}. To claim against another delivery, withdraw this one and raise a new claim.`}
        </Text>

        {error ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}
            testID="claim-form-error">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            padding: theme.layout.screenPad,
          },
        ]}>
        <MBButton
          label="Save and resend"
          onPress={() => onSave(parsed, reason.trim())}
          loading={saving}
          disabled={Boolean(amountError || reasonError) || saving}
          fullWidth
          testID="claim-save"
        />
      </View>
    </View>
  );
}

const STATUS_LABEL: Record<BranchDiscount['status'], string> = {
  pending: 'Awaiting review',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Sent back',
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  footer: { borderTopWidth: 1, gap: space.sm },
});
