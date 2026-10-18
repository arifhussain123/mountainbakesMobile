import { Routes } from '../routes';
import type { AuthStackParamList } from '../types';

/**
 * Pulled out of the navigator component so it's directly testable without
 * rendering `@react-navigation/native-stack` (same reasoning as
 * `shared/offline/writeQueue`'s injected-storage split: test the decision,
 * not the native chrome around it).
 */
export function resolveInitialRoute(onboardingSeen: string | null): keyof AuthStackParamList {
  return onboardingSeen === 'true' ? Routes.LOGIN : Routes.ONBOARDING;
}
