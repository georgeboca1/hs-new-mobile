import AsyncStorage from '@react-native-async-storage/async-storage';
import {DEFAULT_SETTINGS} from '../config/defaults';
import {AppSettings} from '../types/telemetry';

const SETTINGS_KEY = 'hs-new-mobile-settings';

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const legacyCharacteristic = (parsed as Partial<AppSettings> & {bleCharacteristicUuid?: string}).bleCharacteristicUuid;
    const mergedSchemas = {
      esp: parsed.packetParameterSchemas?.esp ?? DEFAULT_SETTINGS.packetParameterSchemas.esp,
      parachute:
        parsed.packetParameterSchemas?.parachute ?? DEFAULT_SETTINGS.packetParameterSchemas.parachute,
    };

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      bleTelemetryUuid: parsed.bleTelemetryUuid ?? legacyCharacteristic ?? DEFAULT_SETTINGS.bleTelemetryUuid,
      packetParameterSchemas: mergedSchemas,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
