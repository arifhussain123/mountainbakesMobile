import { useMemo, useRef, useState } from 'react';
import { generateIdempotencyKey, useCreateProductionOrder, usePackingMaterials, useProducts, useStock } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import type { PackingMaterial, Product } from '@/api';

interface PackingRow {
  key: string;
  material: PackingMaterial | null;
  qtyInput: string;
}

let nextKey = 0;
const newPackingRow = (): PackingRow => ({ key: String(nextKey++), material: null, qtyInput: '' });

/**
 * branchApp.md screen 05 — Create New Production Order. "Save Draft" and
 * "Special Order Items" from the HTML reference are deliberately NOT wired:
 * `production_orders` has no draft status (it goes straight to 'pending'), and
 * CreateProductionOrderSchema rejects a non-empty specialItems — that flow is
 * `POST /api/special-orders`, a separate feature out of this slice's scope.
 */
export function useCreateOrderForm() {
  const products = useProducts();
  const stock = useStock();
  const packingMaterials = usePackingMaterials();
  const createOrder = useCreateProductionOrder();

  const [qtyByProductId, setQtyByProductId] = useState<Record<string, string>>({});
  const [packingRows, setPackingRows] = useState<PackingRow[]>([]);
  const [requiredDate, setRequiredDate] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Minted once per submission attempt and reused on every retry.
  const idempotencyKeyRef = useRef(generateIdempotencyKey('production_order'));

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

  const validPackingRows = useMemo(
    () => packingRows.filter((row) => row.material && (parseInt(row.qtyInput, 10) || 0) > 0),
    [packingRows],
  );

  const totalProducts = productLines.length;
  const totalQty = productLines.reduce((sum, l) => sum + l.qty, 0);
  const totalAmount = productLines.reduce((sum, l) => sum + l.qty * l.product.price, 0);

  const hasContent = totalProducts > 0 || validPackingRows.length > 0;
  const requiredDateValid = /^\d{4}-\d{2}-\d{2}$/.test(requiredDate.trim());
  const canSubmit = hasContent && requiredDateValid && !createOrder.isPending;

  const clear = () => {
    setQtyByProductId({});
    setPackingRows([]);
    setRequiredDate('');
    setSubmitError(null);
  };

  const submit = async (): Promise<boolean> => {
    if (!canSubmit) return false;
    setSubmitError(null);

    try {
      await createOrder.mutateAsync({
        input: {
          items: productLines.map((l) => ({ productId: l.product.id, qty: l.qty })),
          packingItems: validPackingRows.map((r) => ({ packingMaterialId: r.material!.id, qty: parseInt(r.qtyInput, 10) || 0 })),
          requiredDate: requiredDate.trim(),
        },
        idempotencyKey: idempotencyKeyRef.current,
      });
      return true;
    } catch (error) {
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
    requiredDate,
    setRequiredDate,
    totalProducts,
    totalQty,
    totalAmount,
    canSubmit,
    isSubmitting: createOrder.isPending,
    submitError,
    submit,
    clear,
  };
}
