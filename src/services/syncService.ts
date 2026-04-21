import NetInfo from '@react-native-community/netinfo';
import {AppSettings} from '../types/telemetry';
import {
  getPendingAlerts,
  getPendingTelemetry,
  insertLog,
  markAlertsSynced,
  markTelemetrySynced,
} from './databaseService';
import {connectMqtt, isMqttConnected, publishMqttJson} from './mqttService';

export async function syncNow(settings: AppSettings): Promise<{syncedTelemetry: number; syncedAlerts: number}> {
  const netState = await NetInfo.fetch();
  const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

  if (!isOnline) {
    await insertLog('info', 'Sync skipped because internet is unavailable');
    return {syncedTelemetry: 0, syncedAlerts: 0};
  }

  await connectMqtt(settings);
  if (!isMqttConnected()) {
    await insertLog('warn', 'Sync skipped because MQTT is disconnected');
    return {syncedTelemetry: 0, syncedAlerts: 0};
  }

  const pendingTelemetry = await getPendingTelemetry(200);
  const telemetrySyncedIds: number[] = [];

  for (const item of pendingTelemetry) {
    const payload = JSON.parse(item.payload) as Record<string, unknown>;
    const success = await publishMqttJson(settings.mqttTopic, {
      kind: item.kind,
      createdAt: item.createdAt,
      source: 'mobile',
      payload,
    });

    if (success) {
      telemetrySyncedIds.push(item.id);
    }
  }

  await markTelemetrySynced(telemetrySyncedIds);

  const pendingAlerts = await getPendingAlerts(100);
  const alertSyncedIds: number[] = [];

  for (const item of pendingAlerts) {
    const payload = JSON.parse(item.payload) as Record<string, unknown>;
    const success = await publishMqttJson(`${settings.mqttTopic}/alerts`, {
      kind: 'alert',
      createdAt: item.createdAt,
      source: 'mobile',
      payload,
    });

    if (success) {
      alertSyncedIds.push(item.id);
    }
  }

  await markAlertsSynced(alertSyncedIds);

  await insertLog(
    'info',
    `Sync completed: telemetry=${telemetrySyncedIds.length}, alerts=${alertSyncedIds.length}`,
  );

  return {
    syncedTelemetry: telemetrySyncedIds.length,
    syncedAlerts: alertSyncedIds.length,
  };
}
