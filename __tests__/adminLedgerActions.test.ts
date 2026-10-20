/**
 * @format
 */
import {
  DECISION_TEXT_MAX,
  approveBody,
  approveSuccessMessage,
  canDecideCashTransfers,
  rejectReasonProblem,
  rejectSuccessMessage,
} from '@/features/admin/utils/ledgerActions';

describe('daily ledger decision gate', () => {
  it('follows the "Allow Super Admin to modify" toggle', () => {
    expect(canDecideCashTransfers({ allowSuperAdminWrite: true })).toBe(true);
    expect(canDecideCashTransfers({ allowSuperAdminWrite: false })).toBe(false);
  });

  it('offers nothing while the settings are unknown', () => {
    expect(canDecideCashTransfers(undefined)).toBe(false);
    expect(canDecideCashTransfers(null)).toBe(false);
  });
});

describe('cash transfer approve', () => {
  it('sends the trimmed note only when one was typed', () => {
    expect(approveBody('  matches the slip  ')).toEqual({ note: 'matches the slip' });
    expect(approveBody('   ')).toEqual({});
    expect(approveBody('')).toEqual({});
  });

  it('names the posted receipt in the success message', () => {
    expect(approveSuccessMessage('CT-000012', { voucherNo: 'RV-000340' })).toBe('Approved — receipt RV-000340 posted to the Daily Ledger');
    expect(approveSuccessMessage('CT-000012', null)).toBe('Approved CT-000012');
  });

  it('caps the note at the server maximum', () => {
    expect(DECISION_TEXT_MAX).toBe(500);
  });
});

describe('cash transfer reject', () => {
  it('needs a reason of at least 3 characters after trimming', () => {
    expect(rejectReasonProblem('')).toBe('Say why (at least 3 characters).');
    expect(rejectReasonProblem('  ab  ')).toBe('Say why (at least 3 characters).');
    expect(rejectReasonProblem('abc')).toBeNull();
  });

  it('words the success like the web', () => {
    expect(rejectSuccessMessage('CT-000012')).toBe('Rejected CT-000012 — the branch has been told why');
  });
});
