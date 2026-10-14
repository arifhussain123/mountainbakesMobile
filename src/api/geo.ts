import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { logger } from '@/shared/utils';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  capturedAt: string;
}

/** The `X-Geo-Position` request header name — must match `backend/src/shared/utils/geo.ts`. */
export const GEO_POSITION_HEADER = 'X-Geo-Position';

/**
 * Mirrors `backend/src/shared/utils/geo.ts`'s `encodeGeoPosition` byte-for-byte:
 * `lat.toFixed(7);lng.toFixed(7);accuracyM rounded;capturedAt ISO`. The two sides
 * must agree on this format or the server's `decodeGeoPosition` silently treats
 * the header as absent and every geofenced request is refused with "no_position".
 */
export function encodeGeoPosition(position: GeoPosition): string {
  const accuracy = position.accuracyM != null && Number.isFinite(position.accuracyM) ? Math.round(position.accuracyM) : '';
  return [position.latitude.toFixed(7), position.longitude.toFixed(7), accuracy, position.capturedAt].join(';');
}

async function ensureAndroidPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  if (already) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
    title: 'Location access',
    message: 'Mountain Bakes needs your location to confirm a sale is being made from this branch.',
    buttonPositive: 'Allow',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Current device position for a geofenced mutation, or `null` if it can't be
 * obtained (permission denied, timed out, no GPS hardware) — the server then
 * reads the header as absent and returns its own "location could not be
 * determined" message (CLAUDE.md Section 31), so this never needs to throw.
 */
export function getCurrentGeoPosition(): Promise<GeoPosition | null> {
  return new Promise((resolve) => {
    ensureAndroidPermission()
      .then((granted) => {
        if (!granted) {
          resolve(null);
          return;
        }
        Geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracyM: pos.coords.accuracy ?? null,
              capturedAt: new Date(pos.timestamp).toISOString(),
            });
          },
          (error) => {
            logger.warn('geolocation failed', { error });
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
        );
      })
      .catch((error) => {
        logger.warn('location permission request failed', { error });
        resolve(null);
      });
  });
}
