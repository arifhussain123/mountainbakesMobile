import { createBody, draftFromProposal, missingFields, splitDraft, combineDrafts, canCombine, summarize } from '@/features/finance/utils/aiCaptureDraft';
import type { AiExpenseProposal } from '@/api';

/**
 * AI Expense Capture's cards on the phone — the same rules as the web's
 * aiCaptureDraft (frontend), so both save the same entry from one proposal.
 */

const CAPTURE = '90000000-0000-4000-8000-000000000001';
const HEAD = '70000000-0000-4000-8000-000000000001';
const P1 = '80000000-0000-4000-8000-000000000001';
const P2 = '80000000-0000-4000-8000-000000000002';

const proposal = (o: Partial<AiExpenseProposal> = {}): AiExpenseProposal => ({
  key: 'e1', photoIds: [P1], merchant: 'Al-Madina Traders', invoiceNo: 'INV-9', businessDate: '2026-10-29', currency: 'PKR',
  subtotal: null, tax: null, discount: null, total: 5000, description: 'Flour purchase — Al-Madina Traders',
  descriptionOriginal: null, language: 'English', lineItems: [], suggestedLedgerHeadId: HEAD, confidence: 'high',
  issues: [], needsReview: false, notes: null, duplicates: [], ...o,
});

describe('AI Expense Capture cards', () => {
  it('defaults to Cash with the date and total read, and saves as a draft linked to its run', () => {
    const d = draftFromProposal(proposal(), CAPTURE);
    expect(missingFields(d)).toEqual([]);
    expect(createBody(d)).toEqual(expect.objectContaining({
      ledgerHeadId: HEAD, amount: 5000, paymentMethod: 'cash', account: 'cash', businessDate: '2026-10-29',
      referenceNo: 'INV-9', asDraft: true, attachmentIds: [P1], aiCaptureId: CAPTURE,
    }));
    expect(d.idempotencyKey).toMatch(/^[A-Za-z0-9._:-]{8,200}$/);
  });

  it('invents nothing: an unread date or total blocks approval', () => {
    const d = draftFromProposal(proposal({ businessDate: null, total: null }), CAPTURE);
    expect(missingFields(d)).toEqual(['business date', 'amount']);
  });

  it('a possible duplicate must be acknowledged first', () => {
    const d = draftFromProposal(proposal({ duplicates: [{ kind: 'same_photo', message: 'Already on FTX-1.' }] }), CAPTURE);
    expect(missingFields(d)).toEqual(['duplicate check']);
    expect(missingFields({ ...d, duplicateAcknowledged: true })).toEqual([]);
  });

  it('split keeps the photo on both, combine joins photos and adds amounts', () => {
    const [a, b] = splitDraft(draftFromProposal(proposal(), CAPTURE));
    expect(b.photoIds).toEqual([P1]);
    expect(b.amount).toBe('');
    expect(b.idempotencyKey).not.toBe(a.idempotencyKey);
    const other = draftFromProposal(proposal({ key: 'e2', photoIds: [P2], total: 250 }), CAPTURE);
    expect(canCombine(a, other)).toBe(true);
    const c = combineDrafts(a, other);
    expect([c.photoIds, c.amount]).toEqual([[P1, P2], '5250']);
    expect(summarize(2, [c])).toEqual({ receipts: 2, expenses: 1, totalAmount: 5250, needingReview: 1, saved: 0 });
  });
});
