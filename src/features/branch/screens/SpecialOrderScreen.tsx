import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MBButton,
  MBCard,
  MBHeader,
  MBInput,
  MBMoney,
  MBPressable,
  MBSyncStatus,
  MBWriteOutcome,
} from '@/common/ui';
import { useBreakpoint } from '@/common/hooks/useBreakpoint';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

import { useSpecialOrderForm, type SpecialOrderField, type SpecialOrderRow } from '../hooks';

/**
 * Raise a Special Order — a one-off a branch needs made, sent straight to
 * Production as its own document.
 *
 * This screen is composition only; every rule lives in `useSpecialOrderForm`.
 *
 * ---------------------------------------------------------------------------
 * It is not a demand, and the screen says so
 * ---------------------------------------------------------------------------
 * It is reached from the demands list, so the first thing under the title is
 * the sentence that tells the two apart. Nothing here is picked from the
 * catalogue and nothing is checked against stock: a row is a name someone
 * typed, a quantity, and the amount agreed for it.
 *
 * ---------------------------------------------------------------------------
 * Amount is for the whole row
 * ---------------------------------------------------------------------------
 * Not a unit rate — nothing multiplies it by the quantity — so the total is the
 * plain sum of the amounts and is the same figure the server will store. It is
 * therefore not marked as an estimate, unlike the demand form's total.
 *
 * There is no photo control: this app has no camera or upload, and the request
 * photo is optional server-side.
 */
export function SpecialOrderScreen(): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<{ goBack: () => void }>();
  const { isWide } = useBreakpoint();
  const { currencySymbol } = useCatalogSettings();
  const form = useSpecialOrderForm();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Special Order"
        onBack={() => navigation.goBack()}
        right={<MBSyncStatus />}
      />

      {form.banner ? (
        // Same affordance as the demand form: the banner text is the
        // announcement, and tapping the band clears it.
        <MBPressable
          onPress={form.dismissBanner}
          accessibilityRole="button"
          accessibilityHint="Dismisses this message"
          feedback="opacity">
          <View style={{ marginHorizontal: theme.layout.screenPad }}>
            <MBWriteOutcome copy={form.banner} testID="special-order-outcome" />
          </View>
        </MBPressable>
      ) : null}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.lg },
        ]}
        keyboardShouldPersistTaps="handled">
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Goes straight to Production. This is separate from a demand.
        </Text>

        {form.rows.map((row, index) => (
          <SpecialOrderRowCard
            key={row.key}
            row={row}
            index={index}
            errors={form.rowErrors[row.key]}
            disabled={form.busy}
            isWide={isWide}
            onField={form.setField}
            onRemove={form.removeRow}
          />
        ))}

        <MBButton
          label="Add row"
          variant="secondary"
          size="md"
          onPress={form.addRow}
          disabled={form.busy}
          testID="special-order-add-row"
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            // On the page wash with one rule above it, as the demand footer is.
            backgroundColor: theme.colors.bg,
            borderTopColor: theme.colors.border,
            paddingHorizontal: theme.layout.screenPad,
            paddingTop: theme.layout.cardPad,
            // Pinned, so the gesture inset is padding rather than margin.
            paddingBottom: theme.layout.cardPad + insets.bottom,
          },
        ]}>
        {form.error ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}>
            {form.error}
          </Text>
        ) : null}

        {form.rows.length > 0 ? (
          <View style={styles.total}>
            <Text
              style={[theme.type.caption, styles.totalLabel, { color: theme.colors.textMuted }]}>
              Special Order total
            </Text>
            {/* `accent`, not `primary`: the ember is a fill and never carries type. */}
            <MBMoney
              value={form.total}
              size="md"
              color={theme.colors.accent}
              {...(currencySymbol ? { symbol: currencySymbol } : {})}
              testID="special-order-total"
            />
          </View>
        ) : null}

        <MBButton
          label="Send to Production"
          onPress={form.submit}
          loading={form.busy}
          fullWidth
          accessibilityHint="Sends this Special Order to Production"
          testID="special-order-submit"
        />
      </View>
    </View>
  );
}

/**
 * One row: Item Name, Qty, Amount, Delete — in that order — over its
 * description.
 *
 * ---------------------------------------------------------------------------
 * Two layouts, one order
 * ---------------------------------------------------------------------------
 * On a phone the name takes the full width and Qty / Amount / Delete share the
 * line under it: four controls across 288dp of card would leave the name too
 * narrow to read what was typed. Past the tablet breakpoint all four sit on one
 * line. Either way the tree order — and so the focus and reading order — is the
 * same.
 *
 * Qty and Amount take equal shares of their line, so Amount is the same control
 * as Qty and never the narrower of the two. Delete keeps its own width; the two
 * fields absorb whatever the line has left, which is what stops any of the
 * three being clipped at 360dp.
 *
 * The row's messages sit under the line rather than under each field: at half
 * a phone's width a sentence under Qty wraps to four lines and pushes Amount's
 * out of step with it. Each message names its own field.
 *
 * Memoised, with the form's stable `onField` / `onRemove` passed whole — a
 * keystroke in one row re-renders that row and no other.
 */
const SpecialOrderRowCard = React.memo(function SpecialOrderRowCardView({
  row,
  index,
  errors,
  disabled,
  isWide,
  onField,
  onRemove,
}: {
  row: SpecialOrderRow;
  index: number;
  errors: string[] | undefined;
  disabled: boolean;
  isWide: boolean;
  onField: (key: string, field: SpecialOrderField, value: string) => void;
  onRemove: (key: string) => void;
}): React.ReactElement {
  const theme = useTheme();
  const position = index + 1;

  const setName = useCallback((text: string) => onField(row.key, 'name', text), [onField, row.key]);
  const setQty = useCallback((text: string) => onField(row.key, 'qty', text), [onField, row.key]);
  const setAmount = useCallback(
    (text: string) => onField(row.key, 'amount', text),
    [onField, row.key],
  );
  const setDescription = useCallback(
    (text: string) => onField(row.key, 'description', text),
    [onField, row.key],
  );
  const remove = useCallback(() => onRemove(row.key), [onRemove, row.key]);

  const name = (
    <MBInput
      label="Item Name"
      required
      value={row.name}
      onChangeText={setName}
      editable={!disabled}
      maxLength={120}
      containerStyle={isWide ? styles.nameWide : undefined}
      testID={`special-order-name-${index}`}
    />
  );

  const qty = (
    <MBInput
      label="Qty"
      required
      numeric
      keyboardType="number-pad"
      value={row.qty}
      onChangeText={setQty}
      editable={!disabled}
      placeholder="0"
      containerStyle={styles.figure}
      testID={`special-order-qty-${index}`}
    />
  );

  const amount = (
    <MBInput
      label="Amount"
      required
      numeric
      keyboardType="decimal-pad"
      value={row.amount}
      onChangeText={setAmount}
      editable={!disabled}
      placeholder="0"
      containerStyle={styles.figure}
      testID={`special-order-amount-${index}`}
    />
  );

  const remover = (
    <MBPressable
      onPress={remove}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Delete row ${position}`}
      // The field's own height, so the word centres on the boxes beside it
      // rather than on the labels above them.
      style={[styles.remove, { minHeight: theme.layout.inputH }]}
      testID={`special-order-delete-${index}`}>
      <Text style={[theme.type.label, { color: theme.colors.danger }]}>Delete</Text>
    </MBPressable>
  );

  return (
    <MBCard style={styles.card} testID={`special-order-row-${index}`}>
      {isWide ? (
        <View style={styles.line}>
          {name}
          {qty}
          {amount}
          {remover}
        </View>
      ) : (
        <>
          {name}
          <View style={styles.line}>
            {qty}
            {amount}
            {remover}
          </View>
        </>
      )}

      {errors?.map(message => (
        <Text
          key={message}
          accessibilityRole="alert"
          style={[theme.type.caption, { color: theme.colors.danger }]}>
          {message}
        </Text>
      ))}

      <MBInput
        label="Description"
        hint="Optional"
        value={row.description}
        onChangeText={setDescription}
        editable={!disabled}
        multiline
        maxLength={500}
        testID={`special-order-description-${index}`}
      />
    </MBCard>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space.md },
  // `flex-end` so the boxes share a baseline whether or not a label wraps.
  line: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  nameWide: { flex: 2, minWidth: 0 },
  // `minWidth: 0` lets a field shrink below its content instead of pushing
  // Delete off the card.
  figure: { flex: 1, minWidth: 0 },
  remove: { justifyContent: 'center', paddingHorizontal: space.xs },
  footer: { borderTopWidth: 1, gap: space.snug },
  total: { gap: space.hair },
  totalLabel: { textTransform: 'uppercase' },
});
