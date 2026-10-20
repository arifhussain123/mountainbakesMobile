import { useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCreateAdminBranch, useUpdateAdminBranch, useUpsertBranchLocation, type AdminBranch, type BranchLocationRow } from '@/api';
import { getCurrentGeoPosition } from '@/api/geo';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, FormBottomSheet, PrimaryButton, SecondaryButton, TextField, type DropdownOption } from '@/shared/ui';
import { BranchMapPicker, isMapsConfigured, type BranchMapPickerHandle } from '../../components/BranchMapPicker';
import { MAP_ZOOM } from '../../utils/branchMap';
import {
  BRANCH_BUDGET_FIELDS,
  BRANCH_TEXT_FIELDS,
  RADIUS_PRESETS,
  branchFormFromBranch,
  branchPayload,
  canSaveLocation,
  emptyBranchForm,
  formShareSplit,
  formatCoordinate,
  initialLocationForm,
  locationPayload,
  locationSummary,
  radiusPresetValue,
  sanitizeRadius,
  type BranchFormErrors,
  type BranchFormValues,
} from '../../utils/branchActions';

/** Latitude / longitude can be negative: iOS's decimal pad has no minus key, Android's `numeric` is signed. */
const COORDINATE_KEYBOARD = Platform.select({ ios: 'numbers-and-punctuation', default: 'numeric' } as const);

const RADIUS_OPTIONS: DropdownOption[] = [
  ...RADIUS_PRESETS.map((km) => ({ value: String(km), label: `${km} KM` })),
  { value: 'custom', label: 'Custom…' },
];

function Buttons({ busy, label, disabled, onCancel, onSave }: { busy: boolean; label: string; disabled?: boolean; onCancel: () => void; onSave: () => void }) {
  return (
    <View style={styles.buttons}>
      <View style={{ flex: 1 }}>
        <SecondaryButton label="Cancel" onPress={onCancel} disabled={busy} />
      </View>
      <View style={{ flex: 1.4 }}>
        <PrimaryButton label={label} onPress={onSave} loading={busy} disabled={disabled} />
      </View>
    </View>
  );
}

/**
 * Web `BranchesPage` dialog: the five text fields, the three budgets, and the
 * company share as ONE number — blank follows the global split in Finance
 * Settings, and the branch share is always 100 − company, shown read-only.
 */
function BranchForm({ branch, defaultCompanyPct, onClose }: { branch: AdminBranch | null; defaultCompanyPct: number; onClose: () => void }) {
  const theme = useAppTheme();
  const create = useCreateAdminBranch();
  const update = useUpdateAdminBranch();
  const [values, setValues] = useState<BranchFormValues>(() => (branch ? branchFormFromBranch(branch) : emptyBranchForm()));
  const [errors, setErrors] = useState<BranchFormErrors>({});
  const split = formShareSplit(values.companySharePct, defaultCompanyPct);
  const busy = create.isPending || update.isPending;

  const set = (field: keyof BranchFormValues) => (text: string) => setValues((p) => ({ ...p, [field]: text }));

  const save = () => {
    const built = branchPayload(values);
    if ('fieldErrors' in built) {
      setErrors(built.fieldErrors);
      Alert.alert('Check the Branch', Object.values(built.fieldErrors)[0] ?? '');
      return;
    }
    setErrors({});
    if ('error' in built) {
      Alert.alert('Check the Company Share', built.error);
      return;
    }
    const onError = (e: unknown) => Alert.alert('Could Not Save the Branch', mapErrorToMessage(e));
    if (branch) {
      update.mutate(
        { id: branch.id, input: built.input },
        {
          onSuccess: () => {
            Alert.alert('Saved', 'Branch updated');
            onClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(built.input, {
        onSuccess: () => {
          Alert.alert('Saved', 'Branch added');
          onClose();
        },
        onError,
      });
    }
  };

  const strong = { color: theme.colors.text, fontWeight: '700' as const };

  return (
    <View>
      {BRANCH_TEXT_FIELDS.map(({ field, label, placeholder }) => (
        <TextField
          key={field}
          label={label}
          value={values[field]}
          onChangeText={set(field)}
          placeholder={placeholder}
          error={errors[field]}
          keyboardType={field === 'phone' ? 'phone-pad' : 'default'}
          autoCapitalize={field === 'city' || field === 'name' ? 'words' : 'sentences'}
        />
      ))}
      <View style={styles.row}>
        {BRANCH_BUDGET_FIELDS.map(({ field, label }) => (
          <View key={field} style={{ flex: 1 }}>
            <TextField label={label} value={values[field]} onChangeText={set(field)} placeholder="0" keyboardType="decimal-pad" error={errors[field]} />
          </View>
        ))}
      </View>

      <View style={[styles.shareBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>Company share</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
          How this branch's daily collection is split when Finance approves it. Leave blank to follow the global split in Finance Settings.
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Company %"
              value={values.companySharePct}
              onChangeText={set('companySharePct')}
              placeholder={`${defaultCompanyPct} (default)`}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            {/* Derived, never typed — always 100 minus the company share. */}
            <TextField label="Branch %" value={String(split.branchSharePct)} editable={false} />
          </View>
        </View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>
          {split.isOverride ? (
            <>
              This branch keeps <Text style={strong}>{split.branchSharePct}%</Text> and the company takes{' '}
              <Text style={strong}>{split.companySharePct}%</Text>. Already-approved days keep the split they were approved under.
            </>
          ) : (
            <>
              Following the global split —{' '}
              <Text style={strong}>
                {split.companySharePct}% company / {split.branchSharePct}% branch
              </Text>
              . This branch will move if that setting changes.
            </>
          )}
        </Text>
      </View>

      <Buttons busy={busy} label={branch ? 'Update Branch' : 'Add Branch'} onCancel={onClose} onSave={save} />
    </View>
  );
}

/**
 * Web `LocationPickerDialog`: the Places search and the map (draggable pin,
 * tap-to-move, the shaded radius circle — `BranchMapPicker`) write into the same
 * latitude / longitude / address / radius boxes the admin can also type, plus
 * "Use my current location" for configuring a branch while standing in it.
 * Without a Google Maps key the map and search are left out (the web's no-key
 * mode) and the typed boxes work alone. A picked place sets a new Google place
 * id; otherwise the stored one is kept as is.
 */
function LocationForm({ row, onClose }: { row: BranchLocationRow; onClose: () => void }) {
  const theme = useAppTheme();
  const upsert = useUpsertBranchLocation();
  const [values, setValues] = useState(() => initialLocationForm(row));
  const [locating, setLocating] = useState(false);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const map = useRef<BranchMapPickerHandle>(null);

  const fillFromDevice = () => {
    setLocating(true);
    void getCurrentGeoPosition().then((pos) => {
      setLocating(false);
      if (!pos) {
        Alert.alert('Could Not Read Your Location', 'Could not read your location. Check the app’s location permission.');
        return;
      }
      setValues((p) => ({ ...p, latitude: formatCoordinate(pos.latitude), longitude: formatCoordinate(pos.longitude) }));
      map.current?.focus({ latitude: pos.latitude, longitude: pos.longitude }, MAP_ZOOM.myLocation);
      setAccuracyM(pos.accuracyM);
      Alert.alert('Location Found', 'Coordinates set to your current location.');
    });
  };

  const save = () => {
    const input = locationPayload(values);
    if (!input) return;
    upsert.mutate(
      { branchId: row.branchId, input },
      {
        onSuccess: () => {
          Alert.alert('Saved', `Location saved for ${row.branchName || 'branch'}`);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Save the Location', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        {isMapsConfigured()
          ? 'Search for the branch, tap the map, or drag the pin. The shaded circle is the area sales will be allowed from.'
          : "Enter the branch's coordinates, or stand in the branch and use your current location. The radius is the area sales will be allowed from."}
      </Text>
      <BranchMapPicker
        ref={map}
        row={row}
        latitude={values.latitude}
        longitude={values.longitude}
        radiusKm={values.radiusKm}
        onPinMoved={(pt) => setValues((p) => ({ ...p, latitude: formatCoordinate(pt.latitude), longitude: formatCoordinate(pt.longitude) }))}
        onPlacePicked={(place) =>
          setValues((p) => ({
            ...p,
            latitude: formatCoordinate(place.latitude),
            longitude: formatCoordinate(place.longitude),
            address: place.address,
            googlePlaceId: place.placeId,
          }))
        }
      />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Latitude"
            value={values.latitude}
            onChangeText={(t) => setValues((p) => ({ ...p, latitude: t }))}
            placeholder="24.8607000"
            keyboardType={COORDINATE_KEYBOARD}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Longitude"
            value={values.longitude}
            onChangeText={(t) => setValues((p) => ({ ...p, longitude: t }))}
            placeholder="67.0011000"
            keyboardType={COORDINATE_KEYBOARD}
          />
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <SecondaryButton label={locating ? 'Reading your location…' : 'Use my current location'} onPress={fillFromDevice} loading={locating} />
        {accuracyM != null && Number.isFinite(accuracyM) ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            Accurate to about {Math.round(accuracyM)} m.
          </Text>
        ) : null}
      </View>
      <TextField
        label="Address"
        value={values.address}
        onChangeText={(t) => setValues((p) => ({ ...p, address: t }))}
        placeholder="Formatted address for this branch"
      />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>ALLOWED RADIUS</Text>
      <Dropdown
        options={RADIUS_OPTIONS}
        value={radiusPresetValue(values.radiusKm)}
        onChange={(v) => {
          if (v !== 'custom') setValues((p) => ({ ...p, radiusKm: v }));
        }}
        placeholder="Choose a radius"
      />
      <TextField
        label="Radius (KM)"
        value={values.radiusKm}
        onChangeText={(t) => setValues((p) => ({ ...p, radiusKm: sanitizeRadius(t) }))}
        keyboardType="decimal-pad"
      />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 10 }]}>{locationSummary(values)}</Text>
      <Buttons busy={upsert.isPending} label="Save Location" disabled={!canSaveLocation(values)} onCancel={onClose} onSave={save} />
    </View>
  );
}

/**
 * Add / Edit Branch in one bottom sheet. `open(branch | null)` presents it; the
 * form is mounted only while open, so each opening starts clean.
 */
export function useBranchSheet(defaultCompanyPct: number) {
  const ref = useRef<BottomSheetModal>(null);
  const [sheet, setSheet] = useState<{ branch: AdminBranch | null } | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (branch: AdminBranch | null) => {
    setSheet({ branch });
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet
      ref={ref}
      title={sheet?.branch ? 'Edit Branch' : 'Add Branch'}
      subtitle={sheet?.branch?.name}
      onRequestClose={close}
      onDismiss={() => setSheet(null)}>
      {sheet ? <BranchForm branch={sheet.branch} defaultCompanyPct={defaultCompanyPct} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

/** Set Location / Edit for one branch's geofence, in one bottom sheet. */
export function useLocationSheet() {
  const ref = useRef<BottomSheetModal>(null);
  const [row, setRow] = useState<BranchLocationRow | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (next: BranchLocationRow) => {
    setRow(next);
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet
      ref={ref}
      title={`Set Location — ${row?.branchName ?? 'Branch'}`}
      onRequestClose={close}
      onDismiss={() => setRow(null)}>
      {row ? <LocationForm row={row} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  shareBox: { borderWidth: 1, padding: 12, marginTop: 14 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
