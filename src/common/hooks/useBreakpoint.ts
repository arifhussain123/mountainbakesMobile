import { useWindowDimensions } from 'react-native';
import { layout } from '@/common/theme/spacing';

/**
 * The single responsive primitive. One breakpoint, two layouts.
 *
 * `useWindowDimensions` rather than `Dimensions.get()`: the second is read once
 * at module scope and never updates, so a tablet rotated after launch keeps the
 * portrait layout until the app is killed. This re-renders on rotation, on
 * split-screen resize, and on a foldable opening — all three of which are the
 * same event as far as layout is concerned.
 *
 * It reads **width only**. A landscape phone gets the wide layout, and that is
 * correct rather than a bug: the problem a wide screen creates is a line of text
 * too long to read, and a landscape phone has exactly that problem.
 *
 * ---------------------------------------------------------------------------
 * There is deliberately no `isTablet`
 * ---------------------------------------------------------------------------
 * Device class is not what any layout here actually depends on, and a boolean
 * called `isTablet` invites `if (isTablet)` branches that are wrong in
 * split-screen, wrong in landscape, and impossible to test without a device.
 * `isWide` is a statement about the window, which is the thing being laid out.
 */
export interface Breakpoint {
  /** Window width in dp. */
  width: number;
  /** At or past `layout.tabletMin` — use the two-column layout. */
  isWide: boolean;
  /**
   * Cap for a single column of content. Already the full width on a phone, so
   * applying it unconditionally is free and there is no `isWide ?` at call sites.
   */
  maxContentWidth: number;
  /** Cap for a two-column split. */
  maxWideWidth: number;
  /** Columns a card grid should use: 1 narrow, 2 wide. */
  columns: 1 | 2;
}

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  const isWide = width >= layout.tabletMin;

  return {
    width,
    isWide,
    maxContentWidth: layout.maxContentWidth,
    maxWideWidth: layout.maxWideWidth,
    columns: isWide ? 2 : 1,
  };
}
