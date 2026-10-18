export interface NotchPathParams {
  width: number;
  height: number;
  /** Center of the notch, in bar-local x coordinates (0..width). */
  notchX: number;
  /** Full width of the notch opening. */
  notchWidth?: number;
  /** How far the notch dips down from the top edge. */
  notchDepth?: number;
  /** Top-left/top-right corner radius of the bar itself. */
  cornerRadius?: number;
}

const DEFAULT_NOTCH_WIDTH = 80; // ~56dp bubble + 24dp, per the visual spec
const DEFAULT_NOTCH_DEPTH = 30;
const DEFAULT_CORNER_RADIUS = 24;

/**
 * Keeps the notch's cut fully inside the bar's straight top edge — between the
 * two rounded corners — on the first and last tabs, so it never clips into or
 * past a corner arc.
 *
 * A plain exported function (not inlined in `buildNotchBarPath`) so a caller
 * driving the bubble's `translateX` from the same clamped value never drifts
 * from where the path's dip actually is.
 */
export function clampNotchX(notchX: number, width: number, notchWidth: number = DEFAULT_NOTCH_WIDTH, cornerRadius: number = DEFAULT_CORNER_RADIUS): number {
  'worklet';
  const half = notchWidth / 2;
  const min = cornerRadius + half;
  const max = width - cornerRadius - half;
  if (max < min) return width / 2; // a bar too narrow for both constraints — center is the least-wrong answer.
  if (notchX < min) return min;
  if (notchX > max) return max;
  return notchX;
}

/**
 * Builds the bar's outline as a single SVG path: a rounded-top rectangle with
 * a smooth concave notch cut into the top edge, centered on `notchX`. Pure
 * arithmetic and string building only — no closures over non-serializable
 * values — so it can run on the UI thread inside a Reanimated
 * `useAnimatedProps` worklet as well as in plain JS.
 *
 * The notch is two cubic Béziers (left shoulder down to the dip, dip back up
 * to the right shoulder) rather than a single curve or an arc — that's what
 * keeps both edges of the cut tangent to the flat bar top instead of meeting
 * it at a visible corner.
 */
export function buildNotchBarPath({
  width,
  height,
  notchX,
  notchWidth = DEFAULT_NOTCH_WIDTH,
  notchDepth = DEFAULT_NOTCH_DEPTH,
  cornerRadius = DEFAULT_CORNER_RADIUS,
}: NotchPathParams): string {
  'worklet';
  const cx = clampNotchX(notchX, width, notchWidth, cornerRadius);
  const half = notchWidth / 2;
  const left = cx - half;
  const right = cx + half;
  // How far the shoulder curves reach toward the center before dipping —
  // tuned so the cut reads as one smooth bump, not two kinks either side of a point.
  const shoulder = half * 0.55;

  return [
    `M 0 ${cornerRadius}`,
    `Q 0 0 ${cornerRadius} 0`,
    `L ${left} 0`,
    `C ${left + shoulder} 0 ${cx - shoulder} ${notchDepth} ${cx} ${notchDepth}`,
    `C ${cx + shoulder} ${notchDepth} ${right - shoulder} 0 ${right} 0`,
    `L ${width - cornerRadius} 0`,
    `Q ${width} 0 ${width} ${cornerRadius}`,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    'Z',
  ].join(' ');
}
