/**
 * @format
 *
 * Import order here is load-bearing:
 *
 * 1. `react-native-gesture-handler` must be the very first import in the bundle,
 *    before anything touches the renderer, or gestures fail on Android release
 *    builds only — which is the worst way to find out.
 * 2. `react-native-get-random-values` installs crypto.getRandomValues, which the
 *    storage encryption key and UUIDv7 generation both need at module scope.
 * 3. `react-native-url-polyfill` gives @supabase/supabase-js the URL/URLSearchParams
 *    implementation Hermes lacks.
 */
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
