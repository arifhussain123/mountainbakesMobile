import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * The branded illustration set for empty and error states.
 *
 * ---------------------------------------------------------------------------
 * Why these are components rather than PNGs in a folder
 * ---------------------------------------------------------------------------
 * They have to work on `bg` in **both** schemes. A raster cannot: cream line art
 * vanishes on charcoal, and shipping a light and a dark copy of five drawings is
 * ten files to keep in sync by hand — the same duplication problem the rest of
 * this codebase is built to avoid. As vectors reading `useTheme()`, one drawing
 * follows the palette, and there is no `isDark ? a : b` at any call site.
 *
 * They are also ~1 kB each instead of ~30 kB, and stay crisp at any size.
 * `react-native-svg` is already a dependency — it is what draws every Lucide
 * icon in the app.
 *
 * ---------------------------------------------------------------------------
 * One file, on purpose
 * ---------------------------------------------------------------------------
 * "A small branded set, no mismatched styles" is a constraint that decays once
 * the drawings live apart: someone adds a sixth with a heavier stroke and a
 * different frame and nothing catches it. Kept together, the shared constants
 * below ARE the style guide — one 160×120 frame, one stroke weight, one set of
 * caps, four token colours and no others.
 *
 * Rules for anything added here:
 *   - `VIEWBOX`, `STROKE` and round caps/joins are not negotiable per-drawing.
 *   - Colour comes from `palette()` below. No literals, no second accent.
 *   - Line art only. No gradients, no shadows, no photographic detail — this set
 *     sits behind text, and it must never out-shout the message.
 */

const VIEWBOX = '0 0 160 120';
const RATIO = 160 / 120;
const STROKE = 3;

export interface IllustrationProps {
  /** Rendered width in dp. Height follows the 4:3 frame. */
  size?: number;
  /** Defaults to `illustration-<key>` when rendered through `MBIllustration`. */
  testID?: string;
}

const DEFAULT_SIZE = 160;

function useIllustrationPalette() {
  const theme = useTheme();
  return {
    /** Structural outline — the drawing's "ink". */
    line: theme.colors.borderStrong,
    /** Interior fill. Sits a step off `bg` in both schemes. */
    wash: theme.colors.surfaceSunken,
    /** Secondary marks: ruled lines, crumbs, small detail. */
    muted: theme.colors.textMuted,
    /** The single highlight. One per drawing, never two. */
    accent: theme.colors.primary,
    /** Reserved for the two states that carry a status meaning. */
    danger: theme.colors.danger,
    offline: theme.colors.offline,
    bg: theme.colors.bg,
  };
}

/**
 * The shared frame.
 *
 * Marked decorative: every one of these sits directly above a heading and a
 * sentence that already say what happened, so announcing "cracked biscuit" to a
 * screen reader adds nothing and pushes the actual message further down the
 * reading order. `accessibilityElementsHidden` is the iOS half,
 * `importantForAccessibility` the Android half — both are needed.
 */
function Frame({
  size = DEFAULT_SIZE,
  testID,
  children,
}: {
  size?: number;
  testID?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Svg
      width={size}
      height={size / RATIO}
      viewBox={VIEWBOX}
      fill="none"
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <G strokeLinecap="round" strokeLinejoin="round">
        {children}
      </G>
    </Svg>
  );
}

/** Nothing ordered yet — a docket with no lines on it. */
export function EmptyOrders({ size, testID }: IllustrationProps): React.ReactElement {
  const c = useIllustrationPalette();
  return (
    <Frame size={size} testID={testID}>
      <Rect x={44} y={22} width={72} height={84} rx={9} fill={c.wash} stroke={c.line} strokeWidth={STROKE} />
      <Rect x={66} y={12} width={28} height={18} rx={6} fill={c.accent} />
      <Path d="M60 54h40M60 70h40M60 86h24" stroke={c.muted} strokeWidth={STROKE + 1} />
    </Frame>
  );
}

/** No sales rung up — a blank receipt beside an untouched coin. */
export function EmptySales({ size, testID }: IllustrationProps): React.ReactElement {
  const c = useIllustrationPalette();
  return (
    <Frame size={size} testID={testID}>
      <Path
        d="M40 30q0-6 6-6h46q6 0 6 6v62l-7.25 8-7.25-8-7.25 8-7.25-8-7.25 8-7.25-8-7.25 8L40 92Z"
        fill={c.wash}
        stroke={c.line}
        strokeWidth={STROKE}
      />
      <Path d="M54 46h24M54 62h30" stroke={c.muted} strokeWidth={STROKE + 1} />
      {/* A plain concentric coin, deliberately carrying no currency glyph: the
          business bills in PKR and a drawn "$" would be quietly wrong in every
          shop that uses this app. */}
      <Circle cx={124} cy={76} r={17} fill={c.wash} stroke={c.accent} strokeWidth={STROKE} />
      <Circle cx={124} cy={76} r={8} fill="none" stroke={c.accent} strokeWidth={STROKE - 1} />
    </Frame>
  );
}

/** Nothing on the shelf — crates stacked and empty. */
export function EmptyStock({ size, testID }: IllustrationProps): React.ReactElement {
  const c = useIllustrationPalette();
  return (
    <Frame size={size} testID={testID}>
      <Rect x={30} y={62} width={46} height={42} rx={6} fill={c.wash} stroke={c.line} strokeWidth={STROKE} />
      <Rect x={84} y={62} width={46} height={42} rx={6} fill={c.wash} stroke={c.line} strokeWidth={STROKE} />
      <Rect x={57} y={16} width={46} height={42} rx={6} fill={c.wash} stroke={c.line} strokeWidth={STROKE} />
      <Path d="M69 16v42M91 16v42" stroke={c.accent} strokeWidth={STROKE} />
      <Path d="M42 62v42M64 62v42M96 62v42M118 62v42" stroke={c.muted} strokeWidth={STROKE - 1} />
    </Frame>
  );
}

/**
 * Something broke. A cracked biscuit rather than a warning triangle — the
 * triangle is `failed` in the icon set, and one glyph should not mean both
 * "this screen errored" and "a queued row parked".
 */
export function ErrorIllustration({ size, testID }: IllustrationProps): React.ReactElement {
  const c = useIllustrationPalette();
  return (
    <Frame size={size} testID={testID}>
      <Circle cx={80} cy={60} r={40} fill={c.wash} stroke={c.line} strokeWidth={STROKE} />
      <Path d="M80 20l-9 20 11 11-10 17 8 12" stroke={c.danger} strokeWidth={STROKE + 1} fill="none" />
      <Circle cx={58} cy={52} r={4} fill={c.muted} />
      <Circle cx={62} cy={76} r={3.5} fill={c.muted} />
      <Circle cx={100} cy={48} r={3.5} fill={c.muted} />
      <Circle cx={98} cy={74} r={4} fill={c.muted} />
    </Frame>
  );
}

/**
 * No connection. Struck through in `offline`, which is a warning colour rather
 * than a danger one — being offline is expected in a basement shop, and every
 * write still succeeds locally.
 */
export function OfflineIllustration({ size, testID }: IllustrationProps): React.ReactElement {
  const c = useIllustrationPalette();
  return (
    <Frame size={size} testID={testID}>
      <Path
        d="M48 88C38 88 31 80 33 69c2-10 12-14 19-12 2-16 18-25 32-21 12 4 20 15 20 25 10-2 18 6 16 16-2 8-10 11-16 11Z"
        fill={c.wash}
        stroke={c.line}
        strokeWidth={STROKE}
      />
      {/* Cut in bg first so the stroke reads as passing over the cloud. */}
      <Path d="M42 100L118 24" stroke={c.bg} strokeWidth={STROKE + 8} />
      <Path d="M42 100L118 24" stroke={c.offline} strokeWidth={STROKE + 2} />
    </Frame>
  );
}

export const ILLUSTRATIONS = {
  'empty-orders': EmptyOrders,
  'empty-sales': EmptySales,
  'empty-stock': EmptyStock,
  error: ErrorIllustration,
  offline: OfflineIllustration,
} as const;

/**
 * A key, not a component — the same rule `IconKey` follows. Taking a component
 * would let a caller pass any drawing at any size and quietly reopen the
 * mismatched-styles problem this set exists to close.
 */
export type IllustrationKey = keyof typeof ILLUSTRATIONS;

/**
 * Memoised, because these are the most expensive pure render in the app.
 *
 * One illustration is thirty-odd vector nodes, and it sits inside an empty or
 * error state that re-renders with its screen — a query refetching, a network
 * change, a sync count moving. Redrawing a static picture for any of that is
 * work whose only visible effect is the frames it costs. The palette still
 * reaches it: `useIllustrationPalette` reads the theme through context, and
 * context bypasses `memo`.
 */
export const MBIllustration = React.memo(function MBIllustrationView({
  name,
  size,
}: {
  name: IllustrationKey;
  size?: number;
}): React.ReactElement {
  const Component = ILLUSTRATIONS[name];
  return <Component size={size} testID={`illustration-${name}`} />;
});
