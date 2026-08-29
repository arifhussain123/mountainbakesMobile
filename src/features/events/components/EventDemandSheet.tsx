import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  MBButton,
  MBCard,
  MBEmptyState,
  MBHeader,
  MBQtyStepper,
  MBSearchBar,
  MBSkeletonList,
  MBStatusTag,
} from '@/common/ui';
import { useProducts } from '@/api/hooks/useCatalogApi';
import { useDebouncedValue } from '@/common/hooks/useDebouncedValue';
import { useNetworkStore } from '@/state/networkStore';
import { formatBusinessDate } from '@/common/helpers/businessDay';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import type { SpecialEventView } from '@/shared/types/special-event.types';

import { DEMAND_STATE_LABEL } from '../helpers/demandState';
import { useEventDemand } from '../hooks/useEventDemand';

/**
 * The branch's advance demand for one event.
 *
 * ---------------------------------------------------------------------------
 * The deadline gates SAVING, not sending — and that is not a slip
 * ---------------------------------------------------------------------------
 * Every instinct says a deadline stops you *submitting*. Here the server does
 * the opposite, and this sheet follows the server rather than the instinct:
 *
 *   - `POST /:id/demands` compares today's business date to `demand_due_date`
 *     and answers 409 with "Contact Admin to submit late". So once the deadline
 *     passes, a demand can no longer be started or amended.
 *   - the submit route checks only that the demand is still a draft and belongs
 *     to this branch. A draft saved in time may therefore be sent afterwards.
 *
 * Drawing it the other way round would refuse a send the server would accept,
 * and offer a Save that always fails. The banner says which of the two is
 * actually closed.
 *
 * ---------------------------------------------------------------------------
 * An estimated date is marked here too
 * ---------------------------------------------------------------------------
 * The list already flags it, and it matters more here than there: this is the
 * screen where someone commits to quantities for a day that may still move by
 * one, which changes when production has to start.
 *
 * ---------------------------------------------------------------------------
 * Offline, there is nothing to save
 * ---------------------------------------------------------------------------
 * This write is live rather than queued — see `useEventDemand` — so the buttons
 * go down with the connection and the sheet says so before a quantity is typed,
 * matching the production counter till rather than pretending to keep work the
 * device cannot hold.
 */
export function EventDemandSheet({
  event,
  onClose,
}: {
  event: SpecialEventView;
  onClose: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const isOnline = useNetworkStore(s => s.isOnline);
  const form = useEventDemand(event);

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 260);
  const products = useProducts({ search: search || undefined, isActive: true });

  const qtyByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of form.lines) map[line.productId] = line.qty;
    return map;
  }, [form.lines]);

  const readOnly = form.status.state === 'submitted';
  const saving = form.busy === 'save';
  const sending = form.busy === 'submit';
  const totalQty = form.lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title={event.name}
        subtitle="Advance demand"
        {...(form.busy ? {} : { onBack: onClose })}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        keyboardShouldPersistTaps="handled">
        <MBCard testID="event-demand-banner">
          <View style={styles.row}>
            <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
              {DEMAND_STATE_LABEL[form.status.state]}
            </Text>
            {/* No `status`: "estimated" is not a backend enum value, and
                `MBStatusTag` asks callers to omit it rather than invent a key
                that `theme.statusColors` would not recognise. */}
            <MBStatusTag
              label={event.dateIsEstimated ? 'Date estimated' : 'Date confirmed'}
            />
          </View>

          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {event.eventDate
              ? `${formatBusinessDate(event.eventDate)}${
                  event.dateIsEstimated
                    ? ' — anchored to a moon sighting, so it may move by a day.'
                    : '.'
                }`
              : 'The date for this event is not set yet.'}
          </Text>

          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {deadlineNote(form.status.daysToDeadline, event.demandDueDate)}
          </Text>

          {/* Said plainly, because it is the surprising half. */}
          {!form.status.canSave && form.status.state !== 'submitted' ? (
            <Text
              accessibilityRole="alert"
              style={[theme.type.caption, { color: theme.colors.danger }]}
              testID="event-demand-closed">
              {form.status.canSubmit
                ? 'The deadline has passed, so this draft can no longer be changed — but it can still be sent.'
                : 'The deadline has passed. Contact Admin to submit a late demand.'}
            </Text>
          ) : null}
        </MBCard>

        {form.isLoading ? (
          <MBSkeletonList rows={4} />
        ) : (
          <>
            {readOnly ? (
              <MBCard>
                <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                  This demand has been sent to Production and can no longer be edited.
                </Text>
              </MBCard>
            ) : (
              <MBSearchBar
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Search products"
                testID="event-demand-search"
              />
            )}

            {readOnly ? (
              form.lines.length === 0 ? (
                <MBEmptyState title="Nothing on this demand" />
              ) : (
                <MBCard>
                  {form.lines.map(line => (
                    <View key={line.productId} style={styles.row}>
                      <Text style={[theme.type.body, { color: theme.colors.text }]}>
                        {line.productName}
                      </Text>
                      <Text style={[theme.type.mono, { color: theme.colors.text }]}>
                        {line.qty}
                      </Text>
                    </View>
                  ))}
                </MBCard>
              )
            ) : products.isPending ? (
              <MBSkeletonList rows={5} />
            ) : (
              (products.data ?? []).map(product => (
                <MBCard key={product.id}>
                  <Text
                    numberOfLines={2}
                    style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
                    {product.name}
                  </Text>
                  <View style={styles.controls}>
                    <MBQtyStepper
                      value={qtyByProduct[product.id] ?? 0}
                      onChange={qty =>
                        form.setQty({ productId: product.id, productName: product.name }, qty)
                      }
                      label={product.name}
                      disabled={!form.status.canSave || Boolean(form.busy)}
                    />
                  </View>
                </MBCard>
              ))
            )}
          </>
        )}
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
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          {`${form.lines.length} ${form.lines.length === 1 ? 'product' : 'products'} · ${totalQty} units`}
        </Text>

        {form.error ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}
            testID="event-demand-error">
            {form.error}
          </Text>
        ) : null}

        {form.outcome ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.success }]}
            testID="event-demand-outcome">
            {form.outcome === 'saved'
              ? 'Draft saved. Production has not been told yet.'
              : 'Sent to Production.'}
          </Text>
        ) : null}

        {!isOnline && !readOnly ? (
          <Text style={[theme.type.caption, { color: theme.colors.offline }]}>
            You&apos;re offline. An advance demand is saved on the server, so this needs a
            connection — nothing typed here is kept on the device.
          </Text>
        ) : null}

        {/* The footer goes entirely once submitted, rather than offering buttons
            that would 409. */}
        {readOnly ? null : (
          <View style={styles.actions}>
            <MBButton
              label="Save draft"
              variant="secondary"
              onPress={form.save}
              loading={saving}
              disabled={!form.status.canSave || !isOnline || Boolean(form.busy)}
              testID="event-demand-save"
            />
            <MBButton
              label="Submit to Production"
              onPress={form.submit}
              loading={sending}
              disabled={!form.status.canSubmit || !isOnline || Boolean(form.busy)}
              testID="event-demand-submit"
            />
          </View>
        )}
      </View>
    </View>
  );
}

/** The deadline in words, including the case where there is not one. */
function deadlineNote(daysToDeadline: number | null, dueDate: string | null): string {
  if (!dueDate || daysToDeadline === null) {
    return 'No demand deadline is set for this event.';
  }
  if (daysToDeadline < 0) {
    const n = Math.abs(daysToDeadline);
    return `Demand was due ${formatBusinessDate(dueDate)} — ${n} ${n === 1 ? 'day' : 'days'} ago.`;
  }
  if (daysToDeadline === 0) return `Demand is due today, ${formatBusinessDate(dueDate)}.`;
  return `Demand due ${formatBusinessDate(dueDate)} — in ${daysToDeadline} ${
    daysToDeadline === 1 ? 'day' : 'days'
  }.`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  controls: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  footer: { borderTopWidth: 1, gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
});
