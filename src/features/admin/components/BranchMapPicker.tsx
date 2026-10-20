import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type MapPressEvent, type MarkerDragStartEndEvent } from 'react-native-maps';
import { env } from '@/config/env';
import { useAppTheme } from '@/shared/theme';
import { Icon, TextField } from '@/shared/ui';
import type { BranchLocationRow } from '@/api';
import {
  MAP_ZOOM,
  NO_PLACE_LOCATION_MESSAGE,
  initialMapView,
  pointFromFields,
  radiusMetres,
  type MapPoint,
  type MapRegion,
  type PlaceResult,
  type PlaceSuggestion,
} from '../utils/branchMap';
import { usePlaceSearch } from './usePlaceSearch';

/** Whether a Google Maps key was built in — the web's `isMapsConfigured()`. */
export function isMapsConfigured(): boolean {
  return env.googleMapsApiKey.trim().length > 0;
}

/** Fixed so the map never fights the sheet's own scrolling for height. */
const MAP_HEIGHT = 260;

export interface BranchMapPickerHandle {
  /** Re-centre on a point at a zoom — "Use my current location" uses it at street level. */
  focus: (point: MapPoint, zoom: number) => void;
}

export interface BranchMapPickerProps {
  row: BranchLocationRow;
  /** The form's boxes — typed values move the pin too, as on the web. */
  latitude: string;
  longitude: string;
  radiusKm: string;
  /** The pin was dragged or the map tapped: write the point into the form. */
  onPinMoved: (point: MapPoint) => void;
  /** A Places search result was picked: write point, address and place id into the form. */
  onPlacePicked: (place: PlaceResult) => void;
}

/**
 * The web `LocationPickerDialog`'s map half: a Places search box, a map with a
 * draggable pin and the shaded allowed-radius circle; tapping the map moves the
 * pin. The map is a progressive enhancement — without a key this renders only
 * a one-line note and the form's typed coordinates carry on as before.
 */
export const BranchMapPicker = forwardRef<BranchMapPickerHandle, BranchMapPickerProps>(
  ({ row, latitude, longitude, radiusKm, onPinMoved, onPlacePicked }, ref) => {
    const theme = useAppTheme();
    const mapRef = useRef<MapView>(null);
    const regionRef = useRef<MapRegion | null>(null);
    const [initial] = useState(() => initialMapView(row));
    const [ready, setReady] = useState(false);
    const search = usePlaceSearch(regionRef);

    // Junk typed into the boxes leaves the pin and circle where they were (the web's behaviour).
    const typed = pointFromFields(latitude, longitude);
    const [pin, setPin] = useState<MapPoint>(typed ?? initial.centre);
    if (typed && (typed.latitude !== pin.latitude || typed.longitude !== pin.longitude)) setPin(typed);
    const typedMetres = radiusMetres(radiusKm);
    const [metres, setMetres] = useState<number>(typedMetres ?? 0);
    if (typedMetres != null && typedMetres !== metres) setMetres(typedMetres);

    const focus = (point: MapPoint, zoom: number) => mapRef.current?.animateCamera({ center: point, zoom }, { duration: 400 });
    useImperativeHandle(ref, () => ({ focus }));

    if (!isMapsConfigured()) {
      return (
        <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: 10 }]}>
          The map needs a Google Maps key — see src/config/googleMaps.json
        </Text>
      );
    }

    const movePin = (point: MapPoint) => {
      setPin(point);
      onPinMoved(point);
    };

    const choose = (s: PlaceSuggestion) => {
      Keyboard.dismiss();
      search
        .pick(s)
        .then((place) => {
          if (!place) {
            Alert.alert('No Location Found', NO_PLACE_LOCATION_MESSAGE);
            return;
          }
          setPin(place);
          focus(place, MAP_ZOOM.place);
          onPlacePicked(place);
        })
        .catch((e: unknown) => Alert.alert('Could Not Find That Place', e instanceof Error ? e.message : NO_PLACE_LOCATION_MESSAGE));
    };

    return (
      <View style={{ marginTop: 6 }}>
        <TextField
          label="Search address or place"
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="e.g. Mountain Bakes, Gulshan-e-Iqbal"
          autoCorrect={false}
          returnKeyType="search"
          rightAccessory={
            search.searching || search.resolving ? (
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            ) : (
              <Icon name="search" size={16} color={theme.colors.textSecondary} />
            )
          }
        />
        {search.suggestions.length > 0 ? (
          <View
            style={[
              styles.suggestions,
              { borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface },
            ]}>
            {search.suggestions.map((s, i) => (
              <Pressable
                key={s.placeId}
                accessibilityRole="button"
                accessibilityLabel={s.secondary ? `${s.primary}, ${s.secondary}` : s.primary}
                onPress={() => choose(s)}
                style={({ pressed }) => [
                  styles.suggestion,
                  i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border } : null,
                  pressed ? { backgroundColor: theme.colors.cardFill } : null,
                ]}>
                <Icon name="map-pin" size={14} color={theme.colors.textSecondary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    {s.primary}
                  </Text>
                  {s.secondary ? (
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {s.secondary}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
        {search.error ? <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: 6 }]}>{search.error}</Text> : null}

        <View style={[styles.mapBox, { borderColor: theme.colors.border, borderRadius: theme.radii.md, marginTop: 12 }]}>
          {/* One-finger pans belong to the map here: react-native-maps asks its
              parent (the sheet's scroll view) not to intercept them. */}
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialCamera={{ center: initial.centre, zoom: initial.zoom, heading: 0, pitch: 0 }}
            onMapReady={() => setReady(true)}
            onRegionChangeComplete={(r) => {
              regionRef.current = r;
            }}
            onPress={(e: MapPressEvent) => {
              if (e.nativeEvent.action === 'marker-press') return;
              movePin(e.nativeEvent.coordinate);
            }}
            moveOnMarkerPress={false}
            toolbarEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsCompass={false}>
            <Marker
              coordinate={pin}
              draggable
              title={row.branchName || 'Branch location'}
              onDragEnd={(e: MarkerDragStartEndEvent) => movePin(e.nativeEvent.coordinate)}
            />
            {metres > 0 ? (
              <Circle
                center={pin}
                radius={metres}
                strokeColor={theme.colors.info}
                strokeWidth={1.5}
                fillColor={`${theme.colors.info}1F`}
              />
            ) : null}
          </MapView>
          {!ready ? (
            <View style={[StyleSheet.absoluteFill, styles.loading, { backgroundColor: theme.colors.cardFill }]}>
              <ActivityIndicator color={theme.colors.textSecondary} />
            </View>
          ) : null}
        </View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
          Hold and drag the pin, or tap the map to move it.
        </Text>
      </View>
    );
  },
);
BranchMapPicker.displayName = 'BranchMapPicker';

const styles = StyleSheet.create({
  suggestions: { borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 48 },
  mapBox: { height: MAP_HEIGHT, borderWidth: 1, overflow: 'hidden' },
  loading: { alignItems: 'center', justifyContent: 'center' },
});
