import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, Icon } from '@/shared/ui';

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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          height: 52,
          paddingHorizontal: 14,
          borderRadius: theme.radii.lg,
          backgroundColor: theme.colors.cardFill,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
        }}>
        {exporting ? <ActivityIndicator color={theme.colors.text} /> : <Icon name="file-spreadsheet" size={18} color={theme.colors.text} />}
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{exporting ? 'Exporting…' : 'Export CSV'}</Text>
      </Pressable>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: theme.spacing.md }]}>
        PDF and Excel aren't available on mobile yet — this app has no file-saving module for a binary download. CSV opens in any app
        that accepts a share, including most spreadsheet apps.
      </Text>
    </FormBottomSheet>
  );
});
