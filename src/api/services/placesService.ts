import { Platform } from 'react-native';
import { env } from '@/config/env';
import { logger } from '@/shared/utils';

/**
 * Google Places API (New), straight from the phone — the web's Places
 * Autocomplete widget for the Branch Locations picker. Plain `fetch`, not
 * `apiClient`: this is Google, not our server, and must never carry the
 * session token.
 *
 * Billing: one session token per search, from the first keystroke to the
 * details lookup of the picked row — Google then bills the session as a
 * single Place Details call rather than per keystroke.
 *
 * Returns Google's JSON untouched; the Branch Locations picker parses it with
 * the tested helpers in `features/admin/utils/branchMap.ts`.
 */

type LatLng = { latitude: number; longitude: number };

const PLACES_BASE = 'https://places.googleapis.com/v1';
const AUTOCOMPLETE_FIELDS =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat';
const DETAILS_FIELDS = 'id,location,displayName,formattedAddress';
/** Seconds-scale: a stuck Places call must not leave the search spinning. */
const TIMEOUT_MS = 15_000;

/** The one user-facing failure; the HTTP details go to the logger. */
export class PlacesError extends Error {
  constructor(message = 'Place search is unavailable right now. You can still drop the pin or type the coordinates.') {
    super(message);
    this.name = 'PlacesError';
  }
}

/** A Places session token: any string ≤ 36 chars; a v4-shaped UUID as Google suggests. */
export function newPlacesSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // 'y' is the RFC 4122 variant nibble: 8, 9, a or b.
    const r = c === 'x' ? Math.floor(Math.random() * 16) : 8 + Math.floor(Math.random() * 4);
    return r.toString(16);
  });
}

function headers(fieldMask: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': env.googleMapsApiKey,
    'X-Goog-FieldMask': fieldMask,
  };
  // Lets an Android-app-restricted key accept these web-service calls: Google
  // wants the package and the signing cert's SHA-1 (googleMaps.json — the build
  // that's installed must be signed with that cert). An API-restricted key ignores both.
  if (Platform.OS === 'android') {
    h['X-Android-Package'] = 'com.mountainbakes.branch';
    if (env.androidCertSha1) h['X-Android-Cert'] = env.androidCertSha1;
  }
  return h;
}

async function call(url: string, init: RequestInit, what: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      logger.warn(`Places ${what} failed`, { status: res.status, body: body as Record<string, unknown> | null });
      throw new PlacesError();
    }
    return body;
  } catch (e) {
    if (e instanceof PlacesError) throw e;
    logger.warn(`Places ${what} request error`, { error: String(e) });
    throw new PlacesError();
  } finally {
    clearTimeout(timer);
  }
}

/** `places:autocomplete` for what the admin typed, biased to the map's visible area. */
export async function autocompletePlaces(
  input: string,
  sessionToken: string,
  locationBias?: { rectangle: { low: LatLng; high: LatLng } },
): Promise<unknown> {
  const body: Record<string, unknown> = { input, sessionToken };
  if (locationBias) body.locationBias = locationBias;
  return call(`${PLACES_BASE}/places:autocomplete`, { method: 'POST', headers: headers(AUTOCOMPLETE_FIELDS), body: JSON.stringify(body) }, 'autocomplete');
}

/** `places/{id}` — coordinates and address of a picked suggestion. Ends the session. */
export async function getPlaceDetails(placeId: string, sessionToken: string): Promise<unknown> {
  const url = `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`;
  return call(url, { method: 'GET', headers: headers(DETAILS_FIELDS) }, 'details');
}
