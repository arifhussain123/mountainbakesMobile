/**
 * @format
 */
import ReactTestRenderer from 'react-test-renderer';

const mockUpload = jest.fn();
const mockAnalyze = jest.fn();
const mockCreate = jest.fn();
const mockCopy = jest.fn();
let mockKeySeq = 0;

jest.mock('@/api', () => ({
  AI_CAPTURE_MAX_PHOTOS: 10,
  generateIdempotencyKey: (prefix: string) => `${prefix}-test-key-${++mockKeySeq}`,
  uploadAttachment: (...a: unknown[]) => mockUpload(...a),
  discardAttachment: jest.fn(() => Promise.resolve()),
  copyReceiptPhoto: (...a: unknown[]) => mockCopy(...a),
  useAnalyzeReceipts: () => ({ mutateAsync: mockAnalyze, isPending: false }),
  useCreateFinanceTransaction: () => ({ mutateAsync: mockCreate, isPending: false }),
}));
jest.mock('@/shared/helpers', () => ({ mapErrorToMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)) }));
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(() => Promise.resolve({
    assets: [
      { uri: 'file:///a.jpg', type: 'image/jpg', fileName: 'a.jpg' },
      { uri: 'file:///b.jpg', type: 'image/jpeg', fileName: 'b.jpg' },
    ],
  })),
}));

import { useAiExpenseCapture } from '@/features/finance/hooks/useAiExpenseCapture';

const HEAD = '70000000-0000-4000-8000-000000000001';
const bill = (key: string, photoIds: string[], total: number) => ({
  key, photoIds, merchant: 'Shop', invoiceNo: null, businessDate: '2026-10-29', currency: 'PKR', subtotal: null, tax: null,
  discount: null, total, description: `Bill ${key}`, descriptionOriginal: null, language: 'English', lineItems: [],
  suggestedLedgerHeadId: HEAD, confidence: 'high', issues: [], needsReview: false, notes: null, duplicates: [],
});

function renderHook() {
  const ref: { current: ReturnType<typeof useAiExpenseCapture> | null } = { current: null };
  function Harness() {
    ref.current = useAiExpenseCapture();
    return null;
  }
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Harness />);
  });
  return ref;
}

describe('useAiExpenseCapture', () => {
  beforeEach(() => {
    mockUpload.mockReset().mockImplementation((_e: string, p: { uri: string; type: string }) =>
      Promise.resolve({ id: p.uri.endsWith('a.jpg') ? 'att-a' : 'att-b', url: 'https://signed/x' }));
    mockAnalyze.mockReset().mockResolvedValue({
      captureId: 'cap-1', model: 'gemini', photos: [{ id: 'att-a', readable: true, note: null }, { id: 'att-b', readable: true, note: null }],
      expenses: [bill('e1', ['att-a'], 5000), bill('e2', ['att-b'], 2000)],
    });
    mockCreate.mockReset();
    mockCopy.mockReset().mockResolvedValue({ id: 'att-a-copy', url: 'https://signed/copy' });
  });

  it('uploads each picked photo, reads them, and saves each approved card once as a draft under its own key', async () => {
    const ref = renderHook();
    await ReactTestRenderer.act(async () => { await ref.current!.pick('gallery'); });
    // image/jpg is sent as image/jpeg.
    expect(mockUpload.mock.calls.map((c) => [c[0], c[1].type])).toEqual([['finance_transaction', 'image/jpeg'], ['finance_transaction', 'image/jpeg']]);
    expect(ref.current!.pendingCount).toBe(2);

    await ReactTestRenderer.act(async () => { await ref.current!.generate(); });
    expect(mockAnalyze).toHaveBeenCalledWith(['att-a', 'att-b']);
    expect(ref.current!.drafts.map((d) => d.amount)).toEqual(['5000', '2000']);
    expect(ref.current!.pendingCount).toBe(0);

    // Only the approved card is saved.
    mockCreate.mockResolvedValueOnce({ txnNo: 'FTX-1' });
    const first = ref.current!.drafts[0]!.key;
    await ReactTestRenderer.act(async () => { ref.current!.approve(first, true); });
    await ReactTestRenderer.act(async () => { await ref.current!.saveApproved(); });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];
    expect(call.input).toEqual(expect.objectContaining({ amount: 5000, asDraft: true, attachmentIds: ['att-a'], aiCaptureId: 'cap-1', paymentMethod: 'cash' }));
    expect(call.idempotencyKey).toMatch(/^ai-expense-test-key-/);
    expect(ref.current!.drafts[0]!.status).toBe('saved');
    expect(ref.current!.drafts[0]!.savedTxnNo).toBe('FTX-1');

    // Saving again sends nothing more: the saved card is no longer approved-and-waiting.
    await ReactTestRenderer.act(async () => { await ref.current!.saveApproved(); });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('a failed save is retried under the same key; a split bill\'s second half gets a copy of the photo', async () => {
    const ref = renderHook();
    await ReactTestRenderer.act(async () => { await ref.current!.pick('gallery'); });
    await ReactTestRenderer.act(async () => { await ref.current!.generate(); });
    const key = ref.current!.drafts[0]!.key;
    await ReactTestRenderer.act(async () => { ref.current!.split(key); });
    const [, second] = ref.current!.drafts;
    await ReactTestRenderer.act(async () => {
      ref.current!.edit(key, { amount: '3000' });
      ref.current!.edit(second!.key, { amount: '2000' });
    });
    await ReactTestRenderer.act(async () => {
      ref.current!.approve(key, true);
      ref.current!.approve(second!.key, true);
    });

    mockCreate.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce({ txnNo: 'FTX-2' });
    await ReactTestRenderer.act(async () => { await ref.current!.saveApproved(); });
    // The first half failed; the second (sharing the photo, nothing claimed yet) saved with the original photo.
    expect(ref.current!.drafts[0]!.error).toBe('network down');
    expect(ref.current!.drafts[1]!.status).toBe('saved');
    const firstKey = mockCreate.mock.calls[0][0].idempotencyKey;

    mockCreate.mockResolvedValueOnce({ txnNo: 'FTX-3' });
    await ReactTestRenderer.act(async () => { ref.current!.approve(key, true); });
    await ReactTestRenderer.act(async () => { await ref.current!.saveApproved(); });
    const retry = mockCreate.mock.calls[2][0];
    expect(retry.idempotencyKey).toBe(firstKey);
    // Its photo is now on FTX-2, so it is saved with its own copy.
    expect(mockCopy).toHaveBeenCalledWith('att-a');
    expect(retry.input.attachmentIds).toEqual(['att-a-copy']);
    expect(ref.current!.drafts[0]!.status).toBe('saved');
  });
});
