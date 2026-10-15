import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';

export interface DualLinePoint {
  label: string;
  a: number;
  b: number;
}

export interface ProductionDualLineChartProps {
  points: DualLinePoint[];
  colorA: string;
  colorB: string;
  height?: number;
}

/**
 * The "Monthly demand vs production" 12-month dual-line chart (screen 01) —
 * plain `react-native-svg` polylines scaled to the data's own min/max, not a
 * charting library this app does not otherwise depend on.
 */
export function ProductionDualLineChart({ points, colorA, colorB, height = 140 }: ProductionDualLineChartProps) {
  const theme = useAppTheme();
  const width = 312;
  const padTop = 10;
  const padBottom = 24;
  const plotHeight = height - padTop - padBottom;
  const max = Math.max(1, ...points.flatMap((p) => [p.a, p.b]));
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const y = (v: number) => padTop + plotHeight - (v / max) * plotHeight;

  const lineA = points.map((p, i) => `${i * step},${y(p.a)}`).join(' ');
  const lineB = points.map((p, i) => `${i * step},${y(p.b)}`).join(' ');

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={0} y1={padTop + plotHeight} x2={width} y2={padTop + plotHeight} stroke={theme.colors.border} />
        <Polyline points={lineA} fill="none" stroke={colorA} strokeWidth={2} />
        <Polyline points={lineB} fill="none" stroke={colorB} strokeWidth={2.2} />
        {points.map((p, i) => (
          <Circle key={`a-${i}`} cx={i * step} cy={y(p.a)} r={2.6} fill={theme.colors.background} stroke={colorA} strokeWidth={1.6} />
        ))}
        {points.map((p, i) => (
          <Circle key={`b-${i}`} cx={i * step} cy={y(p.b)} r={2.6} fill={theme.colors.background} stroke={colorB} strokeWidth={1.6} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -16 }}>
        {points.map((p, i) => (
          <Text key={i} style={[theme.typography.label, { color: theme.colors.textFaint, fontSize: 8 }]} numberOfLines={1}>
            {i % Math.ceil(points.length / 6) === 0 ? p.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}
