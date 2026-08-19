import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import {
  MBButton,
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBInput,
  MBSearchBar,
  MBSkeletonList,
  MBSyncStatus,
} from '@/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useProducts } from '@/hooks/useCatalog';
import { useCreateProductionOrder } from '@/hooks/useCreateProductionOrder';
import type { Product } from '@/shared/types/product.types';
import { businessDateStr } from '@/shared/utils/timezone';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * New production order — a branch's demand on central production.
 *
 * Two things the server insists on, both reflected here:
 *
 * - `requiredDate` is REQUIRED. A demand with no delivery date is exactly what
 *   the field exists to prevent, and the server will not default it: doing so
 *   would file a made-up commitment under the branch's name.
 * - `branchId` is NEVER sent. It is derived from the auth token server-side.
 *
 * Special (one-off, free-text) items and packing materials are part of the
 * schema but not built here yet — see the note at the bottom of the screen.
 */
export function NewOrderScreen(): React.ReactElement {
  const theme = useTheme();
  const { createProductionOrder, isSaving } = useCreateProductionOrder();

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [requiredDate, setRequiredDate] = useState(tomorrow());
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'queued'; text: string } | null>(null);

  const products = useProducts({ search: search || undefined, isActive: true });

  const selected = useMemo(
    () => Object.entries(quantities).filter(([, qty]) => qty > 0),
    [quantities],
  );

  const setQty = useCallback((productId: string, qty: number) => {
    setQuantities(current => {
      if (qty <= 0) {
        const rest = { ...current };
        delete rest[productId];
        return rest;
      }
      return { ...current, [productId]: qty };
    });
  }, []);

  const onSubmit = async () => {
    setError(null);

    if (selected.length === 0) {
      setError('Add at least one product.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requiredDate)) {
      setError('Enter the required date as YYYY-MM-DD.');
      return;
    }
    // Checked against the user's own clock only. The server deliberately does
    // NOT re-check it: ordinary clock skew at the day boundary would otherwise
    // reject a legitimate demand.
    if (requiredDate < businessDateStr()) {
      setError('The required date cannot be in the past.');
      return;
    }

    try {
      const result = await createProductionOrder({
        items: selected.map(([productId, qty]) => ({ productId, qty, remarks: remarks.trim() })),
        requiredDate,
      });

      setQuantities({});
      setRemarks('');
      setBanner(
        result.outcome === 'synced'
          ? { tone: 'ok', text: 'Order submitted to production.' }
          : {
              tone: 'queued',
              text: 'Saved offline — it will sync automatically when you reconnect.',
            },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the order.');
    }
  };

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductQtyRow
        product={item}
        qty={quantities[item.id] ?? 0}
        onChange={qty => setQty(item.id, qty)}
      />
    ),
    [quantities, setQty],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="New order" subtitle="Demand on production" right={<MBSyncStatus />} />

      {banner ? (
        <Pressable onPress={() => setBanner(null)}>
          <View
            style={[
              styles.banner,
              {
                marginHorizontal: theme.layout.screenPad,
                borderRadius: theme.radius.md,
                backgroundColor:
                  banner.tone === 'ok' ? theme.colors.successBg : theme.colors.warningBg,
              },
            ]}>
            <Text
              accessibilityRole="alert"
              style={[
                theme.type.label,
                { color: banner.tone === 'ok' ? theme.colors.success : theme.colors.warning },
              ]}>
              {banner.text}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <View style={{ padding: theme.layout.screenPad, gap: theme.space.md }}>
        <MBInput
          label="Required by"
          required
          value={requiredDate}
          onChangeText={setRequiredDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          hint="The date this delivery is needed"
          editable={!isSaving}
        />
        <MBSearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search product"
          searching={searchInput.trim() !== search}
          testID="order-product-search"
        />
      </View>

      <View style={styles.flex}>
        {products.isPending ? (
          <MBSkeletonList rows={6} />
        ) : products.isError ? (
          <MBErrorState error={products.error} onRetry={() => products.refetch()} />
        ) : (products.data ?? []).length === 0 ? (
          <MBEmptyState title="No products match" message="Try a different name or code." />
        ) : (
          <FlashList
            data={products.data ?? []}
            renderItem={renderProduct}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ListSeparator}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            padding: theme.layout.screenPad,
          },
        ]}>
        {error ? (
          <Text accessibilityRole="alert" style={[theme.type.caption, { color: theme.colors.danger }]}>
            {error}
          </Text>
        ) : null}
        <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
          {selected.length} {selected.length === 1 ? 'product' : 'products'} selected
        </Text>
        <MBButton
          label="Submit order"
          onPress={onSubmit}
          loading={isSaving}
          disabled={selected.length === 0}
          fullWidth
          testID="submit-order"
        />
      </View>
    </View>
  );
}

function ProductQtyRow({
  product,
  qty,
  onChange,
}: {
  product: Product;
  qty: number;
  onChange: (qty: number) => void;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <MBCard>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {product.name}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{product.sku}</Text>
        </View>

        <View style={styles.stepper}>
          <Pressable
            onPress={() => onChange(qty - 1)}
            disabled={qty === 0}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${product.name}`}
            style={[
              styles.stepButton,
              qty === 0 && styles.stepButtonDisabled,
              { borderColor: theme.colors.border },
            ]}>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>−</Text>
          </Pressable>

          <Text style={[theme.type.money, styles.qty, { color: theme.colors.text }]}>{qty}</Text>

          <Pressable
            onPress={() => onChange(qty + 1)}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${product.name}`}
            style={[styles.stepButton, { borderColor: theme.colors.border }]}>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>+</Text>
          </Pressable>
        </View>
      </View>
    </MBCard>
  );
}

/** Tomorrow in business-date terms — the usual required-by date. */
function tomorrow(): string {
  const today = businessDateStr();
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { padding: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  separator: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowMain: { flex: 1, gap: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: { opacity: 0.4 },
  qty: { minWidth: 32, textAlign: 'center' },
  footer: { borderTopWidth: 1, gap: 8 },
});
