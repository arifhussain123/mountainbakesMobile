import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RestrictionRulesState } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { MONO } from '../../components/AdminDetail';
import { CONNECTION_REQUIRED_NOTICE, DEFAULT_PREVIEW_SCENARIO, PREVIEW_SCENARIOS, buildPreview } from '../../utils/restrictionPreview';
import { RestrictionNotice } from './RestrictionNotice';

/**
 * Restriction Rules → Popup Preview — the web `PreviewTab`. What a branch sees,
 * for each of the 16 situations, under the rules AS SAVED: the notice comes
 * from the same evaluators the API runs (`restrictionPreview.ts`) and is drawn
 * by the same renderer a popup would use. Only the facts fed in (sample demand
 * numbers, a sample stock figure) are made up, and they are labelled so.
 * The web's side list of scenarios is a horizontal picker here.
 */
export function PreviewTab({ state }: { state: RestrictionRulesState }) {
  const theme = useAppTheme();
  const [key, setKey] = useState(DEFAULT_PREVIEW_SCENARIO);
  const p = buildPreview(key, state);

  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {PREVIEW_SCENARIOS.map((s) => {
          const selected = s.key === p.scenario.key;
          return (
            <Pressable
              key={s.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${s.popup}: ${s.label}`}
              onPress={() => setKey(s.key)}
              style={[
                styles.pick,
                {
                  borderColor: selected ? theme.colors.primary : theme.colors.cardBorder,
                  backgroundColor: selected ? `${theme.colors.primary}1F` : theme.colors.cardFill,
                },
              ]}>
              <Text style={{ fontSize: 10.5, fontWeight: '600', color: theme.colors.textSecondary }}>{s.popup}</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.colors.text }}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* The mock popup. */}
      <View style={[styles.stage, { backgroundColor: theme.colors.border }]}>
        <View style={[styles.popup, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.popupHead, { borderBottomColor: theme.colors.border }]}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text }}>{p.scenario.popup}</Text>
            <Text style={{ fontSize: 18, color: theme.colors.textSecondary }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              ×
            </Text>
          </View>
          <View style={{ padding: 16, gap: 14 }}>
            <View style={styles.fields}>
              {p.fields.map(([k, v]) => (
                <View key={k} style={styles.field}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary }}>{k}</Text>
                  <View style={[styles.fieldBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                    <Text style={{ fontSize: 12.5, color: theme.colors.text }}>{v}</Text>
                  </View>
                </View>
              ))}
            </View>
            {p.offline ? (
              <RestrictionNotice restriction={CONNECTION_REQUIRED_NOTICE} />
            ) : p.restriction ? (
              <RestrictionNotice restriction={p.restriction} />
            ) : (
              <View style={[styles.none, { borderColor: theme.colors.border }]}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                  Nothing is shown: this rule is switched off, or does not fire at the saved thresholds.
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.popupFoot, { borderTopColor: theme.colors.border }]}>
            <View style={[styles.btn, { borderWidth: 1, borderColor: theme.colors.border }]}>
              <Text style={{ fontWeight: '600', color: theme.colors.textSecondary }}>{p.submitDisabled ? 'Close' : 'Cancel'}</Text>
            </View>
            <View style={[styles.btn, { backgroundColor: p.submitDisabled ? theme.colors.border : theme.colors.primary }]}>
              <Text
                style={{
                  fontWeight: '600',
                  color: p.submitDisabled ? theme.colors.textSecondary : theme.colors.primaryText,
                  textDecorationLine: p.submitDisabled ? 'line-through' : 'none',
                }}>
                {p.scenario.submit}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        Sample branch names, numbers and figures. The wording and thresholds are the saved rules; the notice is the one the popup renders.
      </Text>

      <Card style={{ gap: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary }}>{p.endpointLabel}</Text>
        <Text selectable style={[{ fontSize: 11.5, lineHeight: 18, color: theme.colors.text }, MONO]}>
          {p.json}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  pick: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 2, maxWidth: 220 },
  stage: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 20 },
  popup: { borderRadius: 14, overflow: 'hidden' },
  popupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  fields: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 4 },
  fieldBox: { minHeight: 32, justifyContent: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  none: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 16 },
  popupFoot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  btn: { height: 36, borderRadius: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
