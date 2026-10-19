import { ScrollView, Text, View } from 'react-native';
import { useFinanceTheme } from './index';

const SWATCHES = [
  ['bg', 'bg'],
  ['surface', 'surface'],
  ['surfaceBorder', 'surfaceBorder'],
  ['divider', 'divider'],
  ['navyCard', 'navyCard'],
  ['incomeHeader', 'incomeHeader'],
  ['incomeBar', 'incomeBar'],
  ['incomeBarLegend', 'incomeBarLegend'],
  ['receivedBar', 'receivedBar'],
  ['expenseHeader', 'expenseHeader'],
  ['expenseBar', 'expenseBar'],
  ['expenseBarLegend', 'expenseBarLegend'],
  ['bgGlowPurple', 'bgGlowPurple'],
  ['bgGlowTeal', 'bgGlowTeal'],
] as const;

const STATUS_SAMPLES = [
  ['Posted / Approved / Matched', 'income'],
  ['Pending / Awaiting', 'warning'],
  ['Rejected / short', 'danger'],
  ['Discrepancy / over', 'discrepancy'],
  ['Discount / Pending (help desk)', 'info'],
] as const;

/**
 * financeApp.md Phase 1.1 "Done when" sanity check — tokens only, not the
 * full gallery the spec asks for at the end of Phase 1 (that needs 1.2's
 * shared components first). Not wired into any navigator. No device/
 * emulator in this environment, so this has only been verified by
 * `tsc`/`eslint`, never a live render.
 */
export function ThemeShowcase() {
  const theme = useFinanceTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Text style={[theme.typography.screenTitle, { color: theme.colors.text }]}>FINANCE{'\n'}
          <Text style={{ color: theme.colors.accent }}>TOKENS</Text>
        </Text>
        <Text style={[theme.typography.subtitle, { color: theme.colors.textMuted }]}>Phase 1.1 sanity check</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {SWATCHES.map(([name, key]) => (
            <View key={name} style={{ width: 96, borderRadius: theme.radii.card.sm, overflow: 'hidden' }}>
              <View style={{ height: 48, backgroundColor: theme.colors[key] }} />
              <Text style={{ color: theme.colors.textFaint, fontSize: 10, marginTop: 4 }}>{name}</Text>
            </View>
          ))}
        </View>

        <View
          style={{
            padding: theme.spacing.lg,
            borderRadius: theme.radii.card.lg,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.surfaceBorder,
            gap: theme.spacing.sm,
          }}>
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Status colours (14–16% tint for pill backgrounds)</Text>
          {STATUS_SAMPLES.map(([label, key]) => {
            const color = theme.colors[key];
            return (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radii.pill.lg, backgroundColor: theme.tint(color, 0.15) }}>
                  <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{key.toUpperCase()}</Text>
                </View>
                <Text style={{ color: theme.colors.textMuted, flex: 1, fontSize: 12 }}>{label}</Text>
              </View>
            );
          })}
        </View>

        <View
          style={{
            padding: theme.spacing.lg,
            borderRadius: theme.radii.card.lg,
            backgroundColor: theme.colors.navyCard,
            gap: 4,
          }}>
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>navyCard sample (filter card background)</Text>
        </View>
      </ScrollView>
    </View>
  );
}
