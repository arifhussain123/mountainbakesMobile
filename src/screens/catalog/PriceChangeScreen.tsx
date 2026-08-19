import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { MBButton, MBCard, MBHeader, MBInput, MBMoney } from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { useChangePrice, useProduct } from '@/hooks/useProductAdmin';
import type { ProductsStackParamList } from '@/navigation/types';
import { ChangePriceSchema, type ChangePriceInput } from '@/shared/schemas/price.schemas';
import { businessDateStr } from '@/shared/utils/timezone';
import { useTheme } from '@/theme/ThemeProvider';
import { parseCurrency } from '@/utils/money';

/**
 * Change a product's price.
 *
 * ---------------------------------------------------------------------------
 * The rule this screen is built around
 * ---------------------------------------------------------------------------
 * **A price change never touches a sale that has already happened.** Every
 * `order_items` row carries the `unit_price` it was written with, snapshotted by
 * the server at the moment the order was created. Yesterday's receipts, and
 * every report built on them, keep the number the customer actually paid.
 *
 * That is stated on the screen, not just in this comment. An admin typing a new
 * price is entitled to know whether they are about to rewrite the past, and the
 * answer — no — is the difference between changing a price and being afraid to.
 *
 * The change goes to `POST /api/products/:id/price`, the only endpoint that can
 * move a price. It appends an immutable history row with a version number, an
 * effective date and a reason. `PUT /api/products/:id` strips `price` entirely,
 * so there is no second path to keep in step.
 *
 * ---------------------------------------------------------------------------
 * Three outcomes, reported as the server gives them
 * ---------------------------------------------------------------------------
 * `active` — live now, and branch managers were notified.
 * `scheduled` — dated ahead; it activates on that business date, not tonight.
 * `skipped` — the price was already this, so nothing was recorded.
 *
 * The screen says which one happened rather than "Saved". A scheduled change
 * reported as done is how someone walks away believing today's till has the new
 * price.
 */

type PriceChangeRoute = RouteProp<ProductsStackParamList, 'PriceChange'>;

export function PriceChangeScreen(): React.ReactElement {
  const theme = useTheme();
  const route = useRoute<PriceChangeRoute>();
  const navigation = useNavigation<{ goBack: () => void }>();
  const { productId } = route.params;

  const { currencySymbol } = useCatalogSettings();
  const product = useProduct(productId);
  const changePrice = useChangePrice(productId);
  const [result, setResult] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePriceInput>({
    resolver: zodResolver(ChangePriceSchema),
    defaultValues: {
      newPrice: 0,
      // Today in business-date terms — the day rolls at 02:00 Asia/Karachi, so
      // a 01:00 change belongs to the day that is still running.
      effectiveDate: businessDateStr(),
      reason: '',
    },
  });

  const onSubmit = useCallback(
    (values: ChangePriceInput) => {
      changePrice.mutate(values, {
        onSuccess: outcome => {
          product.refetch();
          if (outcome.status === 'skipped') {
            setResult('That is already the price — nothing was recorded.');
            return;
          }
          if (outcome.status === 'scheduled') {
            setResult(
              `Scheduled for ${outcome.effectiveDate ?? values.effectiveDate}. The current price stays live until then.`,
            );
            return;
          }
          setResult(
            `Price updated${outcome.versionNumber ? ` (version ${outcome.versionNumber})` : ''}. Branches have been notified.`,
          );
        },
        onError: () => setResult(null),
      });
    },
    [changePrice, product],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Change price"
        subtitle={product.data?.name}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.md }}>
        <MBCard>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Current price</Text>
          <MBMoney value={product.data?.price ?? 0} symbol={currencySymbol} />
        </MBCard>

        {result ? (
          <MBCard>
            <Text accessibilityRole="alert" style={[theme.type.body, { color: theme.colors.text }]}>
              {result}
            </Text>
          </MBCard>
        ) : null}

        <Controller
          control={control}
          name="newPrice"
          render={({ field }) => (
            <MBInput
              label="New price"
              value={field.value ? String(field.value) : ''}
              onChangeText={text => field.onChange(parseCurrency(text))}
              keyboardType="decimal-pad"
              error={errors.newPrice?.message}
              testID="new-price"
            />
          )}
        />

        <Controller
          control={control}
          name="effectiveDate"
          render={({ field }) => (
            <MBInput
              label="Effective date"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              error={errors.effectiveDate?.message}
              testID="effective-date"
            />
          )}
        />

        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <MBInput
              label="Reason"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Why the price is moving"
              multiline
              error={errors.reason?.message}
              testID="reason"
            />
          )}
        />

        {/* Said plainly, on the screen where it matters. */}
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Sales and orders already recorded keep the price they were charged at. This sets the
          price from the effective date onward and is recorded in the product's price history.
        </Text>

        <MBButton
          label="Save price change"
          onPress={handleSubmit(onSubmit)}
          loading={changePrice.isPending}
          testID="save-price"
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
