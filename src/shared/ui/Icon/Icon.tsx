import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';

export type IconName =
  | 'menu'
  | 'bell'
  | 'search'
  | 'chevron-down'
  | 'close'
  | 'check'
  | 'warning'
  | 'refresh'
  | 'box'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'calendar'
  | 'camera'
  | 'image';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * A handful of hand-built SVG icons rather than an icon-font dependency —
 * keeps the bundle lean (CLAUDE.md Section 36) for the small, fixed set Phase 1
 * actually needs.
 */
export function Icon({ name, size = 20, color = '#2E1A12' }: IconProps) {
  const stroke = color;
  const common = { fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'menu':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={4} y1={6} x2={20} y2={6} {...common} />
          <Line x1={4} y1={12} x2={20} y2={12} {...common} />
          <Line x1={4} y1={18} x2={20} y2={18} {...common} />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" {...common} />
          <Path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" {...common} />
        </Svg>
      );
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={11} cy={11} r={7} {...common} />
          <Line x1={20} y1={20} x2={16.5} y2={16.5} {...common} />
        </Svg>
      );
    case 'chevron-down':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 9l6 6 6-6" {...common} />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={6} y1={6} x2={18} y2={18} {...common} />
          <Line x1={18} y1={6} x2={6} y2={18} {...common} />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 12l5 5 9-10" {...common} />
        </Svg>
      );
    case 'warning':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3 2 20h20z" {...common} />
          <Line x1={12} y1={10} x2={12} y2={14} {...common} />
          <Circle cx={12} cy={17} r={0.5} fill={stroke} stroke="none" />
        </Svg>
      );
    case 'refresh':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M21 12a9 9 0 1 1-3-6.7L21 8" {...common} />
          <Path d="M21 3v5h-5" {...common} />
        </Svg>
      );
    case 'box':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 7l9-4 9 4-9 4-9-4z" {...common} />
          <Path d="M3 7v10l9 4 9-4V7" {...common} />
          <Line x1={12} y1={11} x2={12} y2={21} {...common} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={12} y1={5} x2={12} y2={19} {...common} />
          <Line x1={5} y1={12} x2={19} y2={12} {...common} />
        </Svg>
      );
    case 'minus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={5} y1={12} x2={19} y2={12} {...common} />
        </Svg>
      );
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 7h16" {...common} />
          <Path d="M9 7V4h6v3" {...common} />
          <Path d="M6 7l1 13h10l1-13" {...common} />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={5} width={18} height={16} rx={2} {...common} />
          <Line x1={3} y1={10} x2={21} y2={10} {...common} />
          <Line x1={8} y1={3} x2={8} y2={7} {...common} />
          <Line x1={16} y1={3} x2={16} y2={7} {...common} />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 8h3l2-3h6l2 3h3v12H4z" {...common} strokeLinejoin="round" />
          <Circle cx={12} cy={13} r={3.5} {...common} />
        </Svg>
      );
    case 'image':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={4} y={4} width={16} height={16} rx={2} {...common} strokeLinejoin="round" />
          <Path d="M4 16l5-5 4 4 3-3 4 4" {...common} strokeLinejoin="round" />
          <Circle cx={15} cy={9} r={1.5} fill={stroke} stroke="none" />
        </Svg>
      );
    default:
      return null;
  }
}
