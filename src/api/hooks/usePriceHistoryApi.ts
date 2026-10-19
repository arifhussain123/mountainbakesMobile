import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { priceHistoryService } from '../services';
import type { PriceHistoryQuery } from '../types';

const PRICE_HISTORY_PAGE = 50;
/** The server's own ceiling for one page — a product's whole history fits in it. */
const PRODUCT_HISTORY_LIMIT = 1000;

/** The Price History list, newest change first, paged by `offset`. */
export function usePriceHistoryPages(query: PriceHistoryQuery) {
  return useInfiniteQuery({
    queryKey: queryKeys.priceHistoryPages(query),
    queryFn: ({ pageParam }) => priceHistoryService.listPriceHistory({ ...query, limit: PRICE_HISTORY_PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.history.length, 0);
      return loaded < lastPage.total && lastPage.history.length > 0 ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
}

/** One product's every price change — the price timeline. */
export function useProductPriceHistory(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.productPriceHistory(productId ?? ''),
    queryFn: () => priceHistoryService.listPriceHistory({ productId, limit: PRODUCT_HISTORY_LIMIT, offset: 0 }),
    enabled: !!productId,
  });
}

/** Every product with its cost and current price (Super Admin), hidden Special Order items included. */
export function useCatalogProducts() {
  return useQuery({
    queryKey: queryKeys.catalogProducts(),
    queryFn: () => priceHistoryService.listCatalogProducts(),
  });
}
