import { useCallback, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { exportDataAllCsv, exportDataPagesCsv } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, Icon, type IconName } from '@/shared/ui';
import { EXCEL_ON_WEB, canExport, exportAllLabel, exportFileTitle, mergeCsvPages } from '../utils/exports';
import { ActionChip } from './ActionChip';

/**
 * Every Export / Print on the Super Admin pages, the phone way: the web's
 * menu items as rows in one small sheet. A row's `run` builds the text (CSV
 * from the server, or a plain-text document) and hands it to the Share sheet,
 * which Android can route to a print service, Drive, mail… Items the phone
 * cannot make (Excel, PDF — binary files) stay listed, disabled, saying why.
 */

export interface ExportOption {
  key: string;
  label: string;
  /** Rows group under these headings, in the order they first appear ("Excel", "CSV", "Print"). */
  section?: string;
  icon?: IconName;
  /** A second line — what the row produces, or why it is unavailable. */
  hint?: string;
  disabled?: boolean;
  /** Title of the alert when `run` fails. */
  errorTitle?: string;
  run?: () => Promise<unknown>;
}

export interface ExportSheetSpec {
  title: string;
  subtitle?: string;
  options: ExportOption[];
}

/** Hands a document to the Share sheet. `title` is the file name / subject the receiving app shows. */
export async function shareText(title: string, message: string): Promise<void> {
  await Share.share({ title, message });
}

function OptionRow({ option, busy, onPress }: { option: ExportOption; busy: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  const off = !!option.disabled || !option.run;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.hint ? `${option.label}. ${option.hint}` : option.label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
      ]}>
      {busy ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Icon name={option.icon ?? 'file-spreadsheet'} size={16} color={theme.colors.text} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>{option.label}</Text>
        {option.hint ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{option.hint}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * `{ open, element }` around one `FormBottomSheet` — `open({ title, options })`
 * shows the menu; render `element` once in the screen. The pressed row spins
 * while its text is fetched / built; the sheet closes once it is shared.
 */
export function useExportSheet(): { open: (spec: ExportSheetSpec) => void; element: ReactElement; busy: boolean } {
  const theme = useAppTheme();
  const ref = useRef<BottomSheetModal>(null);
  const [spec, setSpec] = useState<ExportSheetSpec | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const open = useCallback((next: ExportSheetSpec) => {
    setSpec(next);
    ref.current?.present();
  }, []);
  const close = () => ref.current?.dismiss();

  const run = async (option: ExportOption) => {
    if (!option.run || busyKey) return;
    setBusyKey(option.key);
    try {
      await option.run();
      close();
    } catch (e) {
      Alert.alert(option.errorTitle ?? 'Could Not Export', mapErrorToMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  const sections: { title: string | undefined; options: ExportOption[] }[] = [];
  for (const o of spec?.options ?? []) {
    const last = sections[sections.length - 1];
    if (last && last.title === o.section) last.options.push(o);
    else sections.push({ title: o.section, options: [o] });
  }

  const element = (
    <FormBottomSheet
      ref={ref}
      title={spec?.title ?? 'Export'}
      subtitle={spec?.subtitle}
      onRequestClose={close}
      onDismiss={() => setBusyKey(null)}
      snapPoints={['60%']}>
      <View style={{ gap: theme.spacing.md }}>
        {sections.map((s, i) => (
          <View key={`${s.title ?? ''}-${i}`} style={{ gap: 8 }}>
            {s.title ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>{s.title.toUpperCase()}</Text> : null}
            {s.options.map((o) => (
              <OptionRow key={o.key} option={o} busy={busyKey === o.key} onPress={() => void run(o)} />
            ))}
          </View>
        ))}
      </View>
    </FormBottomSheet>
  );

  return { open, element, busy: busyKey !== null };
}

export interface DataTableExport {
  /** The Data Engine resource (`customers`, `products`, `users`, `productionOrders`). */
  resource: string;
  /** The web table's `exportFileName`. */
  fileName?: string;
  /** The list's own filters — see `customersExportParams` and siblings in `@/api`. */
  params: Record<string, string | number>;
  /** The list's page size and how many pages it has loaded. */
  pageSize: number;
  loadedPages: number;
  loadedRows: number;
  total: number | null | undefined;
}

/**
 * The web `ExportMenu`'s four items for a server-paged table. "Current page"
 * is what the phone has loaded (it scrolls rather than pages); "all" is the
 * whole filtered set, built and capped by the server.
 */
export function dataTableExportOptions(t: DataTableExport): ExportOption[] {
  const title = exportFileTitle(t.resource, t.fileName);
  const noRows = t.loadedRows === 0;
  const pageHint = noRows ? 'No rows on this screen' : `The ${t.loadedRows.toLocaleString('en-US')} rows loaded on this screen`;
  return [
    { key: 'excel-page', section: 'Excel', label: 'Export current page', hint: EXCEL_ON_WEB, disabled: true },
    { key: 'excel-all', section: 'Excel', label: exportAllLabel(t.total), hint: EXCEL_ON_WEB, disabled: true },
    {
      key: 'csv-page',
      section: 'CSV',
      label: 'Current page as CSV',
      hint: pageHint,
      disabled: noRows,
      run: async () => shareText(title, mergeCsvPages(await exportDataPagesCsv(t.resource, t.params, t.pageSize, t.loadedPages))),
    },
    {
      key: 'csv-all',
      section: 'CSV',
      label: 'All results as CSV',
      hint: t.total ? `${t.total.toLocaleString('en-US')} rows, every page` : undefined,
      run: async () => shareText(title, await exportDataAllCsv(t.resource, t.params)),
    },
  ];
}

/** The web disables the Export button when there is nothing to export. */
export const dataTableExportable = (t: Pick<DataTableExport, 'loadedRows' | 'total'>) => canExport(t.loadedRows, t.total);

/**
 * A table's single "Export" chip and the sheet it opens — `chip` goes beside
 * the page's other actions, `element` is rendered once in the screen.
 */
export function useDataTableExport(table: DataTableExport, sheetTitle: string): { chip: ReactElement; element: ReactElement } {
  const sheet = useExportSheet();
  const chip = (
    <ActionChip
      icon="file-spreadsheet"
      label="Export"
      onPress={() => sheet.open({ title: sheetTitle, options: dataTableExportOptions(table) })}
      disabled={!dataTableExportable(table)}
    />
  );
  return { chip, element: sheet.element };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 52 },
});
