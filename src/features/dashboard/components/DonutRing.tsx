import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';

export interface DonutRingProps {
  size: number;
  stroke: number;
  /** Shares in percent (0–100), drawn clockwise from 12 o'clock in order. */
  parts: { pct: number; color: string }[];
  /** Centred inside the ring (a count and a caption). */
  children?: ReactNode;
}

/** The redesign's `donut()`: a lavender track with each part's arc laid end to end. */
export function DonutRing({ size, stroke, parts, children }: DonutRingProps) {
  const theme = useAppTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const track = theme.isDark ? theme.colors.border : '#EEEBFD';
  let offset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {parts.map((part, i) => {
          const pct = Number.isFinite(part.pct) ? Math.max(0, Math.min(100, part.pct)) : 0;
          const len = (c * pct) / 100;
          const dashOffset = -offset;
          offset += len;
          if (len <= 0) return null;
          return (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={part.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={dashOffset}
              fill="none"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
