import { useMemo, useRef, useState } from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { discardAttachment, generateIdempotencyKey, uploadAttachment, useCreateBranchReturn, useProducts, useStock } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import type { Attachment, Product } from '@/api';

interface ReturnLine {
  key: string;
  product: Product | null;
  qtyInput: string;
}

let nextKey = 0;
const newLine = (): ReturnLine => ({ key: String(nextKey++), product: null, qtyInput: '1' });

const PHOTO_PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  // RETURN_PHOTO_MAX_DIMENSION / RETURN_PHOTO_QUALITY (backend attachment.types.ts)
  // — there is no separate client-side resize pass; these picker options
  // approximate the same target instead.
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.7 as const,
  includeBase64: false,
};

/** branchApp.md screen 06 — Return Items. One photo required (server-enforced unless RETURN_PHOTO_REQUIRED=false). */
export function useReturnItemsForm() {
  const products = useProducts();
  const stock = useStock();
  const createReturn = useCreateBranchReturn();

  const [lines, setLines] = useState<ReturnLine[]>([newLine()]);
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState<Attachment | null>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Minted once per submission attempt and reused on every retry.
  const idempotencyKeyRef = useRef(generateIdempotencyKey('stock_return'));

  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stock.data?.rows ?? []) map.set(row.productId, row.balance);
    return map;
  }, [stock.data]);

  const updateLine = (key: string, patch: Partial<ReturnLine>) =>
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (key: string) => setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.key !== key) : prev));

  const computedLines = useMemo(
    () =>
      lines.map((line) => ({
        ...line,
        qty: parseInt(line.qtyInput, 10) || 0,
        available: line.product ? stockByProductId.get(line.product.id) ?? 0 : null,
      })),
    [lines, stockByProductId],
  );

  const validLines = computedLines.filter((l) => l.product && l.qty > 0 && l.qty <= (l.available ?? 0));
  const totalUnits = validLines.reduce((sum, l) => sum + l.qty, 0);

  const capturePhoto = async (source: 'camera' | 'gallery') => {
    setSubmitError(null);
    setIsPickingPhoto(true);
    try {
      const result = source === 'camera' ? await launchCamera(PHOTO_PICKER_OPTIONS) : await launchImageLibrary(PHOTO_PICKER_OPTIONS);
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const attachment = await uploadAttachment('branch_return', {
        uri: asset.uri,
        type: asset.type ?? 'image/jpeg',
        fileName: asset.fileName ?? 'return.jpg',
      });
      setPhoto(attachment);
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const removePhoto = () => {
    if (photo) void discardAttachment(photo.id).catch(() => {});
    setPhoto(null);
  };

  const hasContent = validLines.length > 0;
  const canSubmit = hasContent && !!photo && !createReturn.isPending && !isPickingPhoto;

  const submit = async (): Promise<boolean> => {
    if (!canSubmit) return false;
    setSubmitError(null);

    try {
      await createReturn.mutateAsync({
        input: {
          items: validLines.map((l) => ({ productId: l.product!.id, qty: l.qty })),
          reason: reason.trim() || undefined,
          attachmentIds: photo ? [photo.id] : [],
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
    lines: computedLines,
    addLine,
    updateLine,
    removeLine,
    reason,
    setReason,
    photo,
    isPickingPhoto,
    capturePhoto,
    removePhoto,
    totalUnits,
    totalProducts: validLines.length,
    canSubmit,
    isSubmitting: createReturn.isPending,
    submitError,
    submit,
  };
}
