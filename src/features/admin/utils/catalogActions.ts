import { z } from 'zod';
import type { AdminCustomer, AdminCustomerInput } from '@/api';

/**
 * Pure rules behind Super Admin's Categories and Customers actions — the web
 * `CategoriesPage` and `CustomerForm`, reproduced. Courtesy checks only: the
 * API validates each body again (`CreateCategorySchema`, `CreateCustomerSchema`
 * / `UpdateCustomerSchema`) and answers a duplicate category name with a 409.
 */

// ─── Categories ─────────────────────────────────────────────────────────────

/** The web's Add button is disabled until the name has a non-space character; the name itself is sent as typed. */
export function canSaveCategoryName(name: string): boolean {
  return name.trim() !== '';
}

/** The web's `confirm()` text before a category is removed. */
export function removeCategoryPrompt(name: string): string {
  return `Remove "${name}"?`;
}

// ─── Customers ──────────────────────────────────────────────────────────────

const emailSchema = z.string().email();

/**
 * `CreateCustomerSchema` from `@mb/shared` — the web form resolves with it for
 * Add and Edit alike. Its `email().or(literal(''))` is a refine here so a bad
 * address reports "Invalid email" rather than a union's "Invalid input".
 */
const customerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  phone: z.string().min(10, 'Invalid phone number'),
  email: z.string().refine((v) => v === '' || emailSchema.safeParse(v).success, 'Invalid email'),
  address: z.string(),
  branchId: z.string().min(1, 'Branch is required'),
});

export type CustomerFormValues = AdminCustomerInput;
export type CustomerFormErrors = Partial<Record<keyof CustomerFormValues, string>>;

/**
 * The form's starting values: the customer's own for Edit, blanks for Add (a
 * Super Admin has no branch of their own, so Branch starts empty). Null email /
 * address become '' — the web passes null straight to a string schema, which
 * silently blocks Save on such a customer.
 */
export function initialCustomerValues(customer: AdminCustomer | null): CustomerFormValues {
  if (!customer) return { name: '', phone: '', email: '', address: '', branchId: '' };
  return {
    name: customer.name ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    branchId: customer.branchId ?? '',
  };
}

/** Field → first message, the way react-hook-form shows them; `{}` when the form is valid. */
export function customerFormErrors(values: CustomerFormValues): CustomerFormErrors {
  const result = customerSchema.safeParse(values);
  if (result.success) return {};
  const errors: CustomerFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof CustomerFormValues;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}
