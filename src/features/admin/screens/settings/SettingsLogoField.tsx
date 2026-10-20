import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import { launchImageLibrary, type ImageLibraryOptions } from 'react-native-image-picker';
import { useUploadSettingsLogo } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { ActionChip } from '../../components';
import { logoFileProblem } from '../../utils/adminFilesActions';

// No resize/re-encode: the logo goes up as picked (a PNG keeps its transparency); the server caps it at 2 MB.
const LOGO_PICKER_OPTIONS: ImageLibraryOptions = { mediaType: 'photo', selectionLimit: 1, includeBase64: false };

/**
 * Settings → Company → Logo — the web's logo file input. The web uploads the
 * chosen file when "Save Settings" is pressed; on the phone picking the image
 * IS the upload (`POST /api/settings/logo`, multipart field `logo`, PNG / JPEG /
 * WebP / SVG up to 2 MB). The server writes the new URL to the settings row on
 * its own, so this never goes through Save and leaves the form's unsaved edits
 * alone; the returned URL is shown until the settings are next fetched.
 */
export function SettingsLogoField({ logoUrl }: { logoUrl: string | null | undefined }) {
  const theme = useAppTheme();
  const upload = useUploadSettingsLogo();
  const [picking, setPicking] = useState(false);
  // The URL the upload returned, shown at once while the settings refetch;
  // dropped as soon as the loaded settings carry a different URL.
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [seenLogoUrl, setSeenLogoUrl] = useState(logoUrl);
  if (seenLogoUrl !== logoUrl) {
    setSeenLogoUrl(logoUrl);
    setUploadedUrl(null);
  }
  const shown = uploadedUrl ?? logoUrl ?? null;
  const busy = picking || upload.isPending;

  const pick = async () => {
    setPicking(true);
    let asset;
    try {
      asset = (await launchImageLibrary(LOGO_PICKER_OPTIONS)).assets?.[0];
    } catch (e) {
      Alert.alert('Could Not Open Photos', mapErrorToMessage(e));
      return;
    } finally {
      setPicking(false);
    }
    if (!asset?.uri) return;
    const problem = logoFileProblem({ type: asset.type, fileSize: asset.fileSize });
    if (problem) {
      Alert.alert('Could Not Upload the Logo', problem);
      return;
    }
    upload.mutate(
      { uri: asset.uri, type: asset.type!, fileName: asset.fileName },
      {
        onSuccess: (res) => {
          setUploadedUrl(res.logoUrl);
          Alert.alert('Logo Uploaded', 'The new logo is saved.');
        },
        onError: (e) => Alert.alert('Could Not Upload the Logo', `Logo upload failed: ${mapErrorToMessage(e)}`),
      },
    );
  };

  return (
    <View style={{ gap: 6, marginTop: 12 }}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>Logo</Text>
      <View style={styles.row}>
        {shown ? (
          <Image source={{ uri: shown }} style={[styles.logo, { borderColor: theme.colors.border }]} resizeMode="contain" accessibilityLabel="Company logo" />
        ) : null}
        {upload.isPending ? <ActivityIndicator color={theme.colors.primary} /> : null}
        <ActionChip icon="image" label={shown ? 'Change logo' : 'Choose logo'} onPress={() => void pick()} loading={busy} disabled={busy} />
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PNG, JPEG, WebP or SVG, up to 2 MB. Saved as soon as it is chosen.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  logo: { width: 56, height: 56, borderRadius: 8, borderWidth: 1 },
});
