import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
import {disposeTelemetryStore, useTelemetryStore} from './src/store/useTelemetryStore';
import {useAppColors} from './src/theme/colors';

function App(): React.JSX.Element {
  const bootstrap = useTelemetryStore(state => state.bootstrap);
  const colors = useAppColors();
  const themeMode = useTelemetryStore(state => state.settings?.themeMode);

  useEffect(() => {
    bootstrap().catch(() => undefined);
    return () => {
      disposeTelemetryStore();
    };
  }, [bootstrap]);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.surface}
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
