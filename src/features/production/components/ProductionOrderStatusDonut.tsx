import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

export interface ProductionOrderStatusDonutProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
}

/**
 * The "Order status" donut (screen 01) — a stacked-arc ring built from plain
 * `react-native-svg` `Circle`s (standard stroke-dasharray/offset technique),
 * not a charting library this app does not otherwise depend on.
 */
export function ProductionOrderStatusDonut({ segments, size = 104, strokeWidth = 14, centerLabel = 'orders' }: ProductionOrderStatusDonutProps) {
  const theme = useAppTheme();
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let offsetSoFar = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={cx} cy={cy} r={r} stroke={theme.colors.border} strokeWidth={strokeWidth} fill="none" />
        {total > 0
          ? segments
              .filter((s) => s.value > 0)
              .map((s) => {
                const fraction = s.value / total;
                const dash = fraction * circumference;
                const el = (
                  <Circle
                    key={s.key}
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={s.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offsetSoFar}
                    strokeLinecap="butt"
                    fill="none"
                    rotation="-90"
                    origin={`${cx}, ${cy}`}
                  />
                );
                offsetSoFar += dash;
                return el;
              })
          : null}
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>{total}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{centerLabel}</Text>
      </View>
    </View>
  );
}
