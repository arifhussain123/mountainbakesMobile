import { create } from 'zustand';

interface AppearanceSheetState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/**
 * The Appearance sheet is reachable from several places that don't share a
 * component tree — the Dashboard header's moon/sun long-press, and a row in
 * the Drawer footer (a different navigator branch entirely). Rather than
 * thread a `BottomSheetModal` ref through both, this is a single global
 * open/close flag (same shape as the offline-queue store); `AppearanceSheet`
 * itself is mounted once, at the app root, and just watches `isOpen`.
 */
export const useAppearanceSheetStore = create<AppearanceSheetState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
