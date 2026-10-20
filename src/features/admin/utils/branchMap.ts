import type { BranchLocationRow } from '@/api';

/**
 * Pure rules behind the Branch Locations map picker — the web's
 * `LocationPickerDialog` map (Google Maps JS) reproduced for `react-native-maps`
 * and the Places API (New) REST endpoints. React-free so it unit-tests.
 */

export interface MapPoint {
  latitude: number;
  longitude: number;
}

/** Karachi. Where the map opens when a branch has no stored location — the web's `FALLBACK_CENTRE`. */
export const FALLBACK_CENTRE: MapPoint = { latitude: 24.8607, longitude: 67.0011 };

/** The web's zoom levels: a stored pin, a fresh branch, a picked search result, the device's own fix. */
export const MAP_ZOOM = { existing: 14, fresh: 11, place: 15, myLocation: 16 } as const;

/** Where the map opens and how close — the stored point at street level, else Karachi zoomed out. */
export function initialMapView(row: BranchLocationRow): { centre: MapPoint; zoom: number } {
  const loc = row.location;
  if (loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
    return { centre: { latitude: loc.latitude, longitude: loc.longitude }, zoom: MAP_ZOOM.existing };
  }
  return { centre: FALLBACK_CENTRE, zoom: MAP_ZOOM.fresh };
}

/**
 * The point the typed boxes describe, or null while they don't describe one —
 * the web only moves the pin for finite, in-bounds values (its `hasPoint` plus
 * the WGS84 check), leaving it where it was otherwise.
 */
export function pointFromFields(latitude: string, longitude: string): MapPoint | null {
  if (latitude.trim() === '' || longitude.trim() === '') return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { latitude: lat, longitude: lng };
}

/** The circle's radius in metres, or null for a blank / zero / junk radius (the web then keeps the last circle). */
export function radiusMetres(radiusKm: string): number | null {
  const km = Number(radiusKm);
  return Number.isFinite(km) && km > 0 ? km * 1000 : null;
}

/** A visible map area, as `react-native-maps` reports it in `onRegionChangeComplete`. */
export interface MapRegion extends MapPoint {
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * The web binds Autocomplete to the map's viewport (`bindTo('bounds', map)`) so
 * places near the current view rank first. Places API (New) takes the same
 * thing as a `locationBias` rectangle; clamped so a world-wide view stays valid.
 */
export function regionToLocationBias(region: MapRegion | null): { rectangle: { low: MapPoint; high: MapPoint } } | undefined {
  if (!region) return undefined;
  const clampLat = (n: number) => Math.max(-90, Math.min(90, n));
  const clampLng = (n: number) => Math.max(-180, Math.min(180, n));
  const halfLat = Math.abs(region.latitudeDelta) / 2;
  const halfLng = Math.abs(region.longitudeDelta) / 2;
  if (!Number.isFinite(halfLat) || !Number.isFinite(halfLng) || halfLat === 0 || halfLng === 0) return undefined;
  return {
    rectangle: {
      low: { latitude: clampLat(region.latitude - halfLat), longitude: clampLng(region.longitude - halfLng) },
      high: { latitude: clampLat(region.latitude + halfLat), longitude: clampLng(region.longitude + halfLng) },
    },
  };
}

// ── Places API (New) ────────────────────────────────────────────────────────

/** One row of the suggestion list under the search box. */
export interface PlaceSuggestion {
  placeId: string;
  /** "Mountain Bakes" — the bold line. */
  primary: string;
  /** "Gulshan-e-Iqbal, Karachi, Pakistan" — the second line; may be empty. */
  secondary: string;
}

/** A picked place: where to drop the pin and what to write into Address. */
export interface PlaceResult extends MapPoint {
  placeId: string;
  address: string;
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null;
const textOf = (v: unknown): string => (isObj(v) && typeof v.text === 'string' ? v.text : '');

/** Typing that should query Places — anything non-blank, as the web widget does. */
export function shouldSearchPlaces(input: string): boolean {
  return input.trim().length > 0;
}

/**
 * `places:autocomplete` → suggestion rows. Only `placePrediction`s (not query
 * predictions — those carry no place to pin); rows without an id are dropped.
 */
export function parseAutocompleteResponse(json: unknown): PlaceSuggestion[] {
  if (!isObj(json) || !Array.isArray(json.suggestions)) return [];
  const out: PlaceSuggestion[] = [];
  for (const s of json.suggestions) {
    const p = isObj(s) ? s.placePrediction : null;
    if (!isObj(p) || typeof p.placeId !== 'string' || !p.placeId) continue;
    const structured = isObj(p.structuredFormat) ? p.structuredFormat : null;
    const primary = textOf(structured?.mainText) || textOf(p.text);
    if (!primary) continue;
    out.push({ placeId: p.placeId, primary, secondary: textOf(structured?.secondaryText) });
  }
  return out;
}

/**
 * `places/{id}` → the pin and the address, or null when Google returned no
 * location (the web's "No location found for that search" case). Address is
 * `formattedAddress ?? displayName`, the web's `formatted_address ?? name`.
 */
export function parsePlaceDetails(json: unknown, requestedId: string): PlaceResult | null {
  if (!isObj(json) || !isObj(json.location)) return null;
  const { latitude, longitude } = json.location;
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const formatted = typeof json.formattedAddress === 'string' ? json.formattedAddress : '';
  return {
    latitude,
    longitude,
    placeId: typeof json.id === 'string' && json.id ? json.id : requestedId,
    address: formatted || textOf(json.displayName),
  };
}

/** The web's toast when a picked place has no geometry. */
export const NO_PLACE_LOCATION_MESSAGE = 'No location found for that search. Try picking from the list.';
