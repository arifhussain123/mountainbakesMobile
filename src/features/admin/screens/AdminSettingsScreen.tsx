import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppSettings, type AppSettings } from '@/api';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';

type Row = [label: string, value: string];

function onOff(v: boolean | undefined): string {
  return v === undefined ? '—' : v ? 'On' : 'Off';
}

function sections(s: AppSettings): { title: string; rows: Row[] }[] {
  return [
    {
      title: 'Company',
      rows: [
        ['Company name', s.companyName || '—'],
        ['Currency', s.currency || '—'],
        ['GST', s.gstEnabled ? `On · ${s.gstRate}%` : 'Off'],
        ['Receipt footer', s.receiptFooter || '—'],
      ],
    },
    {
      title: 'Business hours',
      rows: [
        ['Business opens', s.businessStartTime || '—'],
        ['Business closes', s.businessClosingTime || '—'],
        ['Day rolls over', '02:00 (fixed)'],
        ['Demand window', s.orderStartTime && s.orderEndTime ? `${s.orderStartTime} – ${s.orderEndTime}` : '—'],
        ['Auto close business', onOff(s.autoCloseBusiness)],
        ['Auto stock closing', onOff(s.autoStockClosing)],
      ],
    },
    {
      title: 'Notifications',
      rows: [
        ['Closing summaries', onOff(s.closingNotificationsEnabled)],
        ['Order confirmations', onOff(s.orderConfirmationsEnabled)],
        ['Special event reminders', onOff(s.eventNotificationsEnabled)],
      ],
    },
    {
      title: 'Location',
      rows: [
        ['Geofencing', onOff(s.geofencingEnabled)],
        ['Default radius', s.geofenceDefaultRadiusKm === undefined ? '—' : `${s.geofenceDefaultRadiusKm} km`],
        ['Check every', s.geofenceVerifyIntervalMin === undefined ? '—' : `${s.geofenceVerifyIntervalMin} min`],
      ],
    },
  ];
}

/** The global settings row (`GET /api/settings`), shown read-only. Changes are made on the web. */
export function AdminSettingsScreen() {
  const theme = useAppTheme();
  const q = useAppSettings();

  return (
    <Screen>
      <AppHeader title="Settings" subtitle="System settings. Read-only — change them on the web." actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: 12, paddingBottom: theme.spacing.xl * 3 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={theme.colors.primary} />}>
        {q.isLoading ? <LoadingSkeleton height={240} /> : null}
        {q.error ? <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
        {q.data
          ? sections(q.data).map((section) => (
              <Card key={section.title}>
                <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginBottom: 6 }]} accessibilityRole="header">
                  {section.title}
                </Text>
                {section.rows.map(([label, value]) => (
                  <View key={label} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, flex: 1 }]}>{label}</Text>
                    <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
                  </View>
                ))}
              </Card>
            ))
          : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
});
