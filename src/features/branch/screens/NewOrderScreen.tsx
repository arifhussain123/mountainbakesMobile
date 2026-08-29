import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  MBConfirmDialog,
  MBHeader,
  MBModal,
  MBPressable,
  MBSearchBar,
  MBSyncStatus,
  MBWriteOutcome,
} from '@/common/ui';
import { useProducts, useStock } from '@/api/hooks/useCatalogApi';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { useDebouncedValue } from '@/common/hooks/useDebouncedValue';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import { businessDateStr, karachiTimeStr } from '@/shared/utils/timezone';
import { useAuthStore } from '@/state/authStore';

import {
  OrderFooter,
  OrderMetaGrid,
  OrderProductTable,
  OrderReview,
  RequiredDateField,
} from '../components';
import { useOrderWindow, useProductionOrderForm } from '../hooks';

/**
 * Create a new production order — a branch's demand on central production
 * (v6, screen 20).
 *
 * This screen is composition only. Every rule the demand obeys lives in
 * `useProductionOrderForm`, and the reason for the split is that the rules are
 * the part that goes wrong quietly: what a quantity of zero means, what the
 * required date gates, which path clears the form and which leaves it alone.
 *
 * ---------------------------------------------------------------------------
 * Two things the server insists on, both visible here
 * ---------------------------------------------------------------------------
 * - `requiredDate` is REQUIRED and is not defaulted server-side. It gates Submit
 *   and only Submit — Save draft works without it. It sits in the footer, next
 *   to the button it gates.
 * - `branchId` is NEVER sent. The server derives it from the token. The branch
 *   is still named in the meta grid, because the person filing a demand should
 *   see whose name it goes under.
 *
 * ---------------------------------------------------------------------------
 * Money is shown and not sent
 * ---------------------------------------------------------------------------
 * v6's table carries a rate per product and three totals in the footer.
 * `CreateProductionOrderSchema` carries none of them: a demand is products,
 * quantities, remarks and a date. So the figures here are the device's own
 * arithmetic over catalogue prices — they let a branch sanity-check the size of
 * what it is asking for, and they are marked as estimates because that is what
 * they are. Putting them in the payload would send keys Zod strips silently,
 * which is worse than not sending them: it reads like it works.
 *
 * Two things v6 draws that are deliberately absent, for the same reason. The
 * masthead carries **Return items** and **Discount** pills; neither is a field
 * on a production order, in the schema or in the database, and a toggle that
 * changes nothing is worse than no toggle. Special (one-off, free-text) items
 * and packing materials ARE in the schema and are simply not built here yet.
 *
 * ---------------------------------------------------------------------------
 * The search box v6 does not draw
 * ---------------------------------------------------------------------------
 * The mock lists eight products and needs no search. The real catalogue is
 * hundreds, filtered server-side, so one has to exist — and it is a permanent
 * inline `MBSearchBar` rather than `MBHeader`'s collapsing one, which is the
 * rule `docs/navigation.md` states for both create screens: the field is the
 * primary input here, not one way among several of narrowing a list.
 *
 * It sits **outside** the list rather than in its header, so it does not scroll
 * away from the rows it filters. The order's own meta scrolls; the control that
 * changes what is under it does not.
 */
export function NewOrderScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const form = useProductionOrderForm();
  const orderWindow = useOrderWindow();
  const { currencySymbol } = useCatalogSettings();

  const branchName = useAuthStore(s => s.claims?.branchName);
  const orderedBy = useAuthStore(s => s.claims?.email);

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);
  const products = useProducts({ search: search || undefined, isActive: true });

  /**
   * Branch balances, for the stock figure on every row.
   *
   * A demand exists because a shelf is running down, so "how many do we have" is
   * the number the quantity is chosen against. Advisory only — the server is the
   * authority — and it is the BRANCH's stock rather than Production's, which is
   * the figure the person standing in the shop can check by looking.
   */
  const stock = useStock();
  const stockByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of stock.data?.rows ?? []) map[row.productId] = row.balance;
    return map;
  }, [stock.data]);

  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="New production order"
        onBack={() => navigation.goBack()}
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(products.dataUpdatedAt)}
      />

      {form.banner ? (
        // Tapping the banner dismisses it. Without a role that affordance is
        // invisible to a screen reader, which otherwise reads the message and
        // gives no way to clear it. The label stays unset on purpose: the
        // banner text is the announcement, and a label here would replace it.
        <MBPressable
          onPress={form.dismissBanner}
          accessibilityRole="button"
          accessibilityHint="Dismisses this message"
          // A full-width band pulling in at its edges reads as the message
          // shrinking rather than as a control answering a touch.
          feedback="opacity">
          <View style={{ marginHorizontal: theme.layout.screenPad }}>
            <MBWriteOutcome copy={form.banner} />
          </View>
        </MBPressable>
      ) : null}

      <View style={[styles.search, { paddingHorizontal: theme.layout.screenPad }]}>
        <MBSearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search product"
          searching={searchInput.trim() !== search}
          testID="order-product-search"
        />
      </View>

      <View style={styles.flex}>
        <OrderProductTable
          products={products.data ?? []}
          lines={form.lines}
          stock={stockByProduct}
          hasStock={Boolean(stock.data)}
          onChange={form.setQty}
          {...(currencySymbol ? { currencySymbol } : {})}
          disabled={form.busy === 'submit'}
          isPending={products.isPending}
          isError={products.isError}
          error={products.error}
          isRefreshing={products.isFetching && !products.isPending}
          onRefresh={() => products.refetch()}
          header={
            <>
              <OrderMetaGrid
                branchName={branchName}
                orderedBy={orderedBy}
                businessDate={businessDateStr()}
                time={karachiTimeStr()}
              />

              {/* The rule the submit will be judged against, stated before a
                  basket exists rather than after. The window wraps past
                  midnight, so "open until 02:00" is a normal thing to read at
                  23:30. */}
              {orderWindow.isLoading ? null : (
                <Text
                  style={[
                    theme.type.caption,
                    {
                      color: orderWindow.isOpen
                        ? theme.colors.textMuted
                        : theme.colors.offline,
                    },
                  ]}>
                  {orderWindow.isOpen
                    ? `Orders open until ${orderWindow.closesAt} · ${orderWindow.nowAt} now`
                    : `Orders closed · open ${orderWindow.opensAt}–${orderWindow.closesAt} · ${orderWindow.nowAt} now`}
                </Text>
              )}

              {form.draftRestored ? (
                <Text
                  accessibilityRole="alert"
                  style={[theme.type.caption, { color: theme.colors.info }]}>
                  A saved draft has been put back. Nothing has been sent to production.
                </Text>
              ) : null}
            </>
          }
        />
      </View>

      <OrderFooter
        totals={form.totals}
        /*
          One footer carries the message at a time — the review's while it is
          open, this one's after Back. The review is a modal over a screen that
          stays mounted, so rendering it in both puts the same
          `accessibilityRole="alert"` in the tree twice and a screen reader reads
          it twice. It survives Back on purpose: the messages this can carry are
          about the demand as a whole, and the controls that fix them are here.
        */
        error={form.review ? null : form.error}
        draftSavedAt={form.draftSavedAt}
        busy={form.busy}
        {...(currencySymbol ? { currencySymbol } : {})}
        onClear={() => setConfirmClear(true)}
        onSaveDraft={form.saveDraft}
        onSubmit={form.openReview}>
        <RequiredDateField
          value={form.requiredDate}
          onChangeText={form.setRequiredDate}
          error={form.dateError}
          editable={form.busy !== 'submit'}
          testID="required-date"
        />
      </OrderFooter>

      {/*
        `onRequestClose` is Android's hardware Back on a `full` modal, so it is
        the other way out of the review — and it must not be a way out mid-send.
        Dismissing does not cancel the request: the demand still lands and still
        reports its outcome here, so a Back that closed the review would leave
        someone believing they had stopped an order that was already gone.
        Inert while submitting, and only then.
      */}
      <MBModal
        visible={form.review}
        onRequestClose={form.busy === 'submit' ? () => undefined : form.closeReview}
        testID="order-review">
        <OrderReview
          lines={form.selected}
          requiredDate={form.requiredDate}
          branchName={branchName}
          totals={form.totals}
          busy={form.busy}
          error={form.error}
          {...(currencySymbol ? { currencySymbol } : {})}
          onQty={form.setQtyFor}
          onRemark={form.setRemark}
          onBack={form.closeReview}
          onConfirm={form.submit}
        />
      </MBModal>

      {/*
        Clear is confirmed and Submit is not, which is the right way round.
        Submit already goes through the review, where the whole demand is on
        screen and the button says what it does. Clear destroys a basket that may
        be twenty lines built over ten minutes, with nothing to read afterwards
        and no undo.
      */}
      <MBConfirmDialog
        visible={confirmClear}
        title="Clear this order?"
        message={`${form.totals.selected} ${
          form.totals.selected === 1 ? 'product' : 'products'
        } and any saved draft will be removed from this device. Nothing has been sent to production.`}
        confirmLabel="Clear"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmClear(false);
          form.clear();
        }}
        onCancel={() => setConfirmClear(false)}
        testID="confirm-clear"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { paddingTop: space.md },
});
