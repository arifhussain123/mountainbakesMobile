import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { launchCamera, launchImageLibrary, type Asset } from 'react-native-image-picker';
import {
  QUEUED_RETURN_ENDPOINT,
  discardAttachment,
  enqueueOfflineWrite,
  generateIdempotencyKey,
  getBusinessDate,
  isApiError,
  unavailableAttachmentIds,
  uploadAttachment,
  useCreateBranchReturn,
  useProducts,
  useStock,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useNetworkStatus } from '@/shared/hooks';
import { deleteLocalPhotos, saveLocalPhoto } from '@/shared/offline';
import type { Attachment, Product, QueuedReturnLine, QueuedReturnPayload } from '@/api';

export type ReturnPhotoSource = 'camera' | 'gallery';

/**
 * - `uploading` — on its way to the server (Save waits for it).
 * - `uploaded` — staged on the server; its id goes on the line.
 * - `saved_locally` — no connection: kept on the phone, uploaded when the
 *   connection returns or, if Save comes first, by the queued return.
 * - `failed` — the server refused it (too big, HEIC…) or the upload broke; Retry or retake.
 */
export type ReturnPhotoStatus = 'uploading' | 'uploaded' | 'saved_locally' | 'failed';

export interface ReturnLinePhoto {
  /** New for every capture, so a late answer for a retaken photo never lands on its replacement. */
  captureId: string;
  source: ReturnPhotoSource;
  /** The picker's local file — the thumbnail and the online upload read it. */
  previewUri: string;
  status: ReturnPhotoStatus;
  /** 0–1 while uploading; null until the platform reports progress. */
  progress: number | null;
  attachment: Attachment | null;
  error: string | null;
}

interface ReturnLine {
  key: string;
  product: Product | null;
  qtyInput: string;
  photo: ReturnLinePhoto | null;
}

/** A photo just taken or picked, waiting for "Use photo" / "Retake". */
export interface PendingReturnPhoto {
  lineKey: string;
  source: ReturnPhotoSource;
  captureId: string;
  previewUri: string;
}

export type CapturePhotoOutcome = 'captured' | 'cancelled' | 'permission_denied' | 'camera_unavailable' | 'failed';

export type SubmitReturnOutcome =
  | { status: 'saved' }
  | { status: 'queued' }
  | { status: 'blocked'; firstMissingPhotoKey: string | null }
  | { status: 'error' };

/** The picked file's bytes, kept in memory (not state) until the return is saved or queued. */
interface CapturedFile {
  uri: string;
  mimeType: string;
  fileName: string;
  base64: string;
}

let nextKey = 0;
let nextCaptureId = 0;
const newLine = (): ReturnLine => ({ key: String(nextKey++), product: null, qtyInput: '1', photo: null });

/** RETURN_PHOTO_MAX_DIMENSION / RETURN_PHOTO_MAX_BYTES (backend attachment.types.ts). */
const RETURN_PHOTO_MAX_DIMENSION = 1280;
const RETURN_PHOTO_MAX_BYTES = 1024 * 1024;

const PHOTO_PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  // RETURN_PHOTO_MAX_DIMENSION / RETURN_PHOTO_QUALITY — there is no separate
  // client-side resize pass; these picker options approximate the same
  // target instead. A quality below 1 also makes the picker re-encode EVERY
  // photo from decoded pixels (Android: Bitmap.compress, re-adding only the
  // orientation tag; iOS: UIImageJPEGRepresentation of a UIImage), which is
  // what drops EXIF location — see `checkPickedAsset` for the one way past it.
  maxWidth: RETURN_PHOTO_MAX_DIMENSION,
  maxHeight: RETURN_PHOTO_MAX_DIMENSION,
  quality: 0.7 as const,
  // Kept in memory so an offline Save can store the photo in the app's own
  // SQLite file (the picker's copy sits in a cache the OS may empty).
  includeBase64: true,
};

/**
 * Android's picker falls back to the ORIGINAL file — every EXIF tag,
 * location included — when its resize step throws. Such a file is larger
 * than the resize target, so it is refused here rather than uploaded.
 */
function checkPickedAsset(asset: Asset): string | null {
  if ((asset.width ?? 0) > RETURN_PHOTO_MAX_DIMENSION || (asset.height ?? 0) > RETURN_PHOTO_MAX_DIMENSION) {
    return 'This photo could not be prepared on the phone. Take it again, or pick another.';
  }
  if ((asset.fileSize ?? 0) > RETURN_PHOTO_MAX_BYTES) return 'This photo is larger than 1 MB. Take it again, or pick another.';
  return null;
}

/** iOS reports the non-standard `image/jpg`. */
function normalizeMimeType(type: string | undefined): string {
  if (!type || type === 'image/jpg') return 'image/jpeg';
  return type;
}

const isPhotoReady = (photo: ReturnLinePhoto | null) => photo?.status === 'uploaded' || photo?.status === 'saved_locally';

/**
 * branchApp.md screen 06 — Return Items. Every product line needs its OWN
 * photo (server-enforced: `photo_required`), uploaded the moment it is
 * confirmed. Offline — or when the connection drops at Save — the return is
 * queued with its photos kept on the phone; `executeQueuedBranchReturn`
 * uploads them and posts it later.
 */
export function useReturnItemsForm() {
  const products = useProducts();
  const stock = useStock();
  const createReturn = useCreateBranchReturn();
  const { isOffline } = useNetworkStatus();

  const [lines, setLines] = useState<ReturnLine[]>(() => [newLine()]);
  const [reason, setReason] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<PendingReturnPhoto | null>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [captureErrors, setCaptureErrors] = useState<Record<string, string>>({});
  const [showPhotoErrors, setShowPhotoErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Minted once per form and reused on every retry — replaced only when the
  // server proves nothing was saved under it (`attachment_unavailable`).
  const idempotencyKeyRef = useRef(generateIdempotencyKey('stock_return'));
  const capturesRef = useRef(new Map<string, CapturedFile>());
  const uploadsRef = useRef(new Map<string, AbortController>());
  /** Captures currently attached to a line — an upload finishing for one that is not gets discarded. */
  const liveCapturesRef = useRef(new Set<string>());
  /** Set once the return is saved or queued: from then on its uploads belong to it, not to this form. */
  const committedRef = useRef(false);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stock.data?.rows ?? []) map.set(row.productId, row.balance);
    return map;
  }, [stock.data]);

  const patchPhoto = useCallback((lineKey: string, captureId: string, patch: Partial<ReturnLinePhoto>) => {
    setLines((prev) =>
      prev.map((line) => (line.key === lineKey && line.photo?.captureId === captureId ? { ...line, photo: { ...line.photo, ...patch } } : line)),
    );
  }, []);

  /** Lets go of a photo: cancels its upload, discards it on the server (best-effort) and forgets its bytes. */
  const releasePhoto = useCallback((photo: ReturnLinePhoto | null) => {
    if (!photo) return;
    uploadsRef.current.get(photo.captureId)?.abort();
    uploadsRef.current.delete(photo.captureId);
    liveCapturesRef.current.delete(photo.captureId);
    capturesRef.current.delete(photo.captureId);
    if (photo.attachment) void discardAttachment(photo.attachment.id).catch(() => {});
  }, []);

  /** Uploads one capture; resolves to the staged attachment, or null if it failed or was cancelled. */
  const uploadCapture = useCallback(
    async (lineKey: string, captureId: string): Promise<Attachment | null> => {
      const file = capturesRef.current.get(captureId);
      if (!file) return null;
      uploadsRef.current.get(captureId)?.abort();
      const controller = new AbortController();
      uploadsRef.current.set(captureId, controller);
      patchPhoto(lineKey, captureId, { status: 'uploading', progress: null, error: null });
      try {
        const attachment = await uploadAttachment(
          'branch_return',
          { uri: file.uri, type: file.mimeType, fileName: file.fileName },
          { signal: controller.signal, onProgress: (progress) => patchPhoto(lineKey, captureId, { progress }) },
        );
        if (controller.signal.aborted || !liveCapturesRef.current.has(captureId)) {
          void discardAttachment(attachment.id).catch(() => {});
          return null;
        }
        patchPhoto(lineKey, captureId, { status: 'uploaded', progress: 1, attachment });
        return attachment;
      } catch (error) {
        if (controller.signal.aborted) return null;
        const offline = isApiError(error) && error.status === null;
        patchPhoto(lineKey, captureId, offline ? { status: 'saved_locally', progress: null } : { status: 'failed', progress: null, error: mapErrorToMessage(error) });
        return null;
      } finally {
        if (uploadsRef.current.get(captureId) === controller) uploadsRef.current.delete(captureId);
      }
    },
    [patchPhoto],
  );

  // Back online with the form still open: send what was kept on the phone.
  useEffect(() => {
    if (isOffline) return;
    for (const line of linesRef.current) {
      if (line.photo?.status === 'saved_locally') void uploadCapture(line.key, line.photo.captureId);
    }
  }, [isOffline, uploadCapture]);

  // Closed without saving: the staged uploads are discarded (the server would sweep them after 24 h anyway).
  useEffect(
    () => () => {
      if (committedRef.current) return;
      for (const line of linesRef.current) releasePhoto(line.photo);
    },
    [releasePhoto],
  );

  const updateLine = (key: string, patch: Partial<Pick<ReturnLine, 'product' | 'qtyInput'>>) =>
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (key: string) => {
    const line = linesRef.current.find((l) => l.key === key);
    if (!line) return;
    releasePhoto(line.photo);
    // The last line is emptied rather than removed — the form always has one.
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : [newLine()]));
  };

  const capturePhoto = async (lineKey: string, source: ReturnPhotoSource): Promise<CapturePhotoOutcome> => {
    setCaptureErrors(({ [lineKey]: _cleared, ...rest }) => rest);
    setSubmitError(null);
    setIsPickingPhoto(true);
    const fail = (message: string): CapturePhotoOutcome => {
      setCaptureErrors((prev) => ({ ...prev, [lineKey]: message }));
      return 'failed';
    };
    try {
      const result = source === 'camera' ? await launchCamera(PHOTO_PICKER_OPTIONS) : await launchImageLibrary(PHOTO_PICKER_OPTIONS);
      if (result.didCancel) return 'cancelled';
      if (result.errorCode === 'permission') return 'permission_denied';
      if (result.errorCode === 'camera_unavailable') return 'camera_unavailable';
      if (result.errorCode) return fail(result.errorMessage || 'The photo could not be taken. Please try again.');
      const asset = result.assets?.[0];
      if (!asset?.uri || !asset.base64) return fail('That photo could not be read. Please try again.');
      const problem = checkPickedAsset(asset);
      if (problem) return fail(problem);

      const captureId = `${lineKey}-${nextCaptureId++}`;
      capturesRef.current.set(captureId, {
        uri: asset.uri,
        mimeType: normalizeMimeType(asset.type),
        fileName: asset.fileName ?? 'return.jpg',
        base64: asset.base64,
      });
      setPendingPhoto({ lineKey, source, captureId, previewUri: asset.uri });
      return 'captured';
    } catch (error) {
      return fail(mapErrorToMessage(error));
    } finally {
      setIsPickingPhoto(false);
    }
  };

  /** "Use photo": attaches the pending capture to its line (replacing any earlier photo) and starts its upload. */
  const confirmPendingPhoto = () => {
    const pending = pendingPhoto;
    if (!pending) return;
    setPendingPhoto(null);
    const line = linesRef.current.find((l) => l.key === pending.lineKey);
    if (!line) {
      capturesRef.current.delete(pending.captureId);
      return;
    }
    releasePhoto(line.photo);
    liveCapturesRef.current.add(pending.captureId);
    const photo: ReturnLinePhoto = {
      captureId: pending.captureId,
      source: pending.source,
      previewUri: pending.previewUri,
      status: isOffline ? 'saved_locally' : 'uploading',
      progress: null,
      attachment: null,
      error: null,
    };
    setLines((prev) => prev.map((l) => (l.key === pending.lineKey ? { ...l, photo } : l)));
    if (!isOffline) void uploadCapture(pending.lineKey, pending.captureId);
  };

  /** Drops the pending capture without touching the line's current photo. */
  const discardPendingPhoto = () => {
    if (pendingPhoto) capturesRef.current.delete(pendingPhoto.captureId);
    setPendingPhoto(null);
  };

  /** "Retake" on the confirm step — drops the pending capture and opens the same source again. */
  const retakePendingPhoto = () => {
    const pending = pendingPhoto;
    if (!pending) return Promise.resolve<CapturePhotoOutcome>('cancelled');
    discardPendingPhoto();
    return capturePhoto(pending.lineKey, pending.source);
  };

  const removePhoto = (lineKey: string) => {
    const line = linesRef.current.find((l) => l.key === lineKey);
    if (!line?.photo) return;
    releasePhoto(line.photo);
    setLines((prev) => prev.map((l) => (l.key === lineKey ? { ...l, photo: null } : l)));
  };

  const retryUpload = (lineKey: string) => {
    const photo = linesRef.current.find((l) => l.key === lineKey)?.photo;
    if (photo) void uploadCapture(lineKey, photo.captureId);
  };

  const computedLines = useMemo(() => {
    const seen = new Set<string>();
    return lines.map((line) => {
      const productId = line.product?.id ?? null;
      const isDuplicate = productId != null && seen.has(productId);
      if (productId) seen.add(productId);
      const qty = parseInt(line.qtyInput, 10) || 0;
      const available = line.product ? stockByProductId.get(line.product.id) ?? 0 : null;
      return { ...line, qty, available, isDuplicate, overAvailable: available != null && qty > available };
    });
  }, [lines, stockByProductId]);

  // Lines without a product are blank rows — ignored, never sent.
  const submitLines = computedLines.filter((l) => l.product && l.qty > 0);
  const missingPhotoKeys = submitLines.filter((l) => !isPhotoReady(l.photo) && l.photo?.status !== 'uploading').map((l) => l.key);
  const photosReady = submitLines.filter((l) => isPhotoReady(l.photo)).length;
  const isUploading = submitLines.some((l) => l.photo?.status === 'uploading');
  const hasDuplicates = computedLines.some((l) => l.isDuplicate);
  const hasOverAvailable = submitLines.some((l) => l.overAvailable);
  const totalUnits = submitLines.reduce((sum, l) => sum + l.qty, 0);

  /** Everything but photos is in order — Save stays tappable then, to point at the line still missing one. */
  const blockedOnlyByPhotos = submitLines.length > 0 && !hasDuplicates && !hasOverAvailable && missingPhotoKeys.length > 0;
  const canSubmit =
    submitLines.length > 0 && !hasDuplicates && !hasOverAvailable && missingPhotoKeys.length === 0 && !isUploading && !isSubmitting && !isPickingPhoto;

  /** Files the return in the offline write queue, keeping every line's photo in the app's SQLite file. */
  const queueReturn = async (attachmentIdByKey: Map<string, string>): Promise<SubmitReturnOutcome> => {
    const idempotencyKey = idempotencyKeyRef.current;
    const items: QueuedReturnLine[] = [];
    try {
      for (const line of submitLines) {
        const file = capturesRef.current.get(line.photo!.captureId);
        if (!file) throw new Error(`The photo of ${line.product!.name} is missing. Take it again.`);
        const localPhotoId = `${idempotencyKey}:${line.key}`;
        await saveLocalPhoto({ id: localPhotoId, mimeType: file.mimeType, base64: file.base64 });
        items.push({
          productId: line.product!.id,
          productName: line.product!.name,
          qty: line.qty,
          localPhotoId,
          mimeType: file.mimeType,
          attachmentId: attachmentIdByKey.get(line.key) ?? null,
        });
      }
      const payload: QueuedReturnPayload = { kind: 'branch_return', items, reason: reason.trim() || undefined, businessDate: getBusinessDate() };
      await enqueueOfflineWrite({ endpoint: QUEUED_RETURN_ENDPOINT, method: 'post', payload, idempotencyKey, invalidateKeys: [['stock'], ['branchReturns']] });
    } catch (error) {
      void deleteLocalPhotos(items.map((item) => item.localPhotoId)).catch(() => {});
      setSubmitError(error instanceof Error ? error.message : mapErrorToMessage(error));
      return { status: 'error' };
    }
    committedRef.current = true;
    for (const line of submitLines) uploadsRef.current.get(line.photo!.captureId)?.abort();
    return { status: 'queued' };
  };

  const submit = async (): Promise<SubmitReturnOutcome> => {
    if (isSubmitting) return { status: 'blocked', firstMissingPhotoKey: null };
    if (blockedOnlyByPhotos) {
      setShowPhotoErrors(true);
      return { status: 'blocked', firstMissingPhotoKey: missingPhotoKeys[0] };
    }
    if (!canSubmit) return { status: 'blocked', firstMissingPhotoKey: null };
    setSubmitError(null);
    setIsSubmitting(true);

    const attachmentIdByKey = new Map<string, string>();
    for (const line of submitLines) if (line.photo?.attachment) attachmentIdByKey.set(line.key, line.photo.attachment.id);

    try {
      // Offline, or a photo still only on the phone: straight to the queue.
      if (isOffline || attachmentIdByKey.size < submitLines.length) return await queueReturn(attachmentIdByKey);

      for (let attempt = 0; ; attempt++) {
        try {
          await createReturn.mutateAsync({
            input: {
              items: submitLines.map((l) => ({ productId: l.product!.id, qty: l.qty, attachmentId: attachmentIdByKey.get(l.key) })),
              reason: reason.trim() || undefined,
            },
            idempotencyKey: idempotencyKeyRef.current,
          });
          committedRef.current = true;
          return { status: 'saved' };
        } catch (error) {
          // The connection dropped mid-save: queue it under the SAME key and
          // body, so a save that did land is answered as a replay, not doubled.
          if (isApiError(error) && error.status === null) return await queueReturn(attachmentIdByKey);

          const gone = attempt === 0 ? unavailableAttachmentIds(error, [...attachmentIdByKey.values()]) : null;
          if (!gone) {
            if (isApiError(error) && (error.code === 'photo_required' || error.code === 'photo_per_line_required')) setShowPhotoErrors(true);
            setSubmitError(mapErrorToMessage(error));
            return { status: 'error' };
          }
          // Those photos expired on the server before Save — upload them again
          // and resubmit under a fresh key (the 409 means nothing was saved).
          for (const line of submitLines) {
            if (!gone.includes(attachmentIdByKey.get(line.key) ?? '')) continue;
            const attachment = await uploadCapture(line.key, line.photo!.captureId);
            if (!attachment) {
              setSubmitError(`The photo of ${line.product!.name} could not be uploaded again. Tap Retry on that line, then Save.`);
              return { status: 'error' };
            }
            attachmentIdByKey.set(line.key, attachment.id);
          }
          idempotencyKeyRef.current = generateIdempotencyKey('stock_return');
        }
      }
    } finally {
      setIsSubmitting(false);
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
    isOffline,
    isPickingPhoto,
    pendingPhoto,
    capturePhoto,
    confirmPendingPhoto,
    retakePendingPhoto,
    discardPendingPhoto,
    removePhoto,
    retryUpload,
    captureErrors,
    showPhotoErrors,
    missingPhotoKeys,
    photosReady,
    photosTotal: submitLines.length,
    isUploading,
    totalUnits,
    totalProducts: submitLines.length,
    canSubmit,
    blockedOnlyByPhotos,
    isSubmitting,
    submitError,
    submit,
  };
}
