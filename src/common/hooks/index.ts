/**
 * Cross-feature hooks.
 *
 * Feature-only hooks live in `features/<feature>/hooks/`; a hook lands here the
 * moment a second feature needs it.
 */

export { useBreakpoint } from './useBreakpoint';
export type { Breakpoint } from './useBreakpoint';

export { useDebouncedValue } from './useDebouncedValue';
export { useReducedMotion } from './useReducedMotion';
