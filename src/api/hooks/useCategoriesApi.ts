import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createCategory,
  deactivateCategory,
  updateCategory,
} from '@/api/services/categoriesService';
import { qk } from '@/api/queryKeys';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/shared/schemas/product.schemas';

/**
 * Category administration.
 *
 * Every mutation invalidates **products as well as categories**. A category
 * carries the name a product renders under, and the server keeps its own cached
 * category list (`invalidate('categories')` on each write) — so a rename that
 * refreshed only the category list would leave every product picker showing the
 * old name until something else happened to evict it.
 */

function useInvalidateCatalogue() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: qk.categories.all() });
    client.invalidateQueries({ queryKey: qk.products.all() });
  };
}

export function useCreateCategory() {
  const invalidate = useInvalidateCatalogue();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCatalogue();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      updateCategory(id, input),
    onSuccess: invalidate,
  });
}

/** Deactivate. The server sets `is_active = false`; the row and its products stay. */
export function useDeactivateCategory() {
  const invalidate = useInvalidateCatalogue();
  return useMutation({
    mutationFn: (id: string) => deactivateCategory(id),
    onSuccess: invalidate,
  });
}
