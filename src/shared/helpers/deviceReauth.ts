import * as Keychain from 'react-native-keychain';
import { logger } from '@/shared/utils/logger';

/**
 * Ask the phone's owner to prove it is them — fingerprint, face or the device
 * passcode — before an irreversible act (closing a finance day).
 *
 * There is no biometrics library in this app, but react-native-keychain can
 * guard an item with the device's own lock: reading it back raises the
 * system prompt. So the "secret" here is a fixed marker; what matters is that
 * reading it forces the prompt.
 *
 *   'ok'           the owner authenticated
 *   'cancelled'    the prompt was shown and dismissed or failed
 *   'unavailable'  the phone has no screen lock, so nothing can be asked —
 *                  the caller decides (Daily Closing falls back to the typed
 *                  date alone and says so)
 */
export type DeviceReauthResult = 'ok' | 'cancelled' | 'unavailable';

const SERVICE = 'mountainbakes.reauth';
const ACCESS = Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE;

export async function requestDeviceReauth(title: string): Promise<DeviceReauthResult> {
  try {
    if (!(await Keychain.isPasscodeAuthAvailable())) return 'unavailable';
    // (Re)written every time: an item stored before a lock was set up, or
    // invalidated by a biometrics change, would otherwise read without a prompt
    // or not at all.
    await Keychain.resetGenericPassword({ service: SERVICE });
    const stored = await Keychain.setGenericPassword('reauth', 'reauth', { service: SERVICE, accessControl: ACCESS });
    if (!stored) return 'unavailable';
    const read = await Keychain.getGenericPassword({
      service: SERVICE,
      accessControl: ACCESS,
      authenticationPrompt: { title, cancel: 'Cancel' },
    });
    return read ? 'ok' : 'cancelled';
  } catch (error) {
    // A dismissed prompt arrives as a thrown error on both platforms.
    logger.warn('device re-auth did not complete', { error: String(error) });
    return 'cancelled';
  }
}
