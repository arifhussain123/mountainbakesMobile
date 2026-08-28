/**
 * React-query wrappers, one file per domain.
 *
 * This is the import surface for screens. Every key comes from
 * `@/api/queryKeys`; nothing here builds a key by hand.
 */

export { useProducts, useCategories, useBranches, useSettings, useStock } from './useCatalogApi';

export {
  useProduct,
  usePriceHistory,
  useCreateProduct,
  useUpdateProduct,
  useSetProductActive,
  useChangePrice,
} from './useProductsApi';

export { useCreateCategory, useUpdateCategory, useDeactivateCategory } from './useCategoriesApi';

export {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useSetUserActive,
  useResetUserPassword,
} from './useUsersApi';

export { useUpdateSettings } from './useSettingsApi';

export { useCreateExpense } from './useExpensesApi';
export type { CreateExpenseResult } from './useExpensesApi';

export { useCreateSale } from './useSalesApi';
export type { SaleOutcome, CreateSaleResult } from './useSalesApi';

export { useCreateStockReturn } from './useReturnsApi';
export type { CreateStockReturnResult } from './useReturnsApi';
