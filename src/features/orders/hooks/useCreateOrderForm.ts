import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueueOfflineWrite, generateIdempotencyKey, getBusinessDate, isApiError, useCreateProductionOrder, usePackingMaterials, useProducts, useStock } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useNetworkStatus } from '@/shared/hooks';
import { logger } from '@/shared/utils';
import type { PackingMaterial, Product } from '@/api';

interface PackingRow {
  key: string;
  material: PackingMaterial | null;
  qtyInput: string;
}

interface SpecialOrderRow {
  key: string;
  name: string;
  qtyInput: string;
}

interface CreateOrderDraft {
  qtyByProductId: Record<string, string>;
  packingRows: { materialId: string | null; qtyInput: string }[];
  specialOrderRows: { name: string; qtyInput: string }[];
  requiredDate: string;
  savedAt: string;
}

const DRAFT_STORAGE_KEY = 'mountainbakes.createOrderDraft';

let nextKey = 0;
const newPackingRow = (): PackingRow => ({ key: String(nextKey++), material: null, qtyInput: '' });
const newSpecialOrderRow = (): SpecialOrderRow => ({ key: String(nextKey++), name: '', qtyInput: '' });

/**
 * branchApp.md screen 05 — Create New Production Order.
 *
 * "Special Order Items" is captured here (free-text name + qty, local state
 * only) but deliberately NOT sent on submit: `CreateProductionOrderSchema`
 * only knows `items`/`packingItems`/`requiredDate`, and there is no backend
 * `specialItems` field on this route — that's `POST /api/special-orders`, a
 * separate, not-yet-built mobile feature. Rows typed here still round-trip
 * through "Save Draft" so nothing is lost while that lands.
 *
 * "Save Draft" has no backend draft status either (`production_orders` goes
 * straight to 'pending' on create) — it persists the in-progress form to
 * on-device storage (AsyncStorage, same mechanism `authStore` already uses)
 * and restores it the next time this sheet is opened, clearing itself once
 * the order is actually submitted.
 */
export function useCreateOrderForm() {
  const products = useProducts();
  const stock = useStock();
  const packingMaterials = usePackingMaterials();
  const createOrder = useCreateProductionOrder();
  const { isOffline } = useNetworkStatus();

  const [qtyByProductId, setQtyByProductId] = useState<Record<string, string>>({});
  const [packingRows, setPackingRows] = useState<PackingRow[]>([]);
  const [specialOrderRows, setSpecialOrderRows] = useState<SpecialOrderRow[]>([]);
  const [requiredDate, setRequiredDate] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  /** Set once a submission lands in the offline queue instead of going straight to the server, so the caller can show "Saved, will submit when you're online." rather than the normal success message. */
  const [wasQueuedOffline, setWasQueuedOffline] = useState(false);

  // Materials for packing rows restored from a draft can only be resolved
  // once `packingMaterials` has loaded — this holds the ids until then.
  const pendingPackingMaterialIds = useRef<(string | null)[] | null>(null);

  // Minted once per submission attempt and reused on every retry.
  const idempotencyKeyRef = useRef(generateIdempotencyKey('production_order'));

  // Restore a locally-saved draft once, on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw || cancelled) return;
        const draft: CreateOrderDraft = JSON.parse(raw);
        setQtyByProductId(draft.qtyByProductId ?? {});
        setRequiredDate(draft.requiredDate ?? '');
        setSpecialOrderRows((draft.specialOrderRows ?? []).map((r) => ({ key: String(nextKey++), name: r.name, qtyInput: r.qtyInput })));
        pendingPackingMaterialIds.current = (draft.packingRows ?? []).map((r) => r.materialId);
        setPackingRows((draft.packingRows ?? []).map((r) => ({ key: String(nextKey++), material: null, qtyInput: r.qtyInput })));
        setDraftSavedAt(draft.savedAt ?? null);
      } catch (error) {
        logger.warn('failed to restore create-order draft', { error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Once packing materials load, resolve the material objects for any rows restored from a draft.
  useEffect(() => {
    if (!pendingPackingMaterialIds.current || !packingMaterials.data) return;
    const ids = pendingPackingMaterialIds.current;
    pendingPackingMaterialIds.current = null;
    const available = packingMaterials.data.packingMaterials;
    setPackingRows((prev) => prev.map((row, i) => ({ ...row, material: available.find((m) => m.id === ids[i]) ?? null })));
  }, [packingMaterials.data]);

  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stock.data?.rows ?? []) map.set(row.productId, row.balance);
    return map;
  }, [stock.data]);

  const setProductQty = (productId: string, text: string) => {
    setQtyByProductId((prev) => ({ ...prev, [productId]: text }));
  };

  const productLines = useMemo(() => {
    return (products.data?.products ?? [])
      .map((product: Product) => ({ product, qty: parseInt(qtyByProductId[product.id] ?? '', 10) || 0 }))
      .filter((line) => line.qty > 0);
  }, [products.data, qtyByProductId]);

  const addPackingRow = () => setPackingRows((prev) => [...prev, newPackingRow()]);
  const updatePackingRow = (key: string, patch: Partial<PackingRow>) =>
    setPackingRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const removePackingRow = (key: string) => setPackingRows((prev) => prev.filter((row) => row.key !== key));

  const addSpecialOrderRow = () => setSpecialOrderRows((prev) => [...prev, newSpecialOrderRow()]);
  const updateSpecialOrderRow = (key: string, patch: Partial<SpecialOrderRow>) =>
    setSpecialOrderRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const removeSpecialOrderRow = (key: string) => setSpecialOrderRows((prev) => prev.filter((row) => row.key !== key));

  const validPackingRows = useMemo(
    () => packingRows.filter((row) => row.material && (parseInt(row.qtyInput, 10) || 0) > 0),
    [packingRows],
  );

  const totalProducts = productLines.length;
  const totalQty = productLines.reduce((sum, l) => sum + l.qty, 0);
  const totalAmount = productLines.reduce((sum, l) => sum + l.qty * l.product.price, 0);

  const hasContent = totalProducts > 0 || validPackingRows.length > 0;
  const requiredDateValid = /^\d{4}-\d{2}-\d{2}$/.test(requiredDate.trim());
  const requiredDateError = !requiredDateValid;
  const canSubmit = hasContent && requiredDateValid && !createOrder.isPending;

  const clear = () => {
    setQtyByProductId({});
    setPackingRows([]);
    setSpecialOrderRows([]);
    setRequiredDate('');
    setSubmitError(null);
  };

  const saveDraft = async (): Promise<boolean> => {
    setIsSavingDraft(true);
    try {
      const draft: CreateOrderDraft = {
        qtyByProductId,
        packingRows: packingRows.map((r) => ({ materialId: r.material?.id ?? null, qtyInput: r.qtyInput })),
        specialOrderRows: specialOrderRows.map((r) => ({ name: r.name, qtyInput: r.qtyInput })),
        requiredDate,
        savedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setDraftSavedAt(draft.savedAt);
      return true;
    } catch (error) {
      logger.warn('failed to save create-order draft', { error });
      return false;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const clearDraftAfterSubmit = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Non-fatal — a stale draft just gets overwritten next save.
    }
    setDraftSavedAt(null);
  };

  const submit = async (): Promise<boolean> => {
    if (!canSubmit) return false;
    setSubmitError(null);
    setWasQueuedOffline(false);

    const payload = {
      items: productLines.map((l) => ({ productId: l.product.id, qty: l.qty })),
      packingItems: validPackingRows.map((r) => ({ packingMaterialId: r.material!.id, qty: parseInt(r.qtyInput, 10) || 0 })),
      requiredDate: requiredDate.trim(),
      businessDate: getBusinessDate(),
    };

    // Offline-first: a known-offline device never attempts the network call at
    // all — it goes straight into the sync queue (idempotency key reused on
    // every later retry, so reconnecting cannot double-submit the demand).
    if (isOffline) {
      try {
        await enqueueOfflineWrite({
          endpoint: '/production-orders',
          method: 'post',
          payload,
          idempotencyKey: idempotencyKeyRef.current,
          invalidateKeys: [['productionOrders']],
        });
        await clearDraftAfterSubmit();
        setWasQueuedOffline(true);
        return true;
      } catch (error) {
        setSubmitError(mapErrorToMessage(error));
        return false;
      }
    }

    try {
      await createOrder.mutateAsync({ input: payload, idempotencyKey: idempotencyKeyRef.current });
      await clearDraftAfterSubmit();
      return true;
    } catch (error) {
      // The network dropped between tapping Submit and the request landing —
      // fall back to the same queue path rather than surfacing an error for a
      // demand the branch already finished filling in.
      if (isApiError(error) && error.status === null) {
        try {
          await enqueueOfflineWrite({
            endpoint: '/production-orders',
            method: 'post',
            payload,
            idempotencyKey: idempotencyKeyRef.current,
            invalidateKeys: [['productionOrders']],
          });
          await clearDraftAfterSubmit();
          setWasQueuedOffline(true);
          return true;
        } catch (queueError) {
          setSubmitError(mapErrorToMessage(queueError));
          return false;
        }
      }
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    products: products.data?.products ?? [],
    stockByProductId,
    qtyByProductId,
    setProductQty,
    packingMaterials: packingMaterials.data?.packingMaterials ?? [],
    packingRows,
    addPackingRow,
    updatePackingRow,
    removePackingRow,
    specialOrderRows,
    addSpecialOrderRow,
    updateSpecialOrderRow,
    removeSpecialOrderRow,
    requiredDate,
    setRequiredDate,
    requiredDateError,
    totalProducts,
    totalQty,
    totalAmount,
    canSubmit,
    isSubmitting: createOrder.isPending,
    submitError,
    wasQueuedOffline,
    submit,
    clear,
    isSavingDraft,
    draftSavedAt,
    saveDraft,
  };
}
