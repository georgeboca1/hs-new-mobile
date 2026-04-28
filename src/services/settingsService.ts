import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '../config/defaults';
import { AppSettings } from '../types/telemetry';

const SETTINGS_KEY = 'hs-new-mobile-settings';

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    return {
      mqttHost: parsed.mqttHost ?? DEFAULT_SETTINGS.mqttHost,
      mqttPort: parsed.mqttPort ?? DEFAULT_SETTINGS.mqttPort,
      mqttUser: parsed.mqttUser ?? DEFAULT_SETTINGS.mqttUser,
      mqttPassword: parsed.mqttPassword ?? DEFAULT_SETTINGS.mqttPassword,
      mqttTopic: parsed.mqttTopic ?? DEFAULT_SETTINGS.mqttTopic,
      useMockData: parsed.useMockData ?? DEFAULT_SETTINGS.useMockData,
      bleIdentifier: parsed.bleIdentifier ?? DEFAULT_SETTINGS.bleIdentifier,
      bleCharacteristicUuid: parsed.bleCharacteristicUuid ?? DEFAULT_SETTINGS.bleCharacteristicUuid,
      themeMode: (parsed.themeMode as 'dark' | 'light') ?? DEFAULT_SETTINGS.themeMode,
      packetParameterSchemas: parsed.packetParameterSchemas ?? DEFAULT_SETTINGS.packetParameterSchemas,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
