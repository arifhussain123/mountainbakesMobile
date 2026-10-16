/**
 * @format
 */
import { normalizeReferenceId, parseReferenceId, referenceIdSchema, SUPPORTED_REFERENCE_PREFIXES } from '@/features/support/schemas';

describe('normalizeReferenceId', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeReferenceId('  EXP-000012  ')).toBe('EXP-000012');
  });

  it('uppercases a lowercase/mixed-case id', () => {
    expect(normalizeReferenceId('exp-000012')).toBe('EXP-000012');
    expect(normalizeReferenceId('Exp-000012')).toBe('EXP-000012');
  });
});

describe('referenceIdSchema / parseReferenceId', () => {
  it.each(SUPPORTED_REFERENCE_PREFIXES)('accepts a well-formed %s- id (6 zero-padded digits)', (prefix) => {
    const result = parseReferenceId(`${prefix}-000123`);
    expect(result).toEqual({ success: true, value: `${prefix}-000123` });
  });

  it('normalizes (trims + uppercases) before validating, so a lowercase/padded typed id still passes', () => {
    const result = parseReferenceId('  exp-000012  ');
    expect(result).toEqual({ success: true, value: 'EXP-000012' });
  });

  it('rejects an empty value', () => {
    const result = parseReferenceId('   ');
    expect(result.success).toBe(false);
  });

  it('rejects fewer than 6 digits', () => {
    expect(parseReferenceId('EXP-123').success).toBe(false);
  });

  it('rejects more than 6 digits', () => {
    expect(parseReferenceId('EXP-0001234').success).toBe(false);
  });

  it('rejects an unsupported prefix (RV- receipt vouchers — not wired up server-side)', () => {
    const result = parseReferenceId('RV-000012');
    expect(result).toEqual({ success: false, error: expect.stringContaining('Unknown ID format') });
  });

  it('rejects a discount-style hex id', () => {
    expect(parseReferenceId('72729E3A').success).toBe(false);
  });

  it('rejects a production-order PO- id — not a supported Help Desk prefix', () => {
    expect(parseReferenceId('PO-000012').success).toBe(false);
  });

  it('rejects a prefix that is merely a substring match (e.g. "MBX-")', () => {
    expect(parseReferenceId('MBX-000012').success).toBe(false);
  });

  it('schema and helper agree on the same inputs', () => {
    for (const raw of ['MB-000001', 'bad-id', '', 'DMD-999999']) {
      expect(referenceIdSchema.safeParse(raw).success).toBe(parseReferenceId(raw).success);
    }
  });
});
