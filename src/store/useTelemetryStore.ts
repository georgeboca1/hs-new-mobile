import NetInfo from '@react-native-community/netinfo';
import {Alert} from 'react-native';
import {create} from 'zustand';
import {MOCK_INTERVAL_MS} from '../config/defaults';
import {
  clearAllData as clearDb,
  getEspHistory,
  getRecentLogs,
  getTelemetryHistory,
  initializeDatabase,
  insertLog,
  queueAlert,
  queueTelemetry,
} from '../services/databaseService';
import {startBleIngestion, stopBleIngestion} from '../services/bleService';
import {exportLogsToShareSheet} from '../services/logExportService';
import {generateMockEspData, generateMockParachuteData} from '../services/mockDataService';
import {evaluateRisk, INITIAL_RISK} from '../services/riskEngine';
import {triggerDangerAlert} from '../services/alertService';
import {loadSettings, saveSettings} from '../services/settingsService';
import {syncNow} from '../services/syncService';
import {AppLog, AppSettings, EspData, ParachuteData, RiskAssessment, TelemetryKind} from '../types/telemetry';

interface TelemetryState {
  settings: AppSettings | null;
  initialized: boolean;
  telemetryRunning: boolean;
  latestEsp: EspData | null;
  latestParachute: ParachuteData | null;
  risk: RiskAssessment;
  espHistory: EspData[];
  logs: AppLog[];
  internetConnected: boolean;
  mqttLastSyncAt: string;
  bootstrap: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  triggerSync: () => Promise<void>;
  exportLogs: () => Promise<string>;
  clearAllData: () => Promise<void>;
  fetchFullHistory: (limit?: number) => Promise<any[]>;
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

  console.log('[Store] Ingesting telemetry:', {kind, timestamp: payload.timestamp});

  await queueTelemetry(kind, payload);

  if (kind === 'esp') {
    const espPayload = payload as EspData;
    console.log('[Store] Updating ESP data:', espPayload);
    useTelemetryStore.setState(state => ({
      // Merge with previous state to preserve fields not in the partial update
      latestEsp: state.latestEsp ? {...state.latestEsp, ...espPayload} : espPayload,
      espHistory: trimHistory([...state.espHistory, espPayload]),
    }));
  }

  if (kind === 'parachute') {
    const parachutePayload = payload as ParachuteData;
    const risk = evaluateRisk(parachutePayload);
    console.log('[Store] Updating parachute data:', {
      timestamp: parachutePayload.timestamp,
      shouldAlert: risk.shouldAlert,
    });
    useTelemetryStore.setState(state => ({
      // Merge with previous state to preserve fields not in the partial update
      latestParachute: state.latestParachute ? {...state.latestParachute, ...parachutePayload} : parachutePayload,
      risk,
    }));

    if (risk.shouldAlert) {
      await queueAlert({
        timestamp: parachutePayload.timestamp || new Date().toISOString(),
        risk,
        parachute: parachutePayload,
        esp: store.latestEsp,
      });
      await appendLog('warn', 'Automatic alert queued', JSON.stringify(risk.reasons));
      
      // Trigger the high-priority UI alert (sound, popup, cooldown)
      triggerDangerAlert(risk, parachutePayload, store.settings).catch(err => {
        console.error('[Store] Alert trigger failed:', err);
      });
    }
  }
}

async function runSingleMockCycle(): Promise<void> {
  const settings = useTelemetryStore.getState().settings;
  if (!settings) {
    return;
  }

  const sharedTimestamp = new Date().toLocaleTimeString('en-GB'); // e.g. "14:20:04"

  const espData = generateMockEspData();
  const parachuteData = generateMockParachuteData();

  // Override timestamps to be identical for the grouping demonstration
  espData.timestamp = sharedTimestamp;
  parachuteData.timestamp = sharedTimestamp;

  await ingestTelemetry('esp', espData);
  await ingestTelemetry('parachute', parachuteData);
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  settings: null,
  initialized: false,
  telemetryRunning: false,
  latestEsp: null,
  latestParachute: null,
  risk: INITIAL_RISK,
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

    const mockDataChanged = current.useMockData !== updated.useMockData;
    const wasRunning = get().telemetryRunning;

    await saveSettings(updated);
    set({settings: updated});
    await appendLog('info', 'Settings updated');

    if (wasRunning && mockDataChanged) {
      await appendLog('info', 'Data source changed while running, restarting stream...');
      await get().startMonitoring();
    }
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
        ingestTelemetry(packet.kind, packet.payload).catch(err => {
          appendLog('error', 'Failed to ingest telemetry', String(err)).catch(() => undefined);
        });
      },
      schemas => {
        get().updateSettings({packetParameterSchemas: schemas}).catch(err => {
          // ignore error
        });
      },
      (level, message, context) => {
        appendLog(level, message, context ?? '').catch(() => undefined);
      },
      () => {
        set({telemetryRunning: false});
        appendLog('warn', 'BLE connection lost, telemetry stopped').catch(() => undefined);
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

    await stopBleIngestion(get().settings ?? undefined);

    set({telemetryRunning: false});
    await appendLog('info', 'Telemetry stream stopped');
  },

  triggerSync: async () => {
    const { settings, telemetryRunning } = get();
    if (!settings) {
      return;
    }

    if (telemetryRunning) {
      Alert.alert(
        'Action Required',
        'Please stop the telemetry stream (disconnect) before syncing data. This ensures all data is properly saved before transmission.'
      );
      return;
    }

    const success = await syncNow(settings);
    
    if (success) {
      set({mqttLastSyncAt: new Date().toISOString()});
      Alert.alert('Sync successful', 'Data has been synchronized and local database cleared.');
    } else {
      Alert.alert('Sync unsuccessful', 'Web server may be offline.');
    }

    const logs = await getRecentLogs(120);
    set({logs});
  },

  exportLogs: async () => {
    const path = await exportLogsToShareSheet();
    await appendLog('info', 'Logs exported', path);
    const logs = await getRecentLogs(120);
    set({logs});
    return path;
  },

  clearAllData: async () => {
    await clearDb();
    set({
      espHistory: [],
      logs: [],
      latestEsp: null,
      latestParachute: null,
      risk: INITIAL_RISK,
    });
    await appendLog('info', 'Database and history cleared by user');
  },

  fetchFullHistory: async (limit = 200) => {
    return getTelemetryHistory(limit);
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
