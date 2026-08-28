import { useMemo } from 'react';
import { useSettings } from '@/api/hooks/useCatalogApi';
import type { TaxSettings } from '@/common/helpers/saleTotals';

/**
 * The tenant settings the selling screens need, with safe defaults.
 *
 * Tax defaults to OFF when settings have not loaded. Defaulting it on would add
 * a charge the tenant may not levy; defaulting it off shows a total that is at
 * worst short, and the server recomputes and returns the authoritative figure
 * either way.
 */
export function useCatalogSettings(): {
  currencySymbol: string | undefined;
  tax: TaxSettings;
  isLoading: boolean;
} {
  const settings = useSettings();

  const tax = useMemo<TaxSettings>(
    () => ({
      gstEnabled: settings.data?.gstEnabled ?? false,
      gstRate: settings.data?.gstRate ?? 0,
    }),
    [settings.data?.gstEnabled, settings.data?.gstRate],
  );

  return {
    currencySymbol: settings.data?.currencySymbol,
    tax,
    isLoading: settings.isPending,
  };
}
