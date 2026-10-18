import { Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

const ITEMS = [
  { term: 'Opening', body: 'Carries over from yesterday’s closing balance.' },
  { term: 'New stock', body: 'Lands only when the branch verifies a delivery.' },
  { term: 'Waiting demand', body: 'What Production still has to hand over.' },
  { term: 'Adjustment', body: 'An admin correction made today — it clears tomorrow.' },
  { term: 'Listing', body: 'Products with no stock and no movement today aren’t listed.' },
];

/** The column explainer opened from the Stock screen's info chip — plain-language, not jargon. */
export function StockInfoSheet() {
  const theme = useAppTheme();

  return (
    <View>
      {ITEMS.map((item) => (
        <View key={item.term} style={{ marginBottom: 14 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{item.term}</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{item.body}</Text>
        </View>
      ))}
    </View>
  );
}
