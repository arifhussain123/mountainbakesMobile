import { useMemo, useRef, useState } from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { discardAttachment, generateIdempotencyKey, uploadAttachment, useVerifyProductionOrder } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import type { Attachment, ProductionOrder } from '@/api';
import { effectiveQty, liveItems } from '../utils/demandLines';

const PHOTO_PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8 as const,
  includeBase64: false,
};

/**
 * branchApp.md "Verify Delivery" — the branch counts what physically arrived
 * against an 'awaiting_verification' demand. One photo of the delivery is
 * required, same rule as Return Items and Cash Deposit.
 *
 * Adding an item that arrived unrequested (`newItems` on the API) is
 * deliberately not exposed here yet — this covers the common path (confirming
 * or correcting the demanded lines); flagged in the implementation summary.
 */
export function useVerifyDeliveryForm(order: ProductionOrder) {
  const verify = useVerifyProductionOrder();

  const initialQty = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of liveItems(order.items)) {
      map[item.productId] = String(effectiveQty(item));
    }
    return map;
  }, [order.items]);

  const [verifiedQtyById, setVerifiedQtyById] = useState<Record<string, string>>(initialQty);
  const [photo, setPhoto] = useState<Attachment | null>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const idempotencyKeyRef = useRef(generateIdempotencyKey('production_order_verify'));

  const setVerifiedQty = (productId: string, text: string) => {
    setVerifiedQtyById((prev) => ({ ...prev, [productId]: text.replace(/\D/g, '') }));
  };

  const capturePhoto = async (source: 'camera' | 'gallery') => {
    setSubmitError(null);
    setIsPickingPhoto(true);
    try {
      const result = source === 'camera' ? await launchCamera(PHOTO_PICKER_OPTIONS) : await launchImageLibrary(PHOTO_PICKER_OPTIONS);
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const attachment = await uploadAttachment('production_order_verification', {
        uri: asset.uri,
        type: asset.type ?? 'image/jpeg',
        fileName: asset.fileName ?? 'verification.jpg',
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

  const canSubmit = !!photo && !verify.isPending && !isPickingPhoto;

  const submit = async (): Promise<boolean> => {
    if (!canSubmit) return false;
    setSubmitError(null);
    try {
      await verify.mutateAsync({
        id: order.id,
        input: {
          verifiedItems: liveItems(order.items).map((item) => ({
            productId: item.productId,
            verifiedQty: parseInt(verifiedQtyById[item.productId] ?? '', 10) || 0,
          })),
          newItems: [],
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
    verifiedQtyById,
    setVerifiedQty,
    photo,
    isPickingPhoto,
    capturePhoto,
    removePhoto,
    canSubmit,
    isSubmitting: verify.isPending,
    submitError,
    submit,
  };
}
