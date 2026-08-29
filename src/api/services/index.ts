/**
 * Transport barrel — one namespace per domain.
 *
 * These are plain async functions over `@/api/client`. Screens and
 * components must not import them directly; go through `@/api/hooks` so
 * caching, retry and the offline queue stay in one place.
 */

export * as auth from './authService';
export * as catalog from './catalogService';
export * as categories from './categoriesService';
export * as events from './eventsService';
export * as expenses from './expensesService';
export * as finance from './financeService';
export * as loginHistory from './loginHistoryService';
export * as index from './index';
export * as production from './productionService';
export * as products from './productsService';
export * as reports from './reportsService';
export * as returns from './returnsService';
export * as settings from './settingsService';
export * as stockHistory from './stockHistoryService';
export * as support from './supportService';
export * as users from './usersService';
