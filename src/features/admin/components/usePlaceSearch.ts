import { useEffect, useRef, useState } from 'react';
import { PlacesError, autocompletePlaces, getPlaceDetails, newPlacesSessionToken } from '@/api/services/placesService';
import { useDebouncedValue } from '@/shared/hooks';
import {
  parseAutocompleteResponse,
  parsePlaceDetails,
  regionToLocationBias,
  shouldSearchPlaces,
  type MapRegion,
  type PlaceResult,
  type PlaceSuggestion,
} from '../utils/branchMap';

/** Typing settles for this long before Places is asked. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The web's Places Autocomplete box as a hook: debounced suggestions for the
 * typed text (biased to the map's current view, read from `regionRef` at
 * request time), and `pick` to resolve a row to coordinates. One session token
 * spans the typing and the pick, as Google bills it.
 */
export function usePlaceSearch(regionRef: React.RefObject<MapRegion | null>) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<string | null>(null);
  /** Bumped per request so a slow answer for older text never overwrites a newer one. */
  const seq = useRef(0);
  /** The text a pick wrote into the box — not a new search. */
  const picked = useRef<string | null>(null);

  useEffect(() => {
    const id = ++seq.current;
    if (!shouldSearchPlaces(debounced) || debounced === picked.current) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    picked.current = null;
    session.current ??= newPlacesSessionToken();
    setSearching(true);
    autocompletePlaces(debounced.trim(), session.current, regionToLocationBias(regionRef.current))
      .then((json) => {
        if (id !== seq.current) return;
        setSuggestions(parseAutocompleteResponse(json));
        setError(null);
      })
      .catch((e: unknown) => {
        if (id !== seq.current) return;
        setSuggestions([]);
        setError((e instanceof PlacesError ? e : new PlacesError()).message);
      })
      .finally(() => {
        if (id === seq.current) setSearching(false);
      });
  }, [debounced, regionRef]);

  /** Resolves a suggestion to its pin; null when Google has no location for it. Throws `PlacesError`. */
  const pick = async (s: PlaceSuggestion): Promise<PlaceResult | null> => {
    const token = session.current ?? newPlacesSessionToken();
    session.current = null;
    seq.current++;
    picked.current = s.primary;
    setQuery(s.primary);
    setSuggestions([]);
    setSearching(false);
    setResolving(true);
    try {
      return parsePlaceDetails(await getPlaceDetails(s.placeId, token), s.placeId);
    } finally {
      setResolving(false);
    }
  };

  return { query, setQuery, suggestions, searching, resolving, error, pick };
}
