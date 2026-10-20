import { apiClient } from '../client';
import type {
  CreditDecisionInput,
  PaymentApproveInput,
  SupplierBalance,
  SupplierCredit,
  SupplierCreditListResponse,
  SupplierCreditQuery,
  SupplierPayment,
  SupplierPaymentHead,
  SupplierPaymentListResponse,
  SupplierPaymentQuery,
} from '../purchasingTypes';

/**
 * Finance → Supplier Payments (`backend/src/routes/finance-supplier-payments.routes.ts`).
 * Production records a payment or a credit request; only an approval here
 * posts to the book. `view` for the lists, `approve` for every decision.
 */
const BASE = '/finance/supplier-payments';

export function listPayments(query: SupplierPaymentQuery): Promise<SupplierPaymentListResponse> {
  return apiClient.get<SupplierPaymentListResponse>(BASE, query as Record<string, unknown>);
}

export function listCredits(query: SupplierCreditQuery): Promise<SupplierCreditListResponse> {
  return apiClient.get<SupplierCreditListResponse>(`${BASE}/credits`, query as Record<string, unknown>);
}

export function getBalances(supplierId?: string): Promise<SupplierBalance[]> {
  return apiClient.get<SupplierBalance[]>(`${BASE}/balances`, supplierId ? { supplierId } : undefined);
}

export function getHeads(): Promise<SupplierPaymentHead[]> {
  return apiClient.get<SupplierPaymentHead[]>(`${BASE}/heads`);
}

export function approvePayment(id: string, input: PaymentApproveInput): Promise<SupplierPayment> {
  return apiClient.post<SupplierPayment>(`${BASE}/${encodeURIComponent(id)}/approve`, input);
}

export function rejectPayment(id: string, reason: string): Promise<SupplierPayment> {
  return apiClient.post<SupplierPayment>(`${BASE}/${encodeURIComponent(id)}/reject`, { reason });
}

export function reversePayment(id: string, reason: string): Promise<SupplierPayment> {
  return apiClient.post<SupplierPayment>(`${BASE}/${encodeURIComponent(id)}/reverse`, { reason });
}

export function decideCredit(id: string, input: CreditDecisionInput): Promise<SupplierCredit> {
  return apiClient.post<SupplierCredit>(`${BASE}/credits/${encodeURIComponent(id)}/decision`, input);
}
