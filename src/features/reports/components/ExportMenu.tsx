import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, Icon, ListThumb } from '@/shared/ui';

export interface ExportMenuProps {
  onExportCsv: () => void;
  exporting: boolean;
  onRequestClose: () => void;
}

/**
 * The web's PDF/Excel/CSV export all hit a real server-generated-file
 * endpoint (`GET /api/reports/export`, pdfkit/exceljs/CSV). Mobile has no
 * file-system/share-sheet module to save a binary PDF or XLSX, so only CSV
 * (shared as text) is offered here — same constraint as every other export
 * in this app, not a gap specific to Reports. "Print" on the web is a plain
 * `window.print()` of the DOM, which has no mobile equivalent; omitted
 * rather than faked.
 */
export const ExportMenu = forwardRef<BottomSheetModal, ExportMenuProps>(({ onExportCsv, exporting, onRequestClose }, ref) => {
  const theme = useAppTheme();

  return (
    <FormBottomSheet ref={ref} title="Export Report" onRequestClose={onRequestClose} snapPoints={['38%']}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Export CSV"
        disabled={exporting}
        onPress={onExportCsv}
        style={[
          styles.row,
          { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, opacity: exporting ? 0.7 : 1 },
          theme.isDark ? null : styles.lift,
        ]}>
        <ListThumb icon="file-spreadsheet" index={2} />
        <View style={styles.grow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{exporting ? 'Exporting…' : 'Export CSV'}</Text>
          <Text style={[styles.xs, { color: theme.colors.textSecondary }]}>Share the period's figures as text</Text>
        </View>
        {exporting ? <ActivityIndicator color={theme.colors.text} /> : <Icon name="chevron-right" size={18} color={theme.colors.textFaint} />}
      </Pressable>
      <Text style={[styles.help, { color: theme.colors.textFaint }]}>
        PDF and Excel aren't available on mobile yet — this app has no file-saving module for a binary download. CSV opens in any app
        that accepts a share, including most spreadsheet apps.
      </Text>
    </FormBottomSheet>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22, borderWidth: 1 },
  lift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  help: { fontSize: 12, lineHeight: 17, marginTop: 14 },
});
