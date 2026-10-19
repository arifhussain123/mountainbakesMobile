import type { ReactNode } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSettings, type AppSettings } from '@/api';
import { openDrawer, Routes } from '@/navigation';
import type { SuperAdminSettingsStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, Icon, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { ReadOnlySwitch } from '../components/AdminDetail';

/**
 * Settings — the web `/settings` page, read side: the Restriction Rules card,
 * then Company, Finance & Tax, Business Hours and Geofencing with the web's
 * own labels and hints, each showing the saved value (`GET /api/settings`).
 * Editing, the logo upload and "Save Settings" are web actions this phase.
 * The web's Appearance card is a per-device preference; the phone has its own
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
        {q.error ? <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
        {s ? <SettingsCards s={s} /> : null}
      </ScrollView>
    </Screen>
  );
}

function SettingsCards({ s }: { s: AppSettings }) {
  const theme = useAppTheme();
  const text = (v: string | number | undefined | null) => (v === undefined || v === null || v === '' ? '—' : String(v));
  return (
    <>
      <Section title="Company">
        <Row label="Company Name" value={text(s.companyName)} />
        <Row
          label="Logo"
          value={
            s.logoUrl ? (
              <Image source={{ uri: s.logoUrl }} style={[styles.logo, { borderColor: theme.colors.border }]} resizeMode="contain" accessibilityLabel="Company logo" />
            ) : (
              '—'
            )
          }
        />
        <Row label="Receipt Footer" value={text(s.receiptFooter)} />
      </Section>

      <Section title="Finance & Tax">
        <Row label="Currency" value={text(s.currency)} />
        <Row label="Symbol" value={text(s.currencySymbol)} />
        <Row label="Enable GST" hint="Apply GST to all orders" toggle={s.gstEnabled} />
        {s.gstEnabled ? <Row label="GST Rate (%)" value={text(s.gstRate)} /> : null}
      </Section>

      <Section title="Business Hours">
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 4 }]}>
          The bakery day runs 8:00 AM → 2:00 AM (next day). Production orders can be submitted only inside the order window, and the business day is archived
          automatically at 2:00 AM. Times are 24-hour, Asia/Karachi.
        </Text>
        <Row label="Business Start Time" value={text(s.businessStartTime)} />
        <Row label="Business Closing Time" value={text(s.businessClosingTime)} />
        <Row label="Order Start Time" value={text(s.orderStartTime)} />
        <Row label="Order End Time" value={text(s.orderEndTime)} />
        <Row label="Auto Close Business Day" hint="Archive sales, expenses & production at 2:00 AM." toggle={s.autoCloseBusiness ?? true} />
        <Row label="Auto Stock Closing" hint="Snapshot each branch's balance stock and carry it forward." toggle={s.autoStockClosing ?? true} />
        <Row
          label="Closing Summary Notifications"
          hint="WhatsApp/SMS each branch, Production & Admin their summary after the 2:00 AM close. Manage numbers under Recipients."
          toggle={s.closingNotificationsEnabled ?? false}
        />
        <Row
          label="Order Confirmation SMS"
          hint="Text the customer their order number and total when an order is placed. Sends only when a phone number is on the order."
          toggle={s.orderConfirmationsEnabled ?? false}
        />
        <Row
          label="Special Event Reminders"
          hint={'WhatsApp/SMS branches and Production ahead of each event. Governs the automatic daily send only — “Send due reminders now” on the Special Events screen always works.'}
          toggle={s.eventNotificationsEnabled ?? false}
        />
      </Section>

      <Section title="Geofencing">
        <Row
          label="Restrict sales to the branch area"
          hint={
            "Branch users may only record sales, orders and stock returns while their device is inside their branch’s configured radius. Reports, past sales and the help desk stay available everywhere. A branch with no location set is unrestricted — see Admin → Branch Locations."
          }
          toggle={s.geofencingEnabled ?? false}
        />
        <Row label="Default Radius (KM)" hint="Applied to a branch that has no radius of its own." value={text(s.geofenceDefaultRadiusKm ?? 50)} />
        <Row label="Verification Interval (minutes)" hint="How often an open session re-checks its position." value={text(s.geofenceVerifyIntervalMin ?? 5)} />
        <Row label="GPS Timeout (seconds)" hint="How long to wait for the device to produce a fix." value={text(s.geofenceGpsTimeoutSec ?? 20)} />
        <Row
          label="Maximum Position Age (seconds)"
          hint="Oldest reading the server will accept. Keep it comfortably above the verification interval."
          value={text(s.geofenceMaxPositionAgeSec ?? 300)}
        />
        <Row
          label="Require high-accuracy GPS"
          hint="Refuse a reading too imprecise to place the device on one side of the boundary, rather than falling back to its centre point. Only affects genuinely borderline readings — a clearly-inside or clearly-outside fix is decided either way. Turn off if staff work indoors where only wifi positioning is available."
          toggle={s.geofenceRequireHighAccuracy ?? true}
        />
      </Section>
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

/** One setting: label and optional hint on the left, the saved value (or an on/off switch) on the right. */
function Row({ label, hint, value, toggle }: { label: string; hint?: string; value?: ReactNode; toggle?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{label}</Text>
        {hint ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{hint}</Text> : null}
      </View>
      {toggle !== undefined ? (
        <ReadOnlySwitch value={toggle} label={label} />
      ) : typeof value === 'string' ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', flexShrink: 1, maxWidth: '50%', textAlign: 'right' }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  logo: { width: 56, height: 56, borderRadius: 8, borderWidth: 1 },
});
