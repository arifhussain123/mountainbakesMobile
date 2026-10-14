/**
 * @format
 */

// Must be the very first import — react-navigation's gesture-handler-backed
// navigators (the drawer) need it installed before anything else runs.
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
