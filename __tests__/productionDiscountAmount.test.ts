/**
 * @format
 *
 * Production → Discount Detail → Edit amount: the typed figure's rules (same as
 * the web popup and the server's schema) and the request the app sends.
 */
const mockPut = jest.fn();
jest.mock('@/api/client', () => ({ apiClient: { put: (...args: unknown[]) => mockPut(...args) } }));

import { parseAmountInput, sanitizeAmountInput } from '@/features/production/discountAmount';
import { setProductionDiscountAmount } from '@/api/services/productionDiscountService';

describe('sanitizeAmountInput', () => {
  it.each([
    ['1,250', '1250'],
    [' 500 ', '500'],
    ['12.345', '12.34'],
    ['1.2.3', '1.23'],
    ['007', '7'],
    ['0.5', '0.5'],
    ['', ''],
  ])('%s → %s', (raw, out) => {
    expect(sanitizeAmountInput(raw)).toBe(out);
  });
});

describe('parseAmountInput', () => {
  it('reads money rounded to paisa, 0 for nothing valid', () => {
    expect(parseAmountInput('450.5')).toBe(450.5);
    expect(parseAmountInput('250.499999')).toBe(250.5);
    expect(parseAmountInput('0')).toBe(0);
    expect(parseAmountInput('')).toBe(0);
    expect(parseAmountInput('.')).toBe(0);
  });
});

describe('setProductionDiscountAmount', () => {
  it('PUTs the new amount to the claim’s Production route', async () => {
    mockPut.mockResolvedValue({ id: 'd1', amount: 500, originalAmount: 700 });
    const r = await setProductionDiscountAmount('d1', 500);
    expect(mockPut).toHaveBeenCalledWith('/production-discounts/d1/amount', { amount: 500 });
    expect(r.originalAmount).toBe(700);
  });
});
