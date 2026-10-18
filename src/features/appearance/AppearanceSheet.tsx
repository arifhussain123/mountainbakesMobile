import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme, type ThemeModeSetting } from '@/shared/theme';
import { FormBottomSheet, Icon } from '@/shared/ui';
import { useAppearanceSheetStore } from './store/appearanceSheetStore';

const MODE_OPTIONS: { value: ThemeModeSetting; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Mounted once at the app root (see `App.tsx`) — reachable from the
 * Dashboard header's moon/sun long-press and the Drawer footer's
 * "Appearance" row, neither of which share a component tree, so open/close
 * goes through `appearanceSheetStore` rather than a locally-held ref (see
 * that store's own note). Mode and accent apply the instant they're tapped —
 * `useAppTheme()` is the single source of truth every screen already reads,
 * so there's no separate "preview" state to reconcile; the crossfade in
 * `ThemeProvider` itself is the live-preview animation the brief asks for.
 */
export function AppearanceSheet() {
  const theme = useAppTheme();
  const isOpen = useAppearanceSheetStore((s) => s.isOpen);
  const close = useAppearanceSheetStore((s) => s.close);
  const sheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (isOpen) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [isOpen]);

  return (
    <FormBottomSheet
      ref={sheetRef}
      title="Appearance"
      subtitle="Choose how Mountain Bakes looks on this device."
      onDismiss={close}
      onRequestClose={() => sheetRef.current?.dismiss()}
      snapPoints={['50%']}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>MODE</Text>
      <View
        style={[
          styles.segmentRow,
          { marginTop: 8, backgroundColor: theme.colors.border, borderRadius: theme.radii.md },
        ]}>
        {MODE_OPTIONS.map((option) => {
          const active = theme.mode === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${option.label} mode`}
              onPress={() => theme.setMode(option.value)}
              style={[
                styles.segment,
                { backgroundColor: active ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm },
              ]}>
              <Text style={[theme.typography.bodySmall, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: theme.spacing.lg }]}>
        ACCENT
      </Text>
      <View style={[styles.swatchRow, { marginTop: 10 }]}>
        {theme.accentOptions.map((option) => {
          const active = theme.accent === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${option.label} accent${active ? ', selected' : ''}`}
              onPress={() => theme.setAccent(option.id)}
              style={styles.swatchTouch}>
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: option.hex,
                    borderColor: active ? theme.colors.text : 'transparent',
                  },
                ]}>
                {active ? <Icon name="check" size={18} color={option.onAccentText} /> : null}
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </FormBottomSheet>
  );
}

const styles = StyleSheet.create({
  segmentRow: { flexDirection: 'row', padding: 3 },
  segment: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  swatchTouch: { alignItems: 'center', minWidth: 52 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
