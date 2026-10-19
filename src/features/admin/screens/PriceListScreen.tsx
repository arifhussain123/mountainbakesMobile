import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { exportPriceListCsv } from '@/api';
import { openDrawer } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, Screen, SecondaryButton } from '@/shared/ui';

type ExportKind = 'list' | 'category';

/**
 * Web `/price-list`: not a product list but three cards — export the current
 * price list, export it grouped by category, and import. Mobile exports the
 * CSV into the share sheet (no binary file-share here, so no Excel); import
 * stays on the web for now.
 */
export function PriceListScreen() {
  const theme = useAppTheme();
  const [exporting, setExporting] = useState<ExportKind | null>(null);

  async function exportCsv(kind: ExportKind) {
    setExporting(kind);
    try {
      const csv = await exportPriceListCsv(kind === 'category');
      await Share.share({ title: kind === 'category' ? 'Products by Category' : 'Price List', message: csv });
    } catch (e) {
      Alert.alert('Could Not Export', mapErrorToMessage(e));
    } finally {
      setExporting(null);
    }
  }

  const muted = [theme.typography.bodySmall, { color: theme.colors.textSecondary }];
  const strong = { color: theme.colors.text, fontWeight: '600' as const };

  return (
    <Screen>
      <AppHeader title="Price List" actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 12 }}>
        <Card style={styles.card}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Export Price List</Text>
          <Text style={muted}>Download the current price list — edit it and re-import to bulk-update.</Text>
          <SecondaryButton label="Export CSV" onPress={() => void exportCsv('list')} loading={exporting === 'list'} disabled={exporting !== null} />
        </Card>

        <Card style={styles.card}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Export by Category</Text>
          <Text style={muted}>Same columns, grouped and sorted by category — still a valid re-import template.</Text>
          <SecondaryButton label="Export CSV" onPress={() => void exportCsv('category')} loading={exporting === 'category'} disabled={exporting !== null} />
        </Card>

        <Card style={styles.card}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Import Price List</Text>
          <Text style={muted}>
            Upload an Excel/CSV with <Text style={strong}>Product Code</Text> and <Text style={strong}>Current Price</Text> columns. You&apos;ll
            preview before saving.
          </Text>
          <View style={[styles.note, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
            <Text style={muted}>Importing is done on the web for now.</Text>
          </View>
        </Card>

        <Text style={[muted, { textAlign: 'center' }]}>Excel export is available on the web.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10 },
  note: { borderWidth: 1, padding: 10 },
});
