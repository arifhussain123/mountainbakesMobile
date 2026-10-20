import { useState, type ReactNode } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View, type KeyboardTypeOptions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSettings, useUpdateAppSettings, type AppSettings } from '@/api';
import { openDrawer, Routes } from '@/navigation';
import type { SuperAdminSettingsStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, Icon, PrimaryButton, Screen, TextField } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { settingsFormFrom, settingsFormProblem, settingsPayload, type SettingsForm } from '../utils/adminSettingsActions';

/**
 * Settings — the web `/settings` page: the Restriction Rules card, then
 * Company, Finance & Tax, Business Hours and Geofencing with the web's own
 * labels and hints, edited in place and sent together by "Save Settings"
 * (`PUT /api/settings`, the whole loaded object as the web sends it). The
 * logo is shown but uploaded on the web — the phone has no logo picker. The
 * web's Appearance card is a per-device preference; the phone has its own
 * Appearance setting, so it is not repeated here.
 */
export function AdminSettingsScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SuperAdminSettingsStackParamList>>();
  const q = useAppSettings();
  const s = q.data;

  return (
    <Screen>
      <AppHeader title="Settings" actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing.lg, gap: 12, paddingBottom: theme.spacing.xl * 3 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={theme.colors.primary} />}>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate(Routes.SUPER_ADMIN_RESTRICTION_RULES)}>
          <Card style={styles.linkCard}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Restriction Rules</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                Limits on branch demands, sales, cash deposits, ledger back-entries and company share — with approvals, branch monitor and audit log.
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
          </Card>
        </Pressable>

        {q.isLoading ? <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Loading settings…</Text> : null}
        {q.error && !s ? <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
        {s ? <SettingsFormCards s={s} /> : null}
      </ScrollView>
    </Screen>
  );
}

function SettingsFormCards({ s }: { s: AppSettings }) {
  const theme = useAppTheme();
  const save = useUpdateAppSettings();
  // As the web's effect: whenever the loaded settings change (first load, a
  // refresh, the refetch after a save) the form takes them.
  const [syncedFrom, setSyncedFrom] = useState(s);
  const [form, setForm] = useState<SettingsForm>(() => settingsFormFrom(s));
  if (syncedFrom !== s) {
    setSyncedFrom(s);
    setForm(settingsFormFrom(s));
  }
  const set = <K extends keyof SettingsForm>(key: K) => (value: SettingsForm[K]) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = () => {
    const problem = settingsFormProblem(form);
    if (problem) {
      Alert.alert('Check the Settings', problem);
      return;
    }
    save.mutate(settingsPayload(s, form), {
      onSuccess: () => Alert.alert('Saved', 'Settings saved'),
      onError: (e) => Alert.alert('Could Not Save Settings', mapErrorToMessage(e)),
    });
  };

  return (
    <>
      <Section title="Company">
        <Field label="Company Name" value={form.companyName} onChange={set('companyName')} placeholder="Mountain Bakes" />
        <View style={{ gap: 6, marginTop: 12 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>Logo</Text>
          {s.logoUrl ? (
            <Image source={{ uri: s.logoUrl }} style={[styles.logo, { borderColor: theme.colors.border }]} resizeMode="contain" accessibilityLabel="Company logo" />
          ) : null}
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Upload a new logo from the web Settings page.</Text>
        </View>
        <Field label="Receipt Footer" value={form.receiptFooter} onChange={set('receiptFooter')} placeholder="Thank you for choosing Mountain Bakes!" />
      </Section>

      <Section title="Finance & Tax">
        <Field label="Currency" value={form.currency} onChange={set('currency')} />
        <Field label="Symbol" value={form.currencySymbol} onChange={set('currencySymbol')} />
        <Toggle label="Enable GST" hint="Apply GST to all orders" value={form.gstEnabled} onChange={set('gstEnabled')} />
        {form.gstEnabled ? <Field label="GST Rate (%)" value={form.gstRate} onChange={set('gstRate')} keyboardType="decimal-pad" /> : null}
      </Section>

      <Section title="Business Hours">
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 4 }]}>
          The bakery day runs 8:00 AM → 2:00 AM (next day). Production orders can be submitted only inside the order window, and the business day is archived
          automatically at 2:00 AM. Times are 24-hour, Asia/Karachi.
        </Text>
        <Field label="Business Start Time" value={form.businessStartTime} onChange={set('businessStartTime')} placeholder="HH:mm" keyboardType="numbers-and-punctuation" />
        <Field label="Business Closing Time" value={form.businessClosingTime} onChange={set('businessClosingTime')} placeholder="HH:mm" keyboardType="numbers-and-punctuation" />
        <Field label="Order Start Time" value={form.orderStartTime} onChange={set('orderStartTime')} placeholder="HH:mm" keyboardType="numbers-and-punctuation" />
        <Field label="Order End Time" value={form.orderEndTime} onChange={set('orderEndTime')} placeholder="HH:mm" keyboardType="numbers-and-punctuation" />
        <Toggle label="Auto Close Business Day" hint="Archive sales, expenses & production at 2:00 AM." value={form.autoCloseBusiness} onChange={set('autoCloseBusiness')} />
        <Toggle label="Auto Stock Closing" hint="Snapshot each branch's balance stock and carry it forward." value={form.autoStockClosing} onChange={set('autoStockClosing')} />
        <Toggle
          label="Closing Summary Notifications"
          hint="WhatsApp/SMS each branch, Production & Admin their summary after the 2:00 AM close. Manage numbers under Recipients."
          value={form.closingNotificationsEnabled}
          onChange={set('closingNotificationsEnabled')}
        />
        <Toggle
          label="Order Confirmation SMS"
          hint="Text the customer their order number and total when an order is placed. Sends only when a phone number is on the order."
          value={form.orderConfirmationsEnabled}
          onChange={set('orderConfirmationsEnabled')}
        />
        <Toggle
          label="Special Event Reminders"
          hint={'WhatsApp/SMS branches and Production ahead of each event. Governs the automatic daily send only — “Send due reminders now” on the Special Events screen always works.'}
          value={form.eventNotificationsEnabled}
          onChange={set('eventNotificationsEnabled')}
        />
      </Section>

      <Section title="Geofencing">
        <Toggle
          label="Restrict sales to the branch area"
          hint={
            "Branch users may only record sales, orders and stock returns while their device is inside their branch’s configured radius. Reports, past sales and the help desk stay available everywhere. A branch with no location set is unrestricted — see Admin → Branch Locations."
          }
          value={form.geofencingEnabled}
          onChange={set('geofencingEnabled')}
        />
        <Field
          label="Default Radius (KM)"
          hint="Applied to a branch that has no radius of its own."
          value={form.geofenceDefaultRadiusKm}
          onChange={set('geofenceDefaultRadiusKm')}
          keyboardType="decimal-pad"
        />
        <Field
          label="Verification Interval (minutes)"
          hint="How often an open session re-checks its position."
          value={form.geofenceVerifyIntervalMin}
          onChange={set('geofenceVerifyIntervalMin')}
          keyboardType="number-pad"
        />
        <Field
          label="GPS Timeout (seconds)"
          hint="How long to wait for the device to produce a fix."
          value={form.geofenceGpsTimeoutSec}
          onChange={set('geofenceGpsTimeoutSec')}
          keyboardType="number-pad"
        />
        <Field
          label="Maximum Position Age (seconds)"
          hint="Oldest reading the server will accept. Keep it comfortably above the verification interval."
          value={form.geofenceMaxPositionAgeSec}
          onChange={set('geofenceMaxPositionAgeSec')}
          keyboardType="number-pad"
        />
        <Toggle
          label="Require high-accuracy GPS"
          hint="Refuse a reading too imprecise to place the device on one side of the boundary, rather than falling back to its centre point. Only affects genuinely borderline readings — a clearly-inside or clearly-outside fix is decided either way. Turn off if staff work indoors where only wifi positioning is available."
          value={form.geofenceRequireHighAccuracy}
          onChange={set('geofenceRequireHighAccuracy')}
        />
      </Section>

      <PrimaryButton label={save.isPending ? 'Saving…' : 'Save Settings'} onPress={handleSave} loading={save.isPending} />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <Card>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginBottom: 6 }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Card>
  );
}

/** One text setting: the web's label over the input, its hint under it. */
function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ marginTop: 12 }}>
      <TextField label={label} value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboardType} autoCorrect={false} />
      {hint ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

/** One on/off setting: label and hint on the left, its switch on the right. */
function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{label}</Text>
        {hint ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  logo: { width: 56, height: 56, borderRadius: 8, borderWidth: 1 },
});
