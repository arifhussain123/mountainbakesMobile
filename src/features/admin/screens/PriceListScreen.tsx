import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, PrimaryButton, Screen, SecondaryButton } from '@/shared/ui';
import { useAdminHeaderActions } from '../components/useAdminHeaderActions';
import { usePriceImport } from './PriceList/priceImportSheet';
import { useFileDownload } from '../components/ExportSheet';
import { priceListExportRequest } from '../utils/exports';

/**
 * Web `/price-list`: not a product list but three cards — export the current
 * price list, export it grouped by category, and import. Each Export button
 * downloads the server's own Excel / CSV file (`/products/price/list/export`,
 * the web's file name) and opens the share sheet on it. Import
 * is the web's: pick an Excel/CSV, review the server's preview, apply
 * (`./PriceList/priceImportSheet`).
 */
export function PriceListScreen() {
  const headerActions = useAdminHeaderActions();
  const theme = useAppTheme();
  const download = useFileDownload();
  const priceImport = usePriceImport();

  /** One of the four Export buttons; the others wait while it prepares, as on the web. */
  const exportButton = (format: 'excel' | 'csv', byCategory: boolean) => {
    const key = `${byCategory ? 'category' : 'list'}-${format}`;
    return (
      <SecondaryButton
        label={format === 'excel' ? 'Export Excel' : 'Export CSV'}
        onPress={() => void download.run(key, priceListExportRequest(format, byCategory))}
        loading={download.busy === key}
        disabled={download.busy !== null}
      />
    );
  };

  const muted = [theme.typography.bodySmall, { color: theme.colors.textSecondary }];
  const strong = { color: theme.colors.text, fontWeight: '600' as const };

  return (
    <Screen>
      <AppHeader title="Price List" actions={headerActions} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 12 }}>
        <Card style={styles.card}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Export Price List</Text>
          <Text style={muted}>Download the current price list — edit it and re-import to bulk-update.</Text>
          <View style={styles.pair}>
            <View style={{ flex: 1 }}>{exportButton('excel', false)}</View>
            <View style={{ flex: 1 }}>{exportButton('csv', false)}</View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Export by Category</Text>
          <Text style={muted}>Same columns, grouped and sorted by category — still a valid re-import template.</Text>
          <View style={styles.pair}>
            <View style={{ flex: 1 }}>{exportButton('excel', true)}</View>
            <View style={{ flex: 1 }}>{exportButton('csv', true)}</View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Import Price List</Text>
          <Text style={muted}>
            Upload an Excel/CSV with <Text style={strong}>Product Code</Text> and <Text style={strong}>Current Price</Text> columns. You&apos;ll
            preview before saving.
          </Text>
          <PrimaryButton label="Import Price List" onPress={priceImport.start} loading={priceImport.uploading} />
        </Card>
      </ScrollView>
      {priceImport.element}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10 },
  pair: { flexDirection: 'row', gap: 10 },
});
