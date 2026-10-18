import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { financePayrollService } from '../services';
import type {
  AdvanceQuery,
  CancelResignationInput,
  CreateEmployeeAdvanceInput,
  CreateEmployeeInput,
  CreateSalaryPaymentInput,
  CreateSalaryRevisionInput,
  RecordResignationInput,
  SalaryLedgerQuery,
  SalaryQuery,
  UpdateEmployeeInput,
} from '../types';

// ─── Employees ───────────────────────────────────────────────────────────────

export function useEmployees(opts?: { department?: string; includeInactive?: boolean; search?: string }) {
  return useQuery({
    queryKey: queryKeys.employees(opts),
    queryFn: () => financePayrollService.listEmployees(opts),
  });
}

function invalidateEmployees(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: ['employees'] });
  if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.employeeProfile(id) });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateEmployeeInput; idempotencyKey?: string }) =>
      financePayrollService.createEmployee(input, idempotencyKey),
    onSuccess: () => invalidateEmployees(queryClient),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, idempotencyKey }: { id: string; input: UpdateEmployeeInput; idempotencyKey?: string }) =>
      financePayrollService.updateEmployee(id, input, idempotencyKey),
    onSuccess: (_data, { id }) => invalidateEmployees(queryClient, id),
  });
}

export function useEmployeeProfile(id: string) {
  return useQuery({
    queryKey: queryKeys.employeeProfile(id),
    queryFn: () => financePayrollService.getEmployeeProfile(id),
    enabled: !!id,
  });
}

export function useRecordResignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, input, idempotencyKey }: { employeeId: string; input: RecordResignationInput; idempotencyKey?: string }) =>
      financePayrollService.recordResignation(employeeId, input, idempotencyKey),
    onSuccess: (_data, { employeeId }) => invalidateEmployees(queryClient, employeeId),
  });
}

export function useCancelResignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, input, idempotencyKey }: { employeeId: string; input: CancelResignationInput; idempotencyKey?: string }) =>
      financePayrollService.cancelResignation(employeeId, input, idempotencyKey),
    onSuccess: (_data, { employeeId }) => invalidateEmployees(queryClient, employeeId),
  });
}

export function useSalaryRevisions(employeeId: string) {
  return useQuery({
    queryKey: queryKeys.salaryRevisions(employeeId),
    queryFn: () => financePayrollService.listSalaryRevisions(employeeId),
    enabled: !!employeeId,
  });
}

export function useCreateSalaryRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, input, idempotencyKey }: { employeeId: string; input: CreateSalaryRevisionInput; idempotencyKey?: string }) =>
      financePayrollService.createSalaryRevision(employeeId, input, idempotencyKey),
    onSuccess: (_data, { employeeId }) => {
      invalidateEmployees(queryClient, employeeId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.salaryRevisions(employeeId) });
    },
  });
}

export function useEmployeeAdvanceSummary(employeeId: string) {
  return useQuery({
    queryKey: queryKeys.employeeAdvanceSummary(employeeId),
    queryFn: () => financePayrollService.getEmployeeAdvanceSummary(employeeId),
    enabled: !!employeeId,
  });
}

// ─── Salaries (payslips) ─────────────────────────────────────────────────────

export function useSalaries(query: SalaryQuery) {
  return useQuery({
    queryKey: queryKeys.salaries(query),
    queryFn: () => financePayrollService.listSalaries(query),
  });
}

function invalidateSalaries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['salaries'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.pendingApprovals() });
}

export function useCreateSalaryPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateSalaryPaymentInput; idempotencyKey?: string }) =>
      financePayrollService.createSalaryPayment(input, idempotencyKey),
    onSuccess: () => invalidateSalaries(queryClient),
  });
}

export function useSubmitSalaryPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey?: string }) => financePayrollService.submitSalaryPayment(id, idempotencyKey),
    onSuccess: () => invalidateSalaries(queryClient),
  });
}

export function useApproveSalaryPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes, idempotencyKey }: { id: string; notes?: string; idempotencyKey?: string }) =>
      financePayrollService.approveSalaryPayment(id, notes, idempotencyKey),
    onSuccess: () => invalidateSalaries(queryClient),
  });
}

export function useRejectSalaryPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, idempotencyKey }: { id: string; reason: string; idempotencyKey?: string }) =>
      financePayrollService.rejectSalaryPayment(id, reason, idempotencyKey),
    onSuccess: () => invalidateSalaries(queryClient),
  });
}

// ─── Advances ────────────────────────────────────────────────────────────────

export function useAdvances(query: AdvanceQuery) {
  return useQuery({
    queryKey: queryKeys.advances(query),
    queryFn: () => financePayrollService.listAdvances(query),
  });
}

function invalidateAdvances(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['advances'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.pendingApprovals() });
}

export function useCreateEmployeeAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateEmployeeAdvanceInput; idempotencyKey?: string }) =>
      financePayrollService.createEmployeeAdvance(input, idempotencyKey),
    onSuccess: () => invalidateAdvances(queryClient),
  });
}

export function useSubmitEmployeeAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey?: string }) => financePayrollService.submitEmployeeAdvance(id, idempotencyKey),
    onSuccess: () => invalidateAdvances(queryClient),
  });
}

export function useApproveEmployeeAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes, idempotencyKey }: { id: string; notes?: string; idempotencyKey?: string }) =>
      financePayrollService.approveEmployeeAdvance(id, notes, idempotencyKey),
    onSuccess: () => invalidateAdvances(queryClient),
  });
}

export function useRejectEmployeeAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, idempotencyKey }: { id: string; reason: string; idempotencyKey?: string }) =>
      financePayrollService.rejectEmployeeAdvance(id, reason, idempotencyKey),
    onSuccess: () => invalidateAdvances(queryClient),
  });
}

// ─── Salary Ledger (11) ──────────────────────────────────────────────────────

export function useSalaryLedger(query: SalaryLedgerQuery) {
  return useQuery({
    queryKey: queryKeys.salaryLedger(query),
    queryFn: () => financePayrollService.getSalaryLedger(query),
  });
}

export function useSalaryLedgerPayments(params: { year?: number; month?: number; employeeId?: string; search?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.salaryLedgerPayments(params),
    queryFn: () => financePayrollService.getSalaryLedgerPayments(params),
    enabled: !!(params.employeeId || params.month),
  });
}
