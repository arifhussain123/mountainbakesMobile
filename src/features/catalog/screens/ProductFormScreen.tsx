import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MBButton, MBHeader, MBInput } from '@/common/ui';
import { useCategories } from '@/api/hooks/useCatalogApi';
import { useCreateProduct, useProduct, useUpdateProduct } from '@/api/hooks/useProductsApi';
import type { ProductsStackParamList } from '@/navigation/types';
import { CreateProductSchema } from '@/shared/schemas/product.schemas';
import { useTheme } from '@/common/theme/ThemeProvider';
import { parseCurrency } from '@/common/utils/money';

/**
 * Create or edit a product. One screen for both — the fields are the same
 * except for one, and that exception is the point.
 *
 * ---------------------------------------------------------------------------
 * Price appears when creating and never when editing
 * ---------------------------------------------------------------------------
 * A new product has no history, so its opening price is just a field. Once it
 * exists, the price is the head of a versioned series that historical sales were
 * charged against, and it moves only through `PriceChange` — which records who
 * changed it, when it takes effect, and why.
 *
 * This is not merely hidden here. `useUpdateProduct` takes a payload type with
 * `price` removed, and `PUT /api/products/:id` deletes the field server-side
 * before touching the table. Three layers say the same thing, and the innermost
 * one is the server's.
 */

type FormRoute = RouteProp<ProductsStackParamList, 'ProductForm'>;

/**
 * One field shape for both modes, with `price` optional.
 *
 * The mode decides whether it is *required*, not whether it exists: keeping one
 * value type means `reset`, `watch` and the submit handler are not written twice
 * and cannot drift. Create adds the positivity rule; edit never renders the
 * field and never sends it.
 */
const ProductFormSchema = CreateProductSchema.extend({
  price: z.number().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof ProductFormSchema>;

const CreateFormSchema = ProductFormSchema.extend({
  price: z.number().positive('Price must be positive'),
});

export function ProductFormScreen(): React.ReactElement {
  const theme = useTheme();
  const route = useRoute<FormRoute>();
  const navigation = useNavigation<{ goBack: () => void }>();
  const productId = route.params?.productId;
  const isEdit = Boolean(productId);

  const categories = useCategories();
  const existing = useProduct(productId ?? '');
  const create = useCreateProduct();
  const update = useUpdateProduct(productId ?? '');
  const [failed, setFailed] = useState<string | null>(null);

  const schema: z.ZodType<FormValues> = isEdit ? ProductFormSchema : CreateFormSchema;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', categoryId: '', sku: '', costPrice: 0, description: '' },
  });

  // Fill the form once the product arrives. `price` is deliberately not seeded:
  // the field is not rendered in edit mode and must not be submitted.
  useEffect(() => {
    if (!isEdit || !existing.data) return;
    reset({
      name: existing.data.name,
      categoryId: existing.data.categoryId,
      sku: existing.data.sku,
      costPrice: existing.data.costPrice,
      description: existing.data.description ?? '',
    });
  }, [isEdit, existing.data, reset]);

  const categoryId = watch('categoryId');

  const onSubmit = useCallback(
    (values: FormValues) => {
      setFailed(null);
      const onError = () =>
        setFailed('The change was not saved. Check the connection and try again.');

      if (isEdit) {
        // `price` is dropped rather than merely left undefined: `ProductEditPayload`
        // has no such field, so this cannot regress into sending one.
        const edit = {
          name: values.name,
          categoryId: values.categoryId,
          sku: values.sku,
          costPrice: values.costPrice,
          description: values.description,
        };
        update.mutate(edit, { onSuccess: () => navigation.goBack(), onError });
        return;
      }

      // The create schema guarantees it; this satisfies the compiler without a
      // cast that would also silence a real mistake.
      if (values.price === undefined) return;
      create.mutate(
        { ...values, price: values.price, description: values.description ?? '' },
        { onSuccess: () => navigation.goBack(), onError },
      );
    },
    [create, isEdit, navigation, update],
  );

  const busy = create.isPending || update.isPending;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        tone="brand"
        title={isEdit ? 'Edit product' : 'New product'}
        subtitle={isEdit ? existing.data?.sku : undefined}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.md }}>
        {failed ? (
          <Text accessibilityRole="alert" style={[theme.type.label, { color: theme.colors.danger }]}>
            {failed}
          </Text>
        ) : null}

        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <MBInput
              label="Product name"
              required
              value={field.value}
              onChangeText={field.onChange}
              error={errors.name?.message}
              testID="product-name"
            />
          )}
        />

        <Controller
          control={control}
          name="sku"
          render={({ field }) => (
            <MBInput
              label="Product code"
              required
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.sku?.message}
              testID="product-sku"
            />
          )}
        />

        <View style={{ gap: theme.space.sm }}>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Category</Text>
          <View style={styles.chips}>
            {(categories.data ?? []).map(category => {
              const selected = category.id === categoryId;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setValue('categoryId', category.id, { shouldValidate: true })}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      borderRadius: theme.radius.sm, // a chip is chosen, not read — v4 keeps the pill for status
                      paddingHorizontal: theme.space.lg,
                      backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      theme.type.label,
                      { color: selected ? theme.colors.onPrimary : theme.colors.text },
                    ]}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.categoryId ? (
            <Text style={[theme.type.caption, { color: theme.colors.danger }]}>
              {errors.categoryId.message}
            </Text>
          ) : null}
        </View>

        {/* Opening price, creation only. See the screen note. */}
        {!isEdit ? (
          <Controller
            control={control}
            name="price"
            render={({ field }) => (
              <MBInput
                label="Selling price"
                required
                numeric
                value={field.value ? String(field.value) : ''}
                onChangeText={text => field.onChange(parseCurrency(text))}
                keyboardType="decimal-pad"
                error={errors.price?.message}
                testID="product-price"
              />
            )}
          />
        ) : (
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            Price is changed from the product screen, so the change is dated and recorded. Sales
            already taken keep the price they were charged at.
          </Text>
        )}

        <Controller
          control={control}
          name="costPrice"
          render={({ field }) => (
            <MBInput
              label="Cost price"
              numeric
              value={field.value ? String(field.value) : ''}
              onChangeText={text => field.onChange(parseCurrency(text))}
              keyboardType="decimal-pad"
              error={errors.costPrice?.message}
              testID="product-cost"
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <MBInput
              label="Description"
              value={field.value}
              onChangeText={field.onChange}
              multiline
              error={errors.description?.message}
              testID="product-description"
            />
          )}
        />

        <MBButton
          label={isEdit ? 'Save changes' : 'Create product'}
          onPress={handleSubmit(onSubmit)}
          loading={busy}
          testID="save-product"
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
