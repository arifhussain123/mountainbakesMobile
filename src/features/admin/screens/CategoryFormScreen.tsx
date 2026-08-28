import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MBButton, MBHeader, MBInput } from '@/common/ui';
import { useCategories } from '@/api/hooks/useCatalogApi';
import { useCreateCategory, useUpdateCategory } from '@/api/hooks/useCategoriesApi';
import type { MoreStackParamList } from '@/navigation/types';
import { CreateCategorySchema } from '@/shared/schemas/product.schemas';
import { useTheme } from '@/common/theme/ThemeProvider';
import { contentColumn } from '@/common/theme/spacing';

/**
 * Create or rename a category.
 *
 * `sortOrder` is editable because it is what the server orders by, and there is
 * no drag-to-reorder: that would need a bulk endpoint the API does not have, and
 * doing it client-side would fire one PUT per row on every drop.
 */

type FormRoute = RouteProp<MoreStackParamList, 'CategoryForm'>;

/**
 * The shared schema with `sortOrder` made required.
 *
 * `CreateCategorySchema` declares it `.default(0)`, which gives Zod a different
 * INPUT type (optional) from its OUTPUT type (required) — and react-hook-form is
 * typed against one shape for both. The field is restated rather than the whole
 * schema copied, so `name` and its message still come from the mirrored source
 * of truth and the form seeds the same 0 the server would have defaulted to.
 */
const CategoryFormSchema = CreateCategorySchema.extend({
  sortOrder: z.number().int().min(0),
});

type FormValues = z.infer<typeof CategoryFormSchema>;

export function CategoryFormScreen(): React.ReactElement {
  const theme = useTheme();
  const route = useRoute<FormRoute>();
  const navigation = useNavigation<{ goBack: () => void }>();
  const categoryId = route.params?.categoryId;
  const isEdit = Boolean(categoryId);

  const categories = useCategories();
  const existing = categories.data?.find(c => c.id === categoryId);
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const [failed, setFailed] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: { name: '', sortOrder: 0 },
  });

  useEffect(() => {
    if (!isEdit || !existing) return;
    reset({ name: existing.name, sortOrder: existing.sortOrder });
  }, [isEdit, existing, reset]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      setFailed(null);
      try {
        if (isEdit && categoryId) {
          await update.mutateAsync({ id: categoryId, input: values });
        } else {
          await create.mutateAsync(values);
        }
        navigation.goBack();
      } catch (error) {
        setFailed(
          error instanceof Error ? error.message : 'The category was not saved. Try again.',
        );
      }
    },
    [create, update, isEdit, categoryId, navigation],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title={isEdit ? 'Edit category' : 'New category'}
        onBack={navigation.goBack}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <MBInput
              label="Name"
              required
              value={field.value}
              onChangeText={field.onChange}
              error={errors.name?.message}
              testID="category-name"
            />
          )}
        />

        <Controller
          control={control}
          name="sortOrder"
          render={({ field }) => (
            <MBInput
              label="Sort order"
              numeric
              keyboardType="number-pad"
              hint="Lower numbers appear first"
              value={String(field.value ?? 0)}
              onChangeText={text => field.onChange(Number(text.replace(/[^0-9]/g, '')) || 0)}
              error={errors.sortOrder?.message}
              testID="category-sort"
            />
          )}
        />

        {failed ? (
          <Text style={[theme.type.caption, { color: theme.colors.danger }]}>{failed}</Text>
        ) : null}

        <MBButton
          label={isEdit ? 'Save changes' : 'Create category'}
          onPress={handleSubmit(onSubmit)}
          loading={create.isPending || update.isPending}
          testID="save-category"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
