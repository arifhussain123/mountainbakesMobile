import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export type OrderSortField = 'date' | 'requiredDate' | 'demandNumber' | 'status' | 'reason';
export type OrderSortDir = 'asc' | 'desc';

export interface OrderSort {
  field: OrderSortField;
  dir: OrderSortDir;
}

export interface SortSheetProps {
  visible: boolean;
  value: OrderSort;
  onChange: (value: OrderSort) => void;
  onClose: () => void;
}

const FIELDS: { field: OrderSortField; label: string }[] = [
  { field: 'date', label: 'Date' },
  { field: 'requiredDate', label: 'Required Date' },
  { field: 'demandNumber', label: 'Demand #' },
  { field: 'status', label: 'Status' },
  { field: 'reason', label: 'Reason' },
];

/** Date/Required Date/Demand #/Status/Reason, asc/desc — the mobile stand-in for the web table's sortable column headers. */
export function SortSheet({ visible, value, onChange, onClose }: SortSheetProps) {
  const theme = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}
          onPress={(e) => e.stopPropagation()}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Sort by</Text>
          {FIELDS.map((item) => {
            const active = value.field === item.field;
            return (
              <Pressable
                key={item.field}
                accessibilityRole="button"
                onPress={() => onChange({ field: item.field, dir: active && value.dir === 'desc' ? 'asc' : 'desc' })}
                style={[styles.row, { borderBottomColor: theme.colors.border }]}>
                <Text style={[theme.typography.body, { color: active ? theme.colors.primary : theme.colors.text, fontWeight: active ? '700' : '400' }]}>
                  {item.label}
                </Text>
                {active ? (
                  <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>
                    {value.dir === 'desc' ? 'Desc' : 'Asc'}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeRow}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { width: '100%', borderWidth: 1, padding: 20, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, borderBottomWidth: 1 },
  closeRow: { marginTop: 12, alignItems: 'center' },
});
