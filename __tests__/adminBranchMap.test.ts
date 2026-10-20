import type { BranchLocationRow } from '@/api';
import {
  FALLBACK_CENTRE,
  MAP_ZOOM,
  initialMapView,
  parseAutocompleteResponse,
  parsePlaceDetails,
  pointFromFields,
  radiusMetres,
  regionToLocationBias,
  shouldSearchPlaces,
} from '@/features/admin/utils/branchMap';
import { autocompletePlaces, getPlaceDetails, newPlacesSessionToken, PlacesError } from '@/api/services/placesService';

jest.mock('@/config/env', () => ({ env: { apiBaseUrl: 'http://test', googleMapsApiKey: 'test-key' } }));

const row = (location: Partial<NonNullable<BranchLocationRow['location']>> | null): BranchLocationRow =>
  ({
    branchId: 'b1',
    branchName: 'Committee Chowk',
    branchAddress: 'Rawalpindi',
    location: location
      ? { latitude: 33.6, longitude: 73.06, radiusKm: 5, address: 'Committee Chowk', isActive: true, googlePlaceId: null, ...location }
      : null,
  }) as unknown as BranchLocationRow;

describe('initialMapView', () => {
  it('opens on the stored pin at street level', () => {
    expect(initialMapView(row({}))).toEqual({ centre: { latitude: 33.6, longitude: 73.06 }, zoom: MAP_ZOOM.existing });
  });
  it('opens on Karachi zoomed out without a location', () => {
    expect(initialMapView(row(null))).toEqual({ centre: FALLBACK_CENTRE, zoom: MAP_ZOOM.fresh });
  });
  it('uses the web zoom levels', () => {
    expect(MAP_ZOOM).toEqual({ existing: 14, fresh: 11, place: 15, myLocation: 16 });
  });
});

describe('pointFromFields', () => {
  it('reads finite in-bounds boxes', () => {
    expect(pointFromFields('24.8607000', '-67.0011')).toEqual({ latitude: 24.8607, longitude: -67.0011 });
  });
  it.each([
    ['', '67'],
    ['24', ' '],
    ['abc', '67'],
    ['-', '67'],
    ['91', '67'],
    ['24', '181'],
  ])('rejects %p / %p', (lat, lng) => {
    expect(pointFromFields(lat, lng)).toBeNull();
  });
});

describe('radiusMetres', () => {
  it('converts km to metres', () => {
    expect(radiusMetres('5')).toBe(5000);
    expect(radiusMetres('0.5')).toBe(500);
  });
  it('is null for blank, zero or junk', () => {
    expect(radiusMetres('')).toBeNull();
    expect(radiusMetres('0')).toBeNull();
    expect(radiusMetres('1.2.3')).toBeNull();
  });
});

describe('regionToLocationBias', () => {
  it('turns the visible region into a rectangle', () => {
    expect(regionToLocationBias({ latitude: 30, longitude: 70, latitudeDelta: 2, longitudeDelta: 4 })).toEqual({
      rectangle: { low: { latitude: 29, longitude: 68 }, high: { latitude: 31, longitude: 72 } },
    });
  });
  it('clamps to the globe and skips a missing or degenerate region', () => {
    const bias = regionToLocationBias({ latitude: 89, longitude: 179, latitudeDelta: 10, longitudeDelta: 10 });
    expect(bias?.rectangle.high).toEqual({ latitude: 90, longitude: 180 });
    expect(regionToLocationBias(null)).toBeUndefined();
    expect(regionToLocationBias({ latitude: 0, longitude: 0, latitudeDelta: 0, longitudeDelta: 1 })).toBeUndefined();
  });
});

describe('shouldSearchPlaces', () => {
  it('searches any non-blank text', () => {
    expect(shouldSearchPlaces('M')).toBe(true);
    expect(shouldSearchPlaces('   ')).toBe(false);
  });
});

describe('parseAutocompleteResponse', () => {
  it('keeps place predictions with their two lines', () => {
    const json = {
      suggestions: [
        {
          placePrediction: {
            placeId: 'p1',
            text: { text: 'Mountain Bakes, Gulshan-e-Iqbal, Karachi' },
            structuredFormat: { mainText: { text: 'Mountain Bakes' }, secondaryText: { text: 'Gulshan-e-Iqbal, Karachi' } },
          },
        },
        { placePrediction: { placeId: 'p2', text: { text: 'Committee Chowk' } } },
        { queryPrediction: { text: { text: 'bakeries near me' } } },
        { placePrediction: { text: { text: 'no id' } } },
      ],
    };
    expect(parseAutocompleteResponse(json)).toEqual([
      { placeId: 'p1', primary: 'Mountain Bakes', secondary: 'Gulshan-e-Iqbal, Karachi' },
      { placeId: 'p2', primary: 'Committee Chowk', secondary: '' },
    ]);
  });
  it('is empty for an empty or odd body', () => {
    expect(parseAutocompleteResponse({})).toEqual([]);
    expect(parseAutocompleteResponse(null)).toEqual([]);
  });
});

describe('parsePlaceDetails', () => {
  it('prefers the formatted address', () => {
    expect(
      parsePlaceDetails(
        { id: 'p1', location: { latitude: 24.9, longitude: 67.1 }, formattedAddress: 'Block 5, Karachi', displayName: { text: 'Mountain Bakes' } },
        'p1',
      ),
    ).toEqual({ latitude: 24.9, longitude: 67.1, placeId: 'p1', address: 'Block 5, Karachi' });
  });
  it('falls back to the display name and the requested id', () => {
    expect(parsePlaceDetails({ location: { latitude: 1, longitude: 2 }, displayName: { text: 'Shop' } }, 'req')).toEqual({
      latitude: 1,
      longitude: 2,
      placeId: 'req',
      address: 'Shop',
    });
  });
  it('is null without a location', () => {
    expect(parsePlaceDetails({ id: 'p1', displayName: { text: 'X' } }, 'p1')).toBeNull();
    expect(parsePlaceDetails({ location: { latitude: 'a', longitude: 2 } }, 'p1')).toBeNull();
  });
});

describe('placesService', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
  });

  it('makes v4-shaped session tokens', () => {
    expect(newPlacesSessionToken()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('posts autocomplete with the key, field mask, session and bias', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ suggestions: [] }) });
    const bias = { rectangle: { low: { latitude: 1, longitude: 2 }, high: { latitude: 3, longitude: 4 } } };
    await expect(autocompletePlaces('Mountain', 'tok', bias)).resolves.toEqual({ suggestions: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://places.googleapis.com/v1/places:autocomplete');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Goog-Api-Key']).toBe('test-key');
    expect(init.headers['X-Goog-FieldMask']).toContain('suggestions.placePrediction.placeId');
    expect(JSON.parse(init.body)).toEqual({ input: 'Mountain', sessionToken: 'tok', locationBias: bias });
  });

  it('gets details with the location field mask and the session token', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'p 1' }) });
    await getPlaceDetails('p 1', 'tok');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://places.googleapis.com/v1/places/p%201?sessionToken=tok');
    expect(init.headers['X-Goog-FieldMask']).toBe('id,location,displayName,formattedAddress');
  });

  it('turns HTTP and network failures into one friendly PlacesError', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: () => Promise.resolve({ error: { message: 'denied' } }) });
    await expect(autocompletePlaces('x', 't')).rejects.toBeInstanceOf(PlacesError);
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(getPlaceDetails('p', 't')).rejects.toThrow(/Place search is unavailable/);
  });
});
