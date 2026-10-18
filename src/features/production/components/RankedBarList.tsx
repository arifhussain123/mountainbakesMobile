import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface RankedBarRow {
  key: string;
  label: string;
  value: number;
  sublabel?: string;
}

export interface RankedBarListProps {
  rows: RankedBarRow[];
  onPressRow?: (key: string) => void;
  showRank?: boolean;
}

/** The "Top 10 requested products" / "Branch demand comparison" ranked-bar pattern (screen 01). */
export function RankedBarList({ rows, onPressRow, showRank = true }: RankedBarListProps) {
  const theme = useAppTheme();
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <View style={{ gap: 9 }}>
      {rows.map((row, idx) => {
        return (
          <Pressable
            key={row.key}
            disabled={!onPressRow}
            onPress={onPressRow ? () => onPressRow(row.key) : undefined}
            accessibilityRole={onPressRow ? 'button' : undefined}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {showRank ? (
              <Text style={[theme.typography.label, { color: theme.colors.textFaint, width: 16 }]}>{idx + 1}</Text>
            ) : null}
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600', width: 112 }]} numberOfLines={1}>
              {row.label}
            </Text>
            <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.colors.border }}>
              <View
                style={{
                  height: '100%',
                  borderRadius: 3,
                  width: `${Math.max(2, (row.value / max) * 100)}%`,
                  backgroundColor: theme.colors.primary,
                }}
              />
            </View>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', width: 40, textAlign: 'right' }]}>
              {row.value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
