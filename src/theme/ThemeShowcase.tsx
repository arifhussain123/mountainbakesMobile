import { Pressable, ScrollView, Text, View } from 'react-native';
import { ACCENT_OPTIONS } from './colors';
import { useAccentStore } from './useAccentStore';
import { useProductionTheme } from './index';

const STATUS_SAMPLES = [
  { label: 'Covered / Approved / Delivered', colorKey: 'success' as const },
  { label: 'Pending / Awaiting Review / Low stock', colorKey: 'warning' as const },
  { label: 'Rejected / Shortage / Negative', colorKey: 'danger' as const },
  { label: 'Awaiting Verification / Upcoming', colorKey: 'info' as const },
  { label: 'Verified / Awaiting Approval', colorKey: 'violet' as const },
];

/**
 * productionApp.md Step 1 "Done when" screen — not wired into any navigator
 * yet (that's Step 3's job). Import and render it ad hoc to eyeball the
 * palette; there's no device/emulator in this environment to screenshot it
 * from, so this has only been verified by `tsc`/`eslint`, not a live render.
 */
export function ThemeShowcase() {
  const theme = useProductionTheme();
  const setAccent = useAccentStore((state) => state.setAccent);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.screenHorizontal, gap: theme.spacing.gap.lg }}>
        <Text style={[theme.typography.display, { color: theme.colors.text }]}>THEME{'\n'}
          <Text style={{ color: theme.colors.accent }}>SHOWCASE</Text>
        </Text>

        <View style={{ flexDirection: 'row', gap: theme.spacing.gap.sm }}>
          {ACCENT_OPTIONS.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Use accent ${option}`}
              onPress={() => setAccent(option)}
              style={{
                width: 40,
                height: 40,
                borderRadius: theme.radii.chip,
                backgroundColor: option,
                borderWidth: option === theme.colors.accent ? 3 : 0,
                borderColor: theme.colors.text,
              }}
            />
          ))}
        </View>

        <Text style={[theme.typography.sheetTitle, { color: theme.colors.text }]}>Sheet Title</Text>
        <Text style={[theme.typography.heroNumber, { color: theme.colors.text }]}>Rs. 48,200</Text>
        <Text style={[theme.typography.heroNumberCompact, { color: theme.colors.text }]}>Rs. 12,400</Text>
        <Text style={[theme.typography.title, { color: theme.colors.text }]}>Card Title</Text>
        <Text style={[theme.typography.body, { color: theme.colors.textSoft }]}>Body text, semibold, secondary values.</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>Label text</Text>
        <Text style={[theme.typography.overline, { color: theme.colors.textDim }]}>Overline / Column Header</Text>

        <View
          style={{
            padding: theme.spacing.cardPadding.lg,
            borderRadius: theme.radii.card,
            backgroundColor: theme.colors.accent,
            gap: theme.spacing.gap.sm,
          }}>
          <Text style={[theme.typography.overline, { color: theme.colors.onAccent }]}>ACCENT CARD</Text>
          <Text style={[theme.typography.heroNumber, { color: theme.colors.onAccent }]}>2,480 units</Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.gap.sm }}>
            <View style={{ flex: 1, padding: theme.spacing.cardPadding.sm, borderRadius: theme.radii.smallCard, backgroundColor: theme.colors.ink }}>
              <Text style={[theme.typography.label, { color: theme.colors.text }]}>Produced</Text>
              <Text style={[theme.typography.title, { color: theme.colors.text }]}>2,310</Text>
            </View>
            <View style={{ flex: 1, padding: theme.spacing.cardPadding.sm, borderRadius: theme.radii.smallCard, backgroundColor: theme.colors.ink }}>
              <Text style={[theme.typography.label, { color: theme.colors.text }]}>Fulfilment</Text>
              <Text style={[theme.typography.title, { color: theme.colors.text }]}>93%</Text>
            </View>
          </View>
        </View>

        <View
          style={{
            padding: theme.spacing.cardPadding.lg,
            borderRadius: theme.radii.card,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            gap: theme.spacing.gap.sm,
          }}>
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>Status Pills</Text>
          {STATUS_SAMPLES.map((sample) => {
            const color = theme.colors[sample.colorKey];
            return (
              <View
                key={sample.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.gap.sm,
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.divider,
                }}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: theme.radii.pillBadge,
                    backgroundColor: theme.tint(color, 0.15),
                  }}>
                  <Text style={[theme.typography.label, { color }]}>{sample.colorKey.toUpperCase()}</Text>
                </View>
                <Text style={[theme.typography.body, { color: theme.colors.textMuted, flex: 1 }]}>{sample.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.gap.sm }}>
          {(
            [
              ['surface', theme.colors.surface],
              ['surfaceStrong', theme.colors.surfaceStrong],
              ['border', theme.colors.border],
              ['divider', theme.colors.divider],
              ['bgGlowViolet', theme.colors.bgGlowViolet],
              ['bgGlowTeal', theme.colors.bgGlowTeal],
              ['dangerSoft', theme.colors.dangerSoft],
            ] as const
          ).map(([name, value]) => (
            <View key={name} style={{ width: 96, borderRadius: theme.radii.smallCard, overflow: 'hidden' }}>
              <View style={{ height: 48, backgroundColor: value }} />
              <Text style={[theme.typography.label, { color: theme.colors.textDim, marginTop: 4 }]}>{name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
