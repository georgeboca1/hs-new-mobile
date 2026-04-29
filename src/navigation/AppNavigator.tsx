import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { DashboardScreen } from '../screens/DashboardScreen';
import { GraphsScreen } from '../screens/GraphsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { appNavigationThemeDark, appNavigationThemeLight, AppColors, useAppColors } from '../theme/colors';

export type RootTabsParamList = {
  Dashboard: undefined;
  Telemetry: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabsParamList>();

type TabIconName = 'dashboard' | 'graphs' | 'settings';

function TabIcon({ name, color, size }: { name: TabIconName; color: string; size: number }) {
  if (name === 'dashboard') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 11.5L12 4L21 11.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M6.5 10.5V20H17.5V10.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'graphs') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Line x1="4" y1="19" x2="20" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Polyline
          points="5,15 9,11 12,13 17,7 19,9"
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2} />
      <Line x1="12" y1="3" x2="12" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="18" x2="12" y2="21" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="12" x2="6" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="18" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="5.7" y1="5.7" x2="7.8" y2="7.8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="16.2" y1="16.2" x2="18.3" y2="18.3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="16.2" y1="7.8" x2="18.3" y2="5.7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="5.7" y1="18.3" x2="7.8" y2="16.2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function MonitoringIcon({ isRunning, color }: { isRunning: boolean; color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      {isRunning ? (
        <Rect x="4.3" y="4.3" width="9.4" height="9.4" rx="1.5" fill={color} />
      ) : (
        <Path d="M5 3.6L14 9L5 14.4V3.6Z" fill={color} />
      )}
    </Svg>
  );
}

function MonitoringHeaderButton(): React.JSX.Element {
  const colors = useAppColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const telemetryRunning = useTelemetryStore(state => state.telemetryRunning);
  const startMonitoring = useTelemetryStore(state => state.startMonitoring);
  const stopMonitoring = useTelemetryStore(state => state.stopMonitoring);
  const [busy, setBusy] = React.useState(false);

  const onToggle = React.useCallback(async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      if (telemetryRunning) {
        await stopMonitoring();
      } else {
        await startMonitoring();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, startMonitoring, stopMonitoring, telemetryRunning]);

  const iconColor = telemetryRunning ? '#0D0A17' : colors.textPrimary;

  return (
    <Pressable
      onPress={onToggle}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={telemetryRunning ? 'Stop monitoring' : 'Start monitoring'}
      style={[
        styles.monitorButton,
        telemetryRunning ? styles.monitorButtonRunning : styles.monitorButtonIdle,
        busy ? styles.monitorButtonBusy : null,
      ]}>
      <MonitoringIcon isRunning={telemetryRunning} color={iconColor} />
    </Pressable>
  );
}

function DashboardTabBarIcon({ color, size }: { color: string; size: number }): React.JSX.Element {
  return <TabIcon name="dashboard" color={color} size={size} />;
}

function GraphsTabBarIcon({ color, size }: { color: string; size: number }): React.JSX.Element {
  return <TabIcon name="graphs" color={color} size={size} />;
}

function SettingsTabBarIcon({ color, size }: { color: string; size: number }): React.JSX.Element {
  return <TabIcon name="settings" color={color} size={size} />;
}

const tabIconByRoute: {
  [K in keyof RootTabsParamList]: (props: { color: string; size: number }) => React.JSX.Element;
} = {
  Dashboard: DashboardTabBarIcon,
  Telemetry: GraphsTabBarIcon,
  Settings: SettingsTabBarIcon,
};

export function AppNavigator(): React.JSX.Element {
  const colors = useAppColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const tabBottomPadding = Math.max(insets.bottom, 8);
  const settings = useTelemetryStore(state => state.settings);
  const navTheme = settings?.themeMode === 'light' ? appNavigationThemeLight : appNavigationThemeDark;

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ route }) => ({
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: colors.textPrimary,
          headerRight: MonitoringHeaderButton,
          tabBarStyle: [
            styles.tabBar,
            {
              height: 54 + tabBottomPadding,
              paddingBottom: tabBottomPadding,
            },
          ],
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarActiveTintColor: colors.neonPrimary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIcon: tabIconByRoute[route.name],
        })}>
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Telemetry" component={GraphsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    header: {
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
    },
    headerTitle: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    tabBar: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: 62,
      paddingBottom: 8,
      paddingTop: 8,
    },
    tabBarLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    monitorButton: {
      marginRight: 14,
      height: 34,
      width: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    monitorButtonIdle: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.neonPrimary,
    },
    monitorButtonRunning: {
      backgroundColor: colors.neonGlow,
      borderColor: colors.neonGlow,
    },
    monitorButtonBusy: {
      opacity: 0.5,
    },
  });
