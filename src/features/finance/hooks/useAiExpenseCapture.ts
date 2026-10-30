import { useState } from 'react';
import { launchCamera, launchImageLibrary, type Asset } from 'react-native-image-picker';
import {
  AI_CAPTURE_MAX_PHOTOS,
  discardAttachment,
  copyReceiptPhoto,
  uploadAttachment,
  useAnalyzeReceipts,
  useCreateFinanceTransaction,
  type AiCaptureResult,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { canCombine, combineDrafts, createBody, draftFromProposal, splitDraft, summarize, type AiDraft } from '../utils/aiCaptureDraft';

/**
 * Receipts are read by the AI as well as by people: the documents' stored size
 * (2000px) rather than the 1600px the plain entry form takes, so small print
 * survives.
 */
const PICKER_OPTIONS = { mediaType: 'photo' as const, maxWidth: 2000, maxHeight: 2000, quality: 0.8 as const, includeBase64: false };

export interface CapturePhoto {
  localId: string;
  /** The picked file on the phone, for the thumbnail. */
  uri: string;
  status: 'uploading' | 'ready' | 'error';
  attachmentId: string | null;
  error: string | null;
  analyzed: boolean;
  readable: boolean | null;
  note: string | null;
  saved: boolean;
}

let seq = 0;
const localId = () => `photo-${Date.now()}-${++seq}`;

/**
 * AI Expense Capture on the phone — the same flow as the web page
 * (frontend components/finance/ai-capture/AiExpenseCapturePage.tsx):
 * pick or photograph receipts (each uploaded as it is picked), Generate reads
 * them on the server, each proposal is a card to edit and approve, and Save
 * Approved saves each approved card once through the ordinary entry create,
 * as a draft, under the card's own Idempotency-Key.
 */
export function useAiExpenseCapture() {
  const analyze = useAnalyzeReceipts();
  const create = useCreateFinanceTransaction();
  const [photos, setPhotos] = useState<CapturePhoto[]>([]);
  const [drafts, setDrafts] = useState<AiDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const patchPhoto = (id: string, patch: Partial<CapturePhoto>) =>
    setPhotos((list) => list.map((p) => (p.localId === id ? { ...p, ...patch } : p)));
  const patchDraft = (key: string, patch: Partial<AiDraft>) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const room = AI_CAPTURE_MAX_PHOTOS - photos.filter((p) => !p.saved).length;
  const uploading = photos.some((p) => p.status === 'uploading');
  const pending = photos.filter((p) => p.status === 'ready' && !p.analyzed && !p.saved && p.attachmentId);
  const approved = drafts.filter((d) => d.status === 'approved');
  const busy = analyze.isPending || saving;
  /** The phone's file for an attachment id, for thumbnails and the viewer. */
  const uriOf = (attachmentId: string) => photos.find((p) => p.attachmentId === attachmentId)?.uri ?? null;

  async function upload(id: string, asset: Asset) {
    patchPhoto(id, { status: 'uploading', error: null });
    try {
      const attachment = await uploadAttachment('finance_transaction', {
        uri: asset.uri!,
        type: asset.type === 'image/jpg' ? 'image/jpeg' : asset.type ?? 'image/jpeg',
        fileName: asset.fileName ?? 'receipt.jpg',
      });
      patchPhoto(id, { status: 'ready', attachmentId: attachment.id });
    } catch (error) {
      patchPhoto(id, { status: 'error', error: mapErrorToMessage(error) });
    }
  }

  const assets = new Map<string, Asset>();

  async function pick(source: 'camera' | 'gallery') {
    setNotice(null);
    if (room <= 0) {
      setNotice(`At most ${AI_CAPTURE_MAX_PHOTOS} photos at a time — read these first.`);
      return;
    }
    const result = source === 'camera'
      ? await launchCamera(PICKER_OPTIONS)
      : await launchImageLibrary({ ...PICKER_OPTIONS, selectionLimit: room });
    if (result.errorCode) {
      setNotice(result.errorCode === 'permission' ? 'Allow camera and photo access for Mountain Bakes in Settings.' : 'The camera or gallery could not be opened.');
      return;
    }
    const picked = (result.assets ?? []).filter((a) => a.uri).slice(0, room);
    const fresh = picked.map((asset) => {
      const id = localId();
      assets.set(id, asset);
      return {
        localId: id, uri: asset.uri!, status: 'uploading' as const, attachmentId: null, error: null,
        analyzed: false, readable: null, note: null, saved: false,
      };
    });
    setPhotos((list) => [...list, ...fresh]);
    for (const p of fresh) await upload(p.localId, assets.get(p.localId)!);
  }

  function retryUpload(id: string) {
    const p = photos.find((x) => x.localId === id);
    if (p) void upload(id, { uri: p.uri, type: 'image/jpeg', fileName: 'receipt.jpg' });
  }

  function removePhoto(id: string) {
    const p = photos.find((x) => x.localId === id);
    if (!p || p.saved) return;
    if (p.attachmentId) {
      void discardAttachment(p.attachmentId).catch(() => {});
      setDrafts((list) => list.map((d) => (d.status === 'saved' ? d : { ...d, photoIds: d.photoIds.filter((x) => x !== p.attachmentId) })));
    }
    setPhotos((list) => list.filter((x) => x.localId !== id));
  }

  function markRead(result: AiCaptureResult) {
    const byId = new Map(result.photos.map((p) => [p.id, p]));
    setPhotos((list) => list.map((p) => {
      const r = p.attachmentId ? byId.get(p.attachmentId) : undefined;
      return r ? { ...p, analyzed: true, readable: r.readable, note: r.note } : p;
    }));
  }

  async function generate() {
    const ids = pending.map((p) => p.attachmentId!);
    if (ids.length === 0) return;
    setNotice(null);
    try {
      const result = await analyze.mutateAsync(ids);
      markRead(result);
      const fresh = result.expenses.map((e) => draftFromProposal(e, result.captureId));
      setDrafts((list) => [...list, ...fresh]);
      setNotice(fresh.length === 0 ? 'No bills could be read from these photos. Try clearer photos.' : `${fresh.length} expense${fresh.length === 1 ? '' : 's'} read — check each one, then approve and save.`);
    } catch (error) {
      setNotice(mapErrorToMessage(error));
    }
  }

  async function regenerate(key: string) {
    const d = drafts.find((x) => x.key === key);
    if (!d || d.photoIds.length === 0) return;
    try {
      const result = await analyze.mutateAsync(d.photoIds);
      markRead(result);
      const fresh = result.expenses.map((e) => draftFromProposal(e, result.captureId));
      setDrafts((list) => list.flatMap((x) => (x.key === key ? fresh : [x])));
    } catch (error) {
      patchDraft(key, { error: mapErrorToMessage(error) });
    }
  }

  const remove = (key: string) => setDrafts((list) => list.filter((d) => d.key !== key));
  const split = (key: string) => setDrafts((list) => list.flatMap((d) => (d.key === key ? splitDraft(d) : [d])));
  const combine = (key: string, otherKey: string) =>
    setDrafts((list) => {
      const a = list.find((d) => d.key === key);
      const b = list.find((d) => d.key === otherKey);
      if (!a || !b || !canCombine(a, b)) return list;
      const merged = combineDrafts(a, b);
      return list.flatMap((d) => (d.key === key ? [merged] : d.key === otherKey ? [] : [d]));
    });

  /** An edit puts an approved card back to review, so what is saved is what was last approved. */
  const edit = (key: string, patch: Partial<AiDraft>) =>
    setDrafts((list) => list.map((d) => (d.key === key
      ? { ...d, ...patch, ...(d.status === 'approved' && !('duplicateAcknowledged' in patch) ? { status: 'review' as const } : {}), error: null }
      : d)));
  const approve = (key: string, yes: boolean) => patchDraft(key, { status: yes ? 'approved' : 'review', error: null });

  async function saveApproved(): Promise<number> {
    if (approved.length === 0) return 0;
    setSaving(true);
    setNotice(null);
    // A later card reusing a photo already on a saved entry (a split bill) gets its own copy.
    const claimed = new Set(drafts.filter((d) => d.status === 'saved').flatMap((d) => d.photoIds));
    let saved = 0;
    for (const d of approved) {
      patchDraft(d.key, { status: 'saving', error: null });
      try {
        const ids: string[] = [];
        for (const id of d.photoIds) {
          if (!claimed.has(id)) { ids.push(id); continue; }
          const copy = await copyReceiptPhoto(id);
          const uri = uriOf(id);
          if (uri) {
            setPhotos((list) => [...list, {
              localId: localId(), uri, status: 'ready', attachmentId: copy.id, error: null,
              analyzed: true, readable: true, note: null, saved: false,
            }]);
          }
          ids.push(copy.id);
        }
        patchDraft(d.key, { photoIds: ids });
        const entry = await create.mutateAsync({ input: createBody(d, ids), idempotencyKey: d.idempotencyKey });
        for (const id of ids) claimed.add(id);
        patchDraft(d.key, { status: 'saved', savedTxnNo: entry.txnNo, photoIds: ids });
        setPhotos((list) => list.map((p) => (p.attachmentId && ids.includes(p.attachmentId) ? { ...p, saved: true } : p)));
        saved++;
      } catch (error) {
        patchDraft(d.key, { status: 'review', error: mapErrorToMessage(error) });
      }
    }
    setSaving(false);
    setNotice(
      saved === approved.length
        ? `${saved} expense${saved === 1 ? '' : 's'} saved as draft${saved === 1 ? '' : 's'} in Income & Expense.`
        : `${saved} of ${approved.length} saved — see the message on each card that was not.`,
    );
    return saved;
  }

  return {
    photos,
    drafts,
    summary: summarize(photos.length, drafts),
    room,
    uploading,
    pendingCount: pending.length,
    approvedCount: approved.length,
    isReading: analyze.isPending,
    saving,
    busy,
    notice,
    uriOf,
    pick,
    retryUpload,
    removePhoto,
    generate,
    regenerate,
    remove,
    split,
    combine,
    edit,
    approve,
    saveApproved,
  };
}
