/**
 * @format
 */
import { findOpenTicketForReference } from '@/features/support/utils/duplicateCheck';
import type { SupportTicket } from '@/api';

function ticket(overrides: Partial<SupportTicket>): SupportTicket {
  return {
    id: 't1',
    ticketNumber: 'TKT-000001',
    referenceType: 'expense',
    referenceId: 'EXP-000012',
    referenceSnapshot: null,
    message: 'Wrong amount',
    status: 'open',
    resolutionNote: null,
    branchName: null,
    raisedByName: null,
    resolvedByName: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('findOpenTicketForReference', () => {
  it('finds an existing OPEN ticket on the same reference id', () => {
    const existing = ticket({ id: 'abc', referenceId: 'EXP-000012', status: 'open' });
    const result = findOpenTicketForReference([existing], 'EXP-000012');
    expect(result?.id).toBe('abc');
  });

  it('is case-insensitive on the reference id', () => {
    const existing = ticket({ id: 'abc', referenceId: 'EXP-000012', status: 'open' });
    expect(findOpenTicketForReference([existing], 'exp-000012')?.id).toBe('abc');
  });

  it('ignores a resolved ticket on the same reference', () => {
    const resolved = ticket({ id: 'abc', referenceId: 'EXP-000012', status: 'resolved' });
    expect(findOpenTicketForReference([resolved], 'EXP-000012')).toBeNull();
  });

  it('ignores a rejected ticket on the same reference', () => {
    const rejected = ticket({ id: 'abc', referenceId: 'EXP-000012', status: 'rejected' });
    expect(findOpenTicketForReference([rejected], 'EXP-000012')).toBeNull();
  });

  it('ignores an open ticket on a DIFFERENT reference', () => {
    const other = ticket({ id: 'abc', referenceId: 'EXP-000099', status: 'open' });
    expect(findOpenTicketForReference([other], 'EXP-000012')).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(findOpenTicketForReference([], 'EXP-000012')).toBeNull();
  });
});
