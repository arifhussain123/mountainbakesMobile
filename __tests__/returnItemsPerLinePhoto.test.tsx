/**
 * @format
 *
 * Return Items — one photo per returned product (`useReturnItemsForm`):
 * Save waits for every line's photo, each line sends its own attachmentId
 * under one idempotency key, deleting/retaking a line discards its upload,
 * an expired photo is re-uploaded under a new key, and offline Save queues
 * the return with the photos kept on the phone.
 */
import ReactTestRenderer from 'react-test-renderer';

const mockMutateAsync = jest.fn();
const mockUpload = jest.fn();
const mockDiscard = jest.fn((_id: string) => Promise.resolve());
const mockEnqueue = jest.fn((_input: unknown) => Promise.resolve('queued'));
const mockSaveLocalPhoto = jest.fn((_photo: unknown) => Promise.resolve());
const mockLaunchCamera = jest.fn();
let mockKeyCounter = 0;
let mockOffline = false;

const mockProducts = [
  { id: 'p1', name: 'Classic Brownie', categoryId: null, categoryName: null, sku: 'B1', price: 100, isActive: true },
  { id: 'p2', name: 'Cream Puff', categoryId: null, categoryName: null, sku: 'C1', price: 80, isActive: true },
];
const mockProductsQuery = { data: { products: mockProducts } };
const mockStockQuery = { data: { rows: [{ productId: 'p1', balance: 10 }, { productId: 'p2', balance: 5 }] } };

jest.mock('@/api', () => {
  const queued = jest.requireActual('@/api/queuedBranchReturn');
  return {
    QUEUED_RETURN_ENDPOINT: queued.QUEUED_RETURN_ENDPOINT,
    unavailableAttachmentIds: queued.unavailableAttachmentIds,
    discardAttachment: (id: string) => mockDiscard(id),
    uploadAttachment: (...args: unknown[]) => mockUpload(...args),
    enqueueOfflineWrite: (input: unknown) => mockEnqueue(input),
    generateIdempotencyKey: (prefix: string) => `${prefix}-key-${++mockKeyCounter}`,
    getBusinessDate: () => '2026-10-20',
    isApiError: (v: unknown) => typeof v === 'object' && v !== null && 'status' in v && 'message' in v,
    useCreateBranchReturn: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
    useProducts: () => mockProductsQuery,
    useStock: () => mockStockQuery,
  };
});
jest.mock('@/shared/helpers', () => ({ mapErrorToMessage: (e: { message?: string }) => e?.message ?? String(e) }));
jest.mock('@/shared/hooks', () => ({ useNetworkStatus: () => ({ isOffline: mockOffline }) }));
jest.mock('@/shared/offline', () => ({
  saveLocalPhoto: (photo: unknown) => mockSaveLocalPhoto(photo),
  deleteLocalPhotos: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native-image-picker', () => ({
  launchCamera: (...args: unknown[]) => mockLaunchCamera(...args),
  launchImageLibrary: (...args: unknown[]) => mockLaunchCamera(...args),
}));

import { useReturnItemsForm } from '@/features/stock/hooks/useReturnItemsForm';

type Form = ReturnType<typeof useReturnItemsForm>;

function renderForm() {
  const ref: { current: Form | null } = { current: null };
  function Harness() {
    ref.current = useReturnItemsForm();
    return null;
  }
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  return { ref, unmount: () => ReactTestRenderer.act(() => renderer.unmount()) };
}

const act = (fn: () => unknown) =>
  ReactTestRenderer.act(async () => {
    await fn();
  });

let pictureCount = 0;
function nextPicture(overrides: Record<string, unknown> = {}) {
  pictureCount++;
  return {
    assets: [
      { uri: `file:///tmp/photo-${pictureCount}.jpg`, base64: `BASE64-${pictureCount}`, type: 'image/jpeg', fileName: `photo-${pictureCount}.jpg`, width: 1280, height: 960, fileSize: 180_000, ...overrides },
    ],
  };
}

const attachment = (id: string) => ({ id, entity: 'branch_return', entityId: null, url: `https://x/${id}`, mimeType: 'image/jpeg', sizeBytes: 1, width: 1, height: 1, uploadedBy: null, uploadedByName: null, createdAt: '' });

/** Two lines: Classic Brownie and Cream Puff, qty 1 each. */
async function twoLineForm() {
  const form = renderForm();
  await act(() => form.ref.current!.updateLine(form.ref.current!.lines[0].key, { product: mockProducts[0] as never }));
  await act(() => form.ref.current!.addLine());
  await act(() => form.ref.current!.updateLine(form.ref.current!.lines[1].key, { product: mockProducts[1] as never }));
  return form;
}

/** Camera → confirm "Use photo" on one line; the upload answers with `attachmentId`. */
async function attachPhoto(form: { ref: { current: Form | null } }, lineIndex: number, attachmentId: string) {
  mockLaunchCamera.mockResolvedValueOnce(nextPicture());
  mockUpload.mockResolvedValueOnce(attachment(attachmentId));
  const key = form.ref.current!.lines[lineIndex].key;
  await act(() => form.ref.current!.capturePhoto(key, 'camera'));
  expect(form.ref.current!.pendingPhoto?.lineKey).toBe(key);
  await act(() => form.ref.current!.confirmPendingPhoto());
}

beforeEach(() => {
  mockMutateAsync.mockReset();
  mockUpload.mockReset();
  mockDiscard.mockClear();
  mockEnqueue.mockClear();
  mockSaveLocalPhoto.mockClear();
  mockLaunchCamera.mockReset();
  mockOffline = false;
});

describe('useReturnItemsForm — a photo for each returned product', () => {
  it('blocks Save until BOTH lines have a photo, pointing at the first line still missing one', async () => {
    const form = await twoLineForm();
    const [first, second] = form.ref.current!.lines;

    expect(form.ref.current!.canSubmit).toBe(false);
    expect(form.ref.current!.blockedOnlyByPhotos).toBe(true);
    let outcome: unknown;
    await act(async () => {
      outcome = await form.ref.current!.submit();
    });
    expect(outcome).toEqual({ status: 'blocked', firstMissingPhotoKey: first.key });
    expect(form.ref.current!.showPhotoErrors).toBe(true);

    await attachPhoto(form, 0, 'att-1');
    expect(form.ref.current!.lines[0].photo?.status).toBe('uploaded');
    expect(form.ref.current!.photosReady).toBe(1);
    expect(form.ref.current!.photosTotal).toBe(2);
    expect(form.ref.current!.canSubmit).toBe(false);
    await act(async () => {
      outcome = await form.ref.current!.submit();
    });
    expect(outcome).toEqual({ status: 'blocked', firstMissingPhotoKey: second.key });
    expect(mockMutateAsync).not.toHaveBeenCalled();

    await attachPhoto(form, 1, 'att-2');
    expect(form.ref.current!.canSubmit).toBe(true);
  });

  it('sends a distinct attachmentId on each line, and the form idempotency key', async () => {
    mockMutateAsync.mockResolvedValue({ ids: ['r1', 'r2'] });
    const form = await twoLineForm();
    await attachPhoto(form, 0, 'att-1');
    await attachPhoto(form, 1, 'att-2');

    let outcome: unknown;
    await act(async () => {
      outcome = await form.ref.current!.submit();
    });
    expect(outcome).toEqual({ status: 'saved' });
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    const { input, idempotencyKey } = mockMutateAsync.mock.calls[0][0];
    expect(input.items).toEqual([
      { productId: 'p1', qty: 1, attachmentId: 'att-1' },
      { productId: 'p2', qty: 1, attachmentId: 'att-2' },
    ]);
    expect(input).not.toHaveProperty('attachmentIds');
    expect(idempotencyKey).toMatch(/^stock_return-key-\d+$/);
    // Uploaded as this form's own photos, one each.
    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockUpload.mock.calls[0][0]).toBe('branch_return');
  });

  it('deleting a line discards its staged upload', async () => {
    const form = await twoLineForm();
    await attachPhoto(form, 0, 'att-1');
    await act(() => form.ref.current!.removeLine(form.ref.current!.lines[0].key));

    expect(mockDiscard).toHaveBeenCalledWith('att-1');
    expect(form.ref.current!.lines).toHaveLength(1);
    expect(form.ref.current!.lines[0].product?.id).toBe('p2');
  });

  it('a retake replaces the photo (old upload discarded) and Save sends the new one', async () => {
    mockMutateAsync.mockResolvedValue({ ids: ['r1', 'r2'] });
    const form = await twoLineForm();
    await attachPhoto(form, 0, 'att-1');
    await attachPhoto(form, 1, 'att-2');

    // Retake: the old photo stays until the new one is confirmed.
    mockLaunchCamera.mockResolvedValueOnce(nextPicture());
    mockUpload.mockResolvedValueOnce(attachment('att-3'));
    const key = form.ref.current!.lines[0].key;
    await act(() => form.ref.current!.capturePhoto(key, 'camera'));
    expect(form.ref.current!.lines[0].photo?.attachment?.id).toBe('att-1');
    expect(mockDiscard).not.toHaveBeenCalled();
    await act(() => form.ref.current!.confirmPendingPhoto());

    expect(mockDiscard).toHaveBeenCalledWith('att-1');
    expect(form.ref.current!.lines[0].photo?.attachment?.id).toBe('att-3');
    await act(() => form.ref.current!.submit());
    expect(mockMutateAsync.mock.calls[0][0].input.items[0].attachmentId).toBe('att-3');
  });

  it('"Retake" on the confirm step drops the pending capture without uploading it', async () => {
    const form = await twoLineForm();
    mockLaunchCamera.mockResolvedValueOnce(nextPicture()).mockResolvedValueOnce(nextPicture());
    const key = form.ref.current!.lines[0].key;
    await act(() => form.ref.current!.capturePhoto(key, 'camera'));
    const firstUri = form.ref.current!.pendingPhoto!.previewUri;
    await act(() => form.ref.current!.retakePendingPhoto());

    expect(form.ref.current!.pendingPhoto?.previewUri).not.toBe(firstUri);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(form.ref.current!.lines[0].photo).toBeNull();
  });

  it('refuses a photo the picker could not shrink (it may still carry its location)', async () => {
    const form = await twoLineForm();
    mockLaunchCamera.mockResolvedValueOnce(nextPicture({ width: 4032, height: 3024 }));
    const key = form.ref.current!.lines[0].key;
    let outcome: unknown;
    await act(async () => {
      outcome = await form.ref.current!.capturePhoto(key, 'camera');
    });
    expect(outcome).toBe('failed');
    expect(form.ref.current!.pendingPhoto).toBeNull();
    expect(form.ref.current!.captureErrors[key]).toMatch(/could not be prepared/);
  });

  it('reports a camera permission refusal so the sheet can offer Gallery or Settings', async () => {
    const form = await twoLineForm();
    mockLaunchCamera.mockResolvedValueOnce({ errorCode: 'permission' });
    let outcome: unknown;
    await act(async () => {
      outcome = await form.ref.current!.capturePhoto(form.ref.current!.lines[0].key, 'camera');
    });
    expect(outcome).toBe('permission_denied');
  });

  it('attachment_unavailable: re-uploads that line and resubmits under a NEW key', async () => {
    const form = await twoLineForm();
    await attachPhoto(form, 0, 'att-1');
    await attachPhoto(form, 1, 'att-2');
    mockMutateAsync
      .mockRejectedValueOnce({ status: 409, message: 'Photo unavailable', details: { code: 'attachment_unavailable', attachmentIds: ['att-1'] } })
      .mockResolvedValueOnce({ ids: ['r1', 'r2'] });
    mockUpload.mockResolvedValueOnce(attachment('att-9'));

    let outcome: unknown;
    await act(async () => {
      outcome = await form.ref.current!.submit();
    });
    expect(outcome).toEqual({ status: 'saved' });
    expect(mockUpload).toHaveBeenCalledTimes(3);
    const [first, second] = mockMutateAsync.mock.calls.map((call) => call[0]);
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(second.input.items.map((i: { attachmentId: string }) => i.attachmentId)).toEqual(['att-9', 'att-2']);
  });

  it('offline: photos are kept on the phone and Save queues the return with them', async () => {
    mockOffline = true;
    const form = await twoLineForm();
    for (const index of [0, 1]) {
      mockLaunchCamera.mockResolvedValueOnce(nextPicture());
      await act(() => form.ref.current!.capturePhoto(form.ref.current!.lines[index].key, 'camera'));
      await act(() => form.ref.current!.confirmPendingPhoto());
    }
    expect(mockUpload).not.toHaveBeenCalled();
    expect(form.ref.current!.lines.map((l) => l.photo?.status)).toEqual(['saved_locally', 'saved_locally']);
    expect(form.ref.current!.canSubmit).toBe(true);

    let outcome: unknown;
    await act(async () => {
      outcome = await form.ref.current!.submit();
    });
    expect(outcome).toEqual({ status: 'queued' });
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockSaveLocalPhoto).toHaveBeenCalledTimes(2);
    const queued = mockEnqueue.mock.calls[0][0] as { endpoint: string; idempotencyKey: string; payload: { items: { localPhotoId: string; attachmentId: string | null; productName: string }[]; businessDate: string } };
    expect(queued.endpoint).toBe('/stock/return');
    expect(queued.payload.businessDate).toBe('2026-10-20');
    expect(queued.payload.items.map((i) => i.attachmentId)).toEqual([null, null]);
    expect(queued.payload.items.map((i) => i.productName)).toEqual(['Classic Brownie', 'Cream Puff']);
    expect(new Set(queued.payload.items.map((i) => i.localPhotoId)).size).toBe(2);
    expect(mockSaveLocalPhoto.mock.calls[0][0]).toMatchObject({ base64: expect.stringMatching(/^BASE64-/), mimeType: 'image/jpeg' });
  });

  it('a dropped connection at Save queues the SAME key and the already-uploaded photo ids', async () => {
    const form = await twoLineForm();
    await attachPhoto(form, 0, 'att-1');
    await attachPhoto(form, 1, 'att-2');
    mockMutateAsync.mockRejectedValueOnce({ status: null, message: 'No internet connection.' });

    let outcome: unknown;
    await act(async () => {
      outcome = await form.ref.current!.submit();
    });
    expect(outcome).toEqual({ status: 'queued' });
    const queued = mockEnqueue.mock.calls[0][0] as { idempotencyKey: string; payload: { items: { attachmentId: string | null }[] } };
    expect(queued.idempotencyKey).toBe(mockMutateAsync.mock.calls[0][0].idempotencyKey);
    expect(queued.payload.items.map((i) => i.attachmentId)).toEqual(['att-1', 'att-2']);
  });

  it('closing the form without saving discards its staged uploads', async () => {
    const form = await twoLineForm();
    await attachPhoto(form, 0, 'att-1');
    form.unmount();
    expect(mockDiscard).toHaveBeenCalledWith('att-1');
  });
});
