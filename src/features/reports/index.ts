/**
 * Public API of the `reports` feature.
 *
 * Cross-feature imports go through this barrel only — never reach into
 * `features/reports/screens/…` from another slice.
 */

export * from './screens';
export * from './hooks';
export * from './components';
export {
  describePeriod,
  periodFor,
  previousPeriodFor,
} from './comparisonPeriods';
export type {
  ComparisonRangeKey,
  Period,
  PeriodBucket,
  PeriodWording,
} from './comparisonPeriods';
