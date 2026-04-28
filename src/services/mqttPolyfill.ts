import {NativeModules} from 'react-native';

// Polyfill for sp-react-native-mqtt compatibility with React Native 0.70+
// This avoids "new NativeEventEmitter() was called with a non-null argument without the required addListener method"
// We must ensure this runs BEFORE the library is imported.
if (NativeModules.Mqtt && !NativeModules.Mqtt.addListener) {
  console.log('[MQTT Polyfill] Patching NativeModules.Mqtt');
  (NativeModules.Mqtt as any).addListener = () => {};
  (NativeModules.Mqtt as any).removeListeners = () => {};
}
