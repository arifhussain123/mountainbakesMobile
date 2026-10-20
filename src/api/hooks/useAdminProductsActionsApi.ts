import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as adminProductsActionsService from '../services/adminProductsActionsService';
import type { ChangeProductPriceInput, CreatePackingMaterialInput, CreateProductInput, UpdatePackingMaterialInput, UpdateProductInput } from '../types';

// ─── Products (web ProductsPage / ProductForm / ChangePriceDialog) ──────────

/**
 * Every reader of a product or its price: this list, the POS catalogue, the
 * Price History picker and its timelines — the web's `['products']` +
 * `['data', 'products']` invalidation.
 */
function invalidateProducts(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['adminProductPages'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.products() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.catalogProducts() });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => adminProductsActionsService.createProduct(input),
    onSuccess: () => invalidateProducts(queryClient),
  });
}

/** Edit, and the web's Activate (`{ isActive: true }`). */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => adminProductsActionsService.updateProduct(id, input),
    onSuccess: () => invalidateProducts(queryClient),
  });
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProductsActionsService.deactivateProduct(id),
    onSuccess: () => invalidateProducts(queryClient),
  });
}

/** A price change also writes a history row, so Price History refetches with the lists. */
export function useChangeProductPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ChangeProductPriceInput }) => adminProductsActionsService.changeProductPrice(id, input),
    onSuccess: () => {
      invalidateProducts(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['priceHistory'] });
    },
  });
}

// ─── Packing materials (web PackingMaterialsPage / PackingMaterialForm) ─────

/** Prefix match: the active-only list (demand form) and the admin's include-inactive one. */
function invalidatePackingMaterials(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.packingMaterials() });
}

export function useCreatePackingMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePackingMaterialInput) => adminProductsActionsService.createPackingMaterial(input),
    onSuccess: () => invalidatePackingMaterials(queryClient),
  });
}

/** Edit, and Disable / Enable (`{ isActive }`). */
export function useUpdatePackingMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePackingMaterialInput }) => adminProductsActionsService.updatePackingMaterial(id, input),
    onSuccess: () => invalidatePackingMaterials(queryClient),
  });
}

export function useDeletePackingMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProductsActionsService.deletePackingMaterial(id),
    onSuccess: () => invalidatePackingMaterials(queryClient),
  });
}
