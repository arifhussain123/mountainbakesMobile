/**
 * @format
 */
import { referenceTypeFor, REFERENCE_TYPES } from '@/features/support/referenceTypes';

describe('referenceTypeFor', () => {
  it('routes MB- to sale', () => {
    expect(referenceTypeFor('MB-000123')?.type).toBe('sale');
  });

  it('routes DMD- to demand', () => {
    expect(referenceTypeFor('DMD-000123')?.type).toBe('demand');
  });

  it('routes EXP- to expense', () => {
    expect(referenceTypeFor('EXP-000123')?.type).toBe('expense');
  });

  it('routes STK- to stock', () => {
    expect(referenceTypeFor('STK-000123')?.type).toBe('stock');
  });

  it('routes CT- to cash_transfer', () => {
    expect(referenceTypeFor('CT-000123')?.type).toBe('cash_transfer');
  });

  it('returns null for an unrecognized prefix', () => {
    expect(referenceTypeFor('RV-000123')).toBeNull();
    expect(referenceTypeFor('PO-000123')).toBeNull();
    expect(referenceTypeFor('72729E3A')).toBeNull();
  });

  it('every supported prefix has an icon and a label configured', () => {
    for (const config of Object.values(REFERENCE_TYPES)) {
      expect(config.icon).toBeTruthy();
      expect(config.label).toBeTruthy();
    }
  });
});
