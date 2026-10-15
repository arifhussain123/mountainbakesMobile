import { useEffect, useMemo, useState } from 'react';
import { useMyEventDemand, useProducts, useSaveEventDemand, useSubmitEventDemand } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import type { Product } from '@/api';

interface DemandLine {
  product: Product;
  qty: number;
}

/**
 * branchApp.md screen 19 — Advance Demand. Unlike a production order's "Save
 * Draft" (no real draft state), event demands genuinely have one
 * (`EventDemandStatus: 'draft'` — confirmed in `special-events.routes.ts`'s
 * `POST /:id/demands`), so Save Draft and Submit are both wired for real here.
 */
export function useEventDemandForm(eventId: string) {
  const products = useProducts();
  const existing = useMyEventDemand(eventId);
  const saveDemand = useSaveEventDemand(eventId);
  const submitDemand = useSubmitEventDemand(eventId);

  const [lines, setLines] = useState<DemandLine[]>([]);
  const [expectedCustomers, setExpectedCustomers] = useState('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once from the server's own draft, if one exists — never overwrite
  // in-progress edits on a background refetch.
  useEffect(() => {
    if (hydrated || existing.isLoading) return;
    const demand = existing.data;
    if (demand) {
      setLines(
        demand.items
          .filter((item) => item.productId)
          .map((item) => ({ product: { id: item.productId!, name: item.productName, price: item.unitPrice ?? 0, sku: '', categoryId: null, categoryName: null, isActive: true }, qty: item.qty })),
      );
      setExpectedCustomers(demand.expectedCustomers != null ? String(demand.expectedCustomers) : '');
      setNotes(demand.notes ?? '');
    }
    setHydrated(true);
  }, [existing.data, existing.isLoading, hydrated]);

  const existingDemandId = existing.data?.id ?? null;
  const isSubmitted = existing.data?.status !== undefined && existing.data.status !== 'draft';

  const excludeIds = useMemo(() => new Set(lines.map((l) => l.product.id)), [lines]);

  const addProduct = (product: Product) => setLines((prev) => [...prev, { product, qty: 1 }]);
  const updateQty = (productId: string, qty: number) =>
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, qty: Math.max(1, qty) } : l)));
  const removeLine = (productId: string) => setLines((prev) => prev.filter((l) => l.product.id !== productId));

  const canSave = lines.length > 0 && !isSubmitted && !saveDemand.isPending;
  const canSubmit = lines.length > 0 && !isSubmitted && !submitDemand.isPending;

  const saveDraft = async (): Promise<boolean> => {
    if (!canSave) return false;
    setSubmitError(null);
    try {
      await saveDemand.mutateAsync({
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
        expectedCustomers: expectedCustomers.trim() ? parseInt(expectedCustomers, 10) : null,
        notes: notes.trim() || undefined,
      });
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  const submit = async (): Promise<boolean> => {
    if (!canSubmit) return false;
    setSubmitError(null);
    try {
      const saved = await saveDemand.mutateAsync({
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
        expectedCustomers: expectedCustomers.trim() ? parseInt(expectedCustomers, 10) : null,
        notes: notes.trim() || undefined,
      });
      await submitDemand.mutateAsync(saved.id);
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    products: products.data?.products ?? [],
    lines,
    excludeIds,
    addProduct,
    updateQty,
    removeLine,
    expectedCustomers,
    setExpectedCustomers,
    notes,
    setNotes,
    isSubmitted,
    existingDemandId,
    canSave,
    canSubmit,
    isSavingDraft: saveDemand.isPending,
    isSubmitting: submitDemand.isPending,
    submitError,
    saveDraft,
    submit,
  };
}
