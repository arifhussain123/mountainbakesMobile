import { apiClient } from '../client';
import type {
  AdvanceQuery,
  CancelResignationInput,
  CreateEmployeeAdvanceInput,
  CreateEmployeeInput,
  CreateSalaryPaymentInput,
  CreateSalaryRevisionInput,
  EmployeeAdvance,
  EmployeeAdvanceSummary,
  EmployeeProfile,
  EmployeeResignation,
  FinanceEmployee,
  LedgerEntry,
  RecordResignationInput,
  ResignationImpact,
  SalaryLedger,
  SalaryLedgerPayments,
  SalaryLedgerQuery,
  SalaryPayment,
  SalaryQuery,
  SalaryRevision,
  UpdateEmployeeInput,
} from '../types';

// ─── Employees ───────────────────────────────────────────────────────────────

export async function listEmployees(opts?: { department?: string; includeInactive?: boolean; search?: string }): Promise<{ employees: FinanceEmployee[]; total: number }> {
  return apiClient.get<{ employees: FinanceEmployee[]; total: number }>('/finance/payroll/employees', opts as unknown as Record<string, unknown>);
}

/** `configure` permission. */
export async function createEmployee(input: CreateEmployeeInput, idempotencyKey?: string): Promise<FinanceEmployee> {
  const { employee } = await apiClient.post<{ employee: FinanceEmployee }>('/finance/payroll/employees', input, { idempotencyKey });
  return employee;
}

/** `configure` permission — baseSalary is NOT in UpdateEmployeeInput; use createSalaryRevision instead. */
export async function updateEmployee(id: string, input: UpdateEmployeeInput, idempotencyKey?: string): Promise<FinanceEmployee> {
  const { employee } = await apiClient.put<{ employee: FinanceEmployee }>(`/finance/payroll/employees/${id}`, input, { idempotencyKey });
  return employee;
}

export async function getEmployeeProfile(id: string): Promise<EmployeeProfile> {
  const { profile } = await apiClient.get<{ profile: EmployeeProfile }>(`/finance/payroll/employees/${id}`);
  return profile;
}

/** `configure` permission — sets isActive=false, blocks salary for months after the resignation month. */
export async function recordResignation(
  employeeId: string,
  input: RecordResignationInput,
  idempotencyKey?: string,
): Promise<{ resignation: EmployeeResignation; impact: ResignationImpact; employee: FinanceEmployee }> {
  return apiClient.post<{ resignation: EmployeeResignation; impact: ResignationImpact; employee: FinanceEmployee }>(
    `/finance/payroll/employees/${employeeId}/resignation`,
    input,
    { idempotencyKey },
  );
}

/** `configure` permission — sets isActive=true again; record is kept, not deleted. */
export async function cancelResignation(
  employeeId: string,
  input: CancelResignationInput,
  idempotencyKey?: string,
): Promise<{ resignation: EmployeeResignation; employee: FinanceEmployee }> {
  return apiClient.post<{ resignation: EmployeeResignation; employee: FinanceEmployee }>(
    `/finance/payroll/employees/${employeeId}/resignation/cancel`,
    input,
    { idempotencyKey },
  );
}

export async function listSalaryRevisions(employeeId: string): Promise<SalaryRevision[]> {
  const { revisions } = await apiClient.get<{ revisions: SalaryRevision[] }>(`/finance/payroll/employees/${employeeId}/salary-revisions`);
  return revisions;
}

/** `configure` permission — the ONLY way to change baseSalary; appends a new revision row. */
export async function createSalaryRevision(
  employeeId: string,
  input: CreateSalaryRevisionInput,
  idempotencyKey?: string,
): Promise<{ employee: FinanceEmployee; revision: SalaryRevision }> {
  return apiClient.post<{ employee: FinanceEmployee; revision: SalaryRevision }>(
    `/finance/payroll/employees/${employeeId}/salary-revisions`,
    input,
    { idempotencyKey },
  );
}

export async function getEmployeeAdvanceSummary(employeeId: string): Promise<EmployeeAdvanceSummary> {
  const { summary } = await apiClient.get<{ summary: EmployeeAdvanceSummary }>(`/finance/payroll/employees/${employeeId}/advance-summary`);
  return summary;
}

// ─── Salaries (payslips) ─────────────────────────────────────────────────────

export async function listSalaries(query: SalaryQuery): Promise<{ salaries: SalaryPayment[]; total: number }> {
  return apiClient.get<{ salaries: SalaryPayment[]; total: number }>('/finance/payroll/salaries', query as unknown as Record<string, unknown>);
}

export async function createSalaryPayment(input: CreateSalaryPaymentInput, idempotencyKey?: string): Promise<SalaryPayment> {
  const { salary } = await apiClient.post<{ salary: SalaryPayment }>('/finance/payroll/salaries', input, { idempotencyKey });
  return salary;
}

export async function submitSalaryPayment(id: string, idempotencyKey?: string): Promise<SalaryPayment> {
  const { salary } = await apiClient.post<{ salary: SalaryPayment }>(`/finance/payroll/salaries/${id}/submit`, undefined, { idempotencyKey });
  return salary;
}

export async function approveSalaryPayment(id: string, notes?: string, idempotencyKey?: string): Promise<{ salary: SalaryPayment; ledgerEntry: LedgerEntry }> {
  return apiClient.post<{ salary: SalaryPayment; ledgerEntry: LedgerEntry }>(`/finance/payroll/salaries/${id}/approve`, { notes }, { idempotencyKey });
}

export async function rejectSalaryPayment(id: string, reason: string, idempotencyKey?: string): Promise<{ salary: SalaryPayment }> {
  return apiClient.post<{ salary: SalaryPayment }>(`/finance/payroll/salaries/${id}/reject`, { reason }, { idempotencyKey });
}

// ─── Advances ────────────────────────────────────────────────────────────────

export async function listAdvances(query: AdvanceQuery): Promise<{ advances: EmployeeAdvance[]; total: number }> {
  return apiClient.get<{ advances: EmployeeAdvance[]; total: number }>('/finance/payroll/advances', query as unknown as Record<string, unknown>);
}

export async function createEmployeeAdvance(input: CreateEmployeeAdvanceInput, idempotencyKey?: string): Promise<EmployeeAdvance> {
  const { advance } = await apiClient.post<{ advance: EmployeeAdvance }>('/finance/payroll/advances', input, { idempotencyKey });
  return advance;
}

export async function submitEmployeeAdvance(id: string, idempotencyKey?: string): Promise<EmployeeAdvance> {
  const { advance } = await apiClient.post<{ advance: EmployeeAdvance }>(`/finance/payroll/advances/${id}/submit`, undefined, { idempotencyKey });
  return advance;
}

export async function approveEmployeeAdvance(id: string, notes?: string, idempotencyKey?: string): Promise<{ advance: EmployeeAdvance; ledgerEntry: LedgerEntry }> {
  return apiClient.post<{ advance: EmployeeAdvance; ledgerEntry: LedgerEntry }>(`/finance/payroll/advances/${id}/approve`, { notes }, { idempotencyKey });
}

export async function rejectEmployeeAdvance(id: string, reason: string, idempotencyKey?: string): Promise<{ advance: EmployeeAdvance }> {
  return apiClient.post<{ advance: EmployeeAdvance }>(`/finance/payroll/advances/${id}/reject`, { reason }, { idempotencyKey });
}

// ─── Salary Ledger (screen 11) — strictly read-only ─────────────────────────

export async function getSalaryLedger(query: SalaryLedgerQuery): Promise<SalaryLedger> {
  const { ledger } = await apiClient.get<{ ledger: SalaryLedger }>('/finance/payroll/ledger', query as unknown as Record<string, unknown>);
  return ledger;
}

export async function getSalaryLedgerPayments(params: { year?: number; month?: number; employeeId?: string; search?: string; limit?: number; offset?: number }): Promise<SalaryLedgerPayments> {
  return apiClient.get<SalaryLedgerPayments>('/finance/payroll/ledger/payments', params as unknown as Record<string, unknown>);
}
