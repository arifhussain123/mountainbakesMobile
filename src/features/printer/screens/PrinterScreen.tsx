import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  MBButton,
  MBCard,
  MBEmptyState,
  MBHeader,
  MBListCard,
  MBListRow,
  MBSkeletonList,
} from '@/common/ui';
import {
  BLACK_COPPER_BC_89AC,
  PrintError,
  listPairedPrinters,
  printErrorMessage,
  printTestPage,
  printingSupported,
} from '@/common/printing';
import type { PairedPrinter } from '@/specs/NativeThermalPrinter';
import { useSettings } from '@/api/hooks/useCatalogApi';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import { usePrinterStore } from '@/state';

/**
 * Which receipt printer this handset prints to.
 *
 * ---------------------------------------------------------------------------
 * It lists devices, it does not discover them
 * ---------------------------------------------------------------------------
 * Pairing happens once, in Android's own Bluetooth settings, and this screen
 * reads the bonded set. That is a deliberate boundary rather than a missing
 * feature: scanning would cost `BLUETOOTH_SCAN` and, on older phones, a
 * location permission — a location prompt on a till app, to find a printer the
 * phone is already paired with. The caption below says where to pair, because a
 * list that is empty for that reason has to say so.
 *
 * ---------------------------------------------------------------------------
 * The test page is the point of the screen
 * ---------------------------------------------------------------------------
 * Choosing a name from a list proves nothing — the address is stored whether or
 * not anything is switched on at the other end, and the first time that is
 * discovered must not be a customer waiting at the counter. So the test page is
 * offered on the selected printer and on every row in the list, and it prints
 * a ruler that also proves the paper is the width the profile assumes. See
 * `common/printing/receipt.ts`.
 *
 * Nothing here is a server setting. `AppSettings` is read only for the shop's
 * name and receipt footer, so the test page looks like a real receipt; a
 * failure to load it is not worth blocking the screen over and the defaults
 * stand in.
 */
export function PrinterScreen(): React.ReactElement {
  const theme = useTheme();
  const settings = useSettings();

  const selectedAddress = usePrinterStore(s => s.address);
  const selectedName = usePrinterStore(s => s.name);
  const profile = usePrinterStore(s => s.profile);
  const select = usePrinterStore(s => s.select);
  const clear = usePrinterStore(s => s.clear);

  const [devices, setDevices] = useState<PairedPrinter[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** The address currently printing a test page, so the spinner is on its row. */
  const [testing, setTesting] = useState<string | null>(null);

  const supported = printingSupported();

  const load = useCallback(async () => {
    if (!supported) {
      setLoadError(printErrorMessage('unsupported'));
      setDevices([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setDevices(await listPairedPrinters());
    } catch (error) {
      // Shown in place rather than as an alert: every cause here is a state of
      // the phone the user has to go and change, so it has to stay on screen
      // while they do it.
      setLoadError(
        error instanceof PrintError ? printErrorMessage(error.code) : 'Could not read paired devices.',
      );
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  useEffect(() => {
    // No catch: `load` records every failure in `loadError` and resolves, so
    // there is nothing here that could reject.
    load();
  }, [load]);

  const onTest = useCallback(
    async (address: string) => {
      setTesting(address);
      try {
        await printTestPage(address, profile, {
          companyName: settings.data?.companyName,
          footer: settings.data?.receiptFooter,
        });
        Alert.alert('Test page sent', 'Check the printer. The ruler line must end at the edge of the roll.');
      } catch (error) {
        Alert.alert(
          'Not printed',
          error instanceof PrintError ? printErrorMessage(error.code) : 'The printer did not respond.',
        );
      } finally {
        setTesting(null);
      }
    },
    [profile, settings.data],
  );

  const onSelect = useCallback(
    (device: PairedPrinter) => {
      select({ address: device.address, name: device.name });
    },
    [select],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Printer"
        subtitle={selectedAddress ? (selectedName ?? selectedAddress) : 'No printer set up'}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md, paddingBottom: space.xxl },
        ]}>
        <MBCard>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>This device prints to</Text>
          <View style={{ gap: theme.space.sm, paddingTop: theme.space.sm }}>
            <Text style={[theme.type.cardTitle, { color: theme.colors.text }]} testID="printer-selected">
              {selectedAddress ? (selectedName ?? selectedAddress) : 'Nothing chosen yet'}
            </Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {selectedAddress
                ? `${selectedAddress} · ${profile.label} · ${profile.paperWidthMm}mm roll`
                : `Set up for the ${BLACK_COPPER_BC_89AC.label} — an ${BLACK_COPPER_BC_89AC.paperWidthMm}mm Bluetooth receipt printer. Pick it from the paired devices below.`}
            </Text>
            {selectedAddress ? (
              <View style={styles.actions}>
                <MBButton
                  label="Print test page"
                  variant="secondary"
                  size="md"
                  loading={testing === selectedAddress}
                  onPress={() => onTest(selectedAddress)}
                  style={styles.grow}
                  testID="printer-test-selected"
                />
                <MBButton
                  label="Forget"
                  variant="dangerSoft"
                  size="md"
                  onPress={clear}
                  style={styles.grow}
                  testID="printer-forget"
                />
              </View>
            ) : null}
          </View>
        </MBCard>

        <View style={{ gap: theme.space.sm }}>
          <Text accessibilityRole="header" style={[theme.type.label, { color: theme.colors.textMuted }]}>
            Paired devices
          </Text>

          {loading && devices === null ? (
            <MBSkeletonList rows={3} />
          ) : loadError ? (
            <MBEmptyState
              title="Cannot list printers"
              message={loadError}
              icon="printer"
              actionLabel={supported ? 'Try again' : undefined}
              onAction={supported ? load : undefined}
            />
          ) : devices && devices.length > 0 ? (
            <MBListCard testID="printer-list">
              {devices.map(device => (
                <MBListRow
                  key={device.address}
                  title={device.name}
                  subtitle={
                    device.address === selectedAddress
                      ? `${device.address} · selected`
                      : device.address
                  }
                  icon="printer"
                  iconTone={device.address === selectedAddress ? 'success' : 'brand'}
                  // No `status` key: that is for a real backend enum value, and
                  // "in use" is a fact about this handset. The tag draws muted,
                  // which is right — it labels the row rather than reporting a
                  // state anything else can change.
                  tag={device.address === selectedAddress ? { label: 'In use' } : undefined}
                  onPress={() => onSelect(device)}
                  testID={`printer-device-${device.address}`}
                />
              ))}
            </MBListCard>
          ) : (
            <MBEmptyState
              title="No paired devices"
              message="Pair the printer in Android's Bluetooth settings first, then come back and choose it here."
              icon="printer"
              actionLabel="Check again"
              onAction={load}
            />
          )}

          {devices && devices.length > 0 ? (
            <MBButton
              label="Check again"
              variant="ghost"
              size="sm"
              loading={loading}
              onPress={load}
              testID="printer-refresh"
            />
          ) : null}
        </View>

        <MBCard>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Before a shift</Text>
          <View style={{ gap: theme.space.sm, paddingTop: theme.space.sm }}>
            {/* Three sentences, each answering a question that otherwise gets
                answered by a cashier at a counter with a customer waiting. */}
            <Text style={[theme.type.body, { color: theme.colors.textSubtle }]}>
              Tap a device to print to it. Print a test page to check it answers — the ruler line
              must reach the edge of the roll.
            </Text>
            <Text style={[theme.type.body, { color: theme.colors.textSubtle }]}>
              The printer is not held open between receipts, so it can be switched off and on
              without coming back here.
            </Text>
            <Text style={[theme.type.body, { color: theme.colors.textSubtle }]}>
              Receipts print in Latin letters and digits only. A product named in Urdu prints as
              question marks.
            </Text>
          </View>
        </MBCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: space.sm, paddingTop: space.xs },
  grow: { flex: 1 },
});
