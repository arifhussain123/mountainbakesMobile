import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as priceImportService from '../services/priceImportService';
import type { PriceImportFile } from '../services/priceImportService';
import type { PriceImportCommitInput } from '../types';

// ─── Price List import (web PriceListPage "Import Price List") ──────────────

/** Uploads the sheet for the server's validated preview. Writes nothing, so it invalidates nothing. */
export function usePreviewPriceImport() {
  return useMutation({
    mutationFn: (file: PriceImportFile) => priceImportService.previewPriceImport(file),
  });
}

/**
 * Applies the confirmed rows. Every reader of a product's price refetches —
 * the admin list, the POS catalogue, Price History and its timelines — the
 * web `saveImport`'s `['products']` + `['priceHistory']` invalidation.
 */
export function useCommitPriceImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PriceImportCommitInput) => priceImportService.commitPriceImport(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminProductPages'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogProducts() });
      void queryClient.invalidateQueries({ queryKey: ['priceHistory'] });
    },
  });
}
