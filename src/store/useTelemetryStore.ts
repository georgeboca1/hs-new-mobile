import NetInfo from '@react-native-community/netinfo';
import {Alert} from 'react-native';
import {create} from 'zustand';
import {MOCK_INTERVAL_MS, SYNC_INTERVAL_MS} from '../config/defaults';
import {
  getEspHistory,
  getRecentLogs,
  initializeDatabase,
  insertLog,
  queueAlert,
  queueTelemetry,
} from '../services/databaseService';
import {startBleIngestion, stopBleIngestion} from '../services/bleService';
import {exportLogsToShareSheet} from '../services/logExportService';
import {generateMockEspData, generateMockParachuteData} from '../services/mockDataService';
import {parseHexReplayData} from '../services/packetParser';
import {evaluateRisk} from '../services/riskEngine';
import {loadSettings, saveSettings} from '../services/settingsService';
import {syncNow} from '../services/syncService';
import {AppLog, AppSettings, EspData, ParachuteData, RiskAssessment, TelemetryKind} from '../types/telemetry';

interface TelemetryState {
  settings: AppSettings | null;
  initialized: boolean;
  telemetryRunning: boolean;
  latestEsp: EspData | null;
  latestParachute: ParachuteData | null;
  risk: RiskAssessment | null;
  espHistory: EspData[];
  logs: AppLog[];
  internetConnected: boolean;
  mqttLastSyncAt: string;
  bootstrap: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  triggerSync: () => Promise<void>;
  replayHexPacket: (hexText: string) => Promise<number>;
  exportLogs: () => Promise<string>;
}

let mockTimer: ReturnType<typeof setInterval> | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let netUnsubscribe: (() => void) | null = null;

function trimHistory(history: EspData[]): EspData[] {
  return history.slice(Math.max(history.length - 120, 0));
}

async function appendLog(level: 'info' | 'warn' | 'error', message: string, context = ''): Promise<void> {
  await insertLog(level, message, context);
}

async function ingestTelemetry(kind: TelemetryKind, payload: EspData | ParachuteData): Promise<void> {
  const store = useTelemetryStore.getState();

  await queueTelemetry(kind, payload);

  if (kind === 'esp') {
    const espPayload = payload as EspData;
    useTelemetryStore.setState(state => ({
      latestEsp: espPayload,
      espHistory: trimHistory([...state.espHistory, espPayload]),
    }));
  }

  if (kind === 'parachute') {
    const parachutePayload = payload as ParachuteData;
    const risk = evaluateRisk(parachutePayload);
    useTelemetryStore.setState({
      latestParachute: parachutePayload,
      risk,
    });

    if (risk.shouldAlert) {
      await queueAlert({
        timestamp: new Date().toISOString(),
        risk,
        parachute: parachutePayload,
        esp: store.latestEsp,
      });
      await appendLog('warn', 'Automatic alert queued', JSON.stringify(risk.reasons));
    }
  }
}

async function runSingleMockCycle(): Promise<void> {
  await ingestTelemetry('esp', generateMockEspData());
  await ingestTelemetry('parachute', generateMockParachuteData());
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  settings: null,
  initialized: false,
  telemetryRunning: false,
  latestEsp: null,
  latestParachute: null,
  risk: null,
  espHistory: [],
  logs: [],
  internetConnected: false,
  mqttLastSyncAt: '',

  bootstrap: async () => {
    await initializeDatabase();
    const settings = await loadSettings();
    const espHistory = await getEspHistory(120);
    const logs = await getRecentLogs(120);

    set({
      settings,
      initialized: true,
      espHistory,
      logs,
      latestEsp: espHistory.at(-1) ?? null,
    });

    netUnsubscribe?.();
    netUnsubscribe = NetInfo.addEventListener(state => {
      set({internetConnected: Boolean(state.isConnected && state.isInternetReachable !== false)});
    });

    syncTimer && clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      get().triggerSync().catch(() => undefined);
    }, SYNC_INTERVAL_MS);

    await appendLog('info', 'App initialized');
  },

  updateSettings: async patch => {
    const current = get().settings;
    if (!current) {
      return;
    }

    const updated: AppSettings = {
      ...current,
      ...patch,
    };

    await saveSettings(updated);
    set({settings: updated});
    await appendLog('info', 'Settings updated');
  },

  startMonitoring: async () => {
    const settings = get().settings;
    if (!settings) {
      return;
    }

    await get().stopMonitoring();

    if (settings.useMockData) {
      await appendLog('info', 'Starting mock telemetry stream');
      mockTimer = setInterval(() => {
        runSingleMockCycle().catch(() => undefined);
      }, MOCK_INTERVAL_MS);
      await runSingleMockCycle();
      set({telemetryRunning: true});
      return;
    }

    await appendLog('info', 'Starting BLE telemetry stream');

    const connected = await startBleIngestion(
      settings,
      packet => {
        ingestTelemetry(packet.kind, packet.payload).catch(() => undefined);
      },
      (level, message, context) => {
        appendLog(level, message, context ?? '').catch(() => undefined);
      },
    );

    if (!connected) {
      set({telemetryRunning: false});
      Alert.alert(
        'Device connection required',
        'No compatible BLE wrist device is connected. Please power on the device and verify BLE settings, then try again.',
      );
      await appendLog('warn', 'BLE monitoring not started because no device was connected');
      return;
    }

    set({telemetryRunning: true});
  },

  stopMonitoring: async () => {
    if (mockTimer) {
      clearInterval(mockTimer);
      mockTimer = null;
    }

    await stopBleIngestion();

    set({telemetryRunning: false});
    await appendLog('info', 'Telemetry stream stopped');
  },

  triggerSync: async () => {
    const settings = get().settings;
    if (!settings) {
      return;
    }

    const result = await syncNow(settings);
    if (result.syncedTelemetry > 0 || result.syncedAlerts > 0) {
      set({mqttLastSyncAt: new Date().toISOString()});
    }

    const logs = await getRecentLogs(120);
    set({logs});
  },

  replayHexPacket: async hexText => {
    const settings = get().settings;
    if (!settings) {
      return 0;
    }

    const packets = parseHexReplayData(hexText, settings);
    for (const packet of packets) {
      await ingestTelemetry(packet.kind, packet.payload);
    }

    await appendLog('info', `Replayed ${packets.length} packet(s) from hex input`);
    return packets.length;
  },

  exportLogs: async () => {
    const path = await exportLogsToShareSheet();
    await appendLog('info', 'Logs exported', path);
    const logs = await getRecentLogs(120);
    set({logs});
    return path;
  },
}));

export function disposeTelemetryStore(): void {
  if (mockTimer) {
    clearInterval(mockTimer);
    mockTimer = null;
  }

  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }

  netUnsubscribe?.();
  netUnsubscribe = null;
}
