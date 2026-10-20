import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCommitPriceImport, usePreviewPriceImport, type ImportPreviewResult } from '@/api';
import { pickSpreadsheet, type PickedFile } from '@/shared/files';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { DateField, FormBottomSheet, Icon, PrimaryButton, SecondaryButton, TextField, type IconName } from '@/shared/ui';
import {
  applyChangesLabel,
  canApplyImport,
  importCommitPayload,
  importFileProblem,
  importReviewSections,
  importSuccessMessage,
  importSummaryStats,
  type ImportReviewSection,
  type ImportStatTone,
} from '../../utils/priceImport';
import { karachiCalendarDate } from '../../utils/productsActions';

const STAT_ICON: Record<ImportStatTone, IconName> = { success: 'check', muted: 'minus', danger: 'warning' };
const SECTION_TONE: Record<ImportReviewSection['key'], ImportStatTone> = { valid: 'success', errors: 'danger', unchanged: 'muted' };

function useToneColor() {
  const theme = useAppTheme();
  return (tone: ImportStatTone) => (tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : theme.colors.textSecondary);
}

/** Web `SummaryStat` ×3: Will update / Unchanged / Errors. */
function SummaryStats({ preview }: { preview: ImportPreviewResult }) {
  const theme = useAppTheme();
  const toneColor = useToneColor();
  return (
    <View style={styles.stats}>
      {importSummaryStats(preview).map((s) => (
        <View key={s.key} style={[styles.stat, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
          <Icon name={STAT_ICON[s.tone]} size={18} color={toneColor(s.tone)} />
          <Text style={[theme.typography.kpi, { color: toneColor(s.tone), marginTop: 2 }]}>{s.value}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Web `PreviewSection` + `MiniTable`: the table's cells as one line per row. */
function ReviewSection({ section }: { section: ImportReviewSection }) {
  const theme = useAppTheme();
  const toneColor = useToneColor();
  const tone = SECTION_TONE[section.key];
  const isError = section.key === 'errors';
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={[theme.typography.label, styles.sectionTitle, { color: theme.colors.textSecondary }]}>{section.title.toUpperCase()}</Text>
      <View style={[styles.rows, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        {section.rows.map((r, i) => (
          <View
            key={r.key}
            style={[styles.row, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border } : null]}>
            <View style={{ paddingTop: 2 }}>
              <Icon name={STAT_ICON[tone]} size={14} color={toneColor(tone)} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={isError ? undefined : 2}>
                    {r.subtitle}
                  </Text>
                </View>
                {isError ? null : (
                  <Text style={[theme.typography.bodySmall, { color: tone === 'success' ? theme.colors.text : theme.colors.textSecondary, fontWeight: '600' }]}>
                    {r.value}
                  </Text>
                )}
              </View>
              {isError ? <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: 2 }]}>{r.value}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Web "Review Price Import" dialog body. Mounted per preview, so the
 * effective date starts at Karachi today and the reason empty for every file.
 */
function ReviewForm({
  preview,
  committing,
  onCancel,
  onApply,
}: {
  preview: ImportPreviewResult;
  committing: boolean;
  onCancel: () => void;
  onApply: (effectiveDate: string, reason: string) => void;
}) {
  const theme = useAppTheme();
  const [effectiveDate, setEffectiveDate] = useState(() => karachiCalendarDate());
  const [reason, setReason] = useState('');
  const validCount = preview.validRows.length;

  return (
    <View>
      <SummaryStats preview={preview} />
      {importReviewSections(preview).map((s) => (
        <ReviewSection key={s.key} section={s} />
      ))}
      {validCount > 0 ? (
        <View style={{ marginTop: 18 }}>
          <DateField label="Effective Date" value={effectiveDate} onChange={setEffectiveDate} />
          <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. Supplier price increase" multiline maxLength={500} />
        </View>
      ) : (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 18 }]}>No valid price changes to apply in this file.</Text>
      )}
      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onCancel} disabled={committing} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton
            label={applyChangesLabel(validCount)}
            onPress={() => onApply(effectiveDate, reason)}
            loading={committing}
            disabled={!canApplyImport(preview, committing)}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Web `PriceListPage` import: pick an Excel/CSV → the server's preview (never
 * writes) → review sheet → Apply commits only the valid rows. Returns the
 * button's `start` and busy flag, and the sheet `element` to render once.
 * The mutations live here, not in the sheet, so a save that finishes after
 * the sheet was swiped away still reports back.
 */
export function usePriceImport() {
  const ref = useRef<BottomSheetModal>(null);
  const previewImport = usePreviewPriceImport();
  const commitImport = useCommitPriceImport();
  const [picking, setPicking] = useState(false);
  const [review, setReview] = useState<{ fileName: string; preview: ImportPreviewResult } | null>(null);

  // The web's dialog cannot be closed while it is saving.
  const close = () => {
    if (!commitImport.isPending) ref.current?.dismiss();
  };

  const start = async () => {
    setPicking(true);
    let picked: PickedFile | null;
    try {
      picked = await pickSpreadsheet();
    } catch (e) {
      Alert.alert('Could Not Open the File', mapErrorToMessage(e));
      return;
    } finally {
      setPicking(false);
    }
    if (!picked) return; // backed out of the picker
    const file = picked;
    const problem = importFileProblem(file);
    if (problem) {
      Alert.alert('Could Not Read the File', problem);
      return;
    }
    previewImport.mutate(
      { uri: file.uri, name: file.name, type: file.type },
      {
        onSuccess: (preview) => {
          setReview({ fileName: file.name, preview });
          ref.current?.present();
        },
        onError: (e) => Alert.alert('Could Not Read the File', mapErrorToMessage(e)),
      },
    );
  };

  const apply = (effectiveDate: string, reason: string) => {
    const built = importCommitPayload(review?.preview ?? null, effectiveDate, reason);
    if (!built) return;
    if ('error' in built) {
      Alert.alert('Check the Price Import', built.error);
      return;
    }
    commitImport.mutate(built.input, {
      onSuccess: (res) => {
        Alert.alert('Prices Imported', importSuccessMessage(res));
        ref.current?.dismiss();
      },
      onError: (e) => Alert.alert('Could Not Import Prices', mapErrorToMessage(e)),
    });
  };

  const element = (
    <FormBottomSheet ref={ref} title="Review Price Import" subtitle={review?.fileName} onRequestClose={close} onDismiss={() => setReview(null)}>
      {review ? <ReviewForm preview={review.preview} committing={commitImport.isPending} onCancel={close} onApply={apply} /> : null}
    </FormBottomSheet>
  );

  return { start: () => void start(), uploading: picking || previewImport.isPending, element };
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderWidth: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 },
  sectionTitle: { fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  rows: { borderWidth: 1 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 9 },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
