/**
 * Public API of the `sync` feature.
 *
 * Cross-feature imports go through this barrel only — never reach into
 * `features/sync/screens/…` from another slice.
 */

export * from './screens';
export * from './components';
