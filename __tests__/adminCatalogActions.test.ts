/**
 * @format
 */
import type { AdminCustomer } from '@/api/types';
import { canSaveCategoryName, customerFormErrors, initialCustomerValues, removeCategoryPrompt } from '@/features/admin/utils/catalogActions';

const customer = (over: Partial<AdminCustomer> = {}): AdminCustomer => ({
  id: 'c1',
  name: 'Ahmed Khan',
  phone: '03001234567',
  email: null,
  address: null,
  branchId: 'b1',
  branchName: 'Alabad',
  totalOrders: 3,
  totalSpent: 1200,
  createdAt: '2026-10-01T10:00:00Z',
  ...over,
});

const valid = { name: 'Ahmed Khan', phone: '03001234567', email: '', address: '', branchId: 'b1' };

describe('categories', () => {
  it('needs a non-space character, as the web Add button does', () => {
    expect(canSaveCategoryName('')).toBe(false);
    expect(canSaveCategoryName('   ')).toBe(false);
    expect(canSaveCategoryName('Cakes')).toBe(true);
  });

  it('confirms removal in the web wording', () => {
    expect(removeCategoryPrompt('Cakes')).toBe('Remove "Cakes"?');
  });
});

describe('initialCustomerValues', () => {
  it('starts blank for Add, branch included', () => {
    expect(initialCustomerValues(null)).toEqual({ name: '', phone: '', email: '', address: '', branchId: '' });
  });

  it('turns a null email / address into blanks for Edit', () => {
    expect(initialCustomerValues(customer())).toEqual({ name: 'Ahmed Khan', phone: '03001234567', email: '', address: '', branchId: 'b1' });
    expect(initialCustomerValues(customer({ email: 'a@b.pk', address: 'Mall Road' }))).toMatchObject({ email: 'a@b.pk', address: 'Mall Road' });
  });
});

describe('customerFormErrors', () => {
  it('accepts a valid form, email optional', () => {
    expect(customerFormErrors(valid)).toEqual({});
    expect(customerFormErrors({ ...valid, email: 'ahmed@example.com' })).toEqual({});
  });

  it("reports CreateCustomerSchema's messages", () => {
    expect(customerFormErrors({ name: 'A', phone: '0300', email: 'nope', address: '', branchId: '' })).toEqual({
      name: 'Customer name is required',
      phone: 'Invalid phone number',
      email: 'Invalid email',
      branchId: 'Branch is required',
    });
  });

  it('counts characters as typed, like the server (no trimming)', () => {
    expect(customerFormErrors({ ...valid, name: 'Al' })).toEqual({});
    expect(customerFormErrors({ ...valid, phone: '030012345' }).phone).toBe('Invalid phone number');
  });
});
