import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as adminCatalogActionsService from '../services/adminCatalogActionsService';
import type { AdminCustomerInput } from '../types';

// ─── Categories (web CategoriesPage) ────────────────────────────────────────

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminCatalogActionsService.createCategory(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.productCategories() }),
  });
}

/** A rename also rewrites each product's denormalised `categoryName`, so the Products list refetches too. */
export function useRenameCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => adminCatalogActionsService.renameCategory(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.productCategories() });
      void queryClient.invalidateQueries({ queryKey: ['adminProductPages'] });
    },
  });
}

export function useRemoveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCatalogActionsService.removeCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.productCategories() }),
  });
}

// ─── Customers (web CustomerForm) ───────────────────────────────────────────

/** `['adminCustomers']` covers both the Data Engine pages and the plain search list. */
function invalidateCustomers(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminCustomerInput) => adminCatalogActionsService.createCustomer(input),
    onSuccess: () => invalidateCustomers(queryClient),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminCustomerInput }) => adminCatalogActionsService.updateCustomer(id, input),
    onSuccess: () => invalidateCustomers(queryClient),
  });
}
