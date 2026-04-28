import NetInfo from '@react-native-community/netinfo';
import {AppSettings} from '../types/telemetry';
import {
  clearAllData,
  getAllDatabaseContent,
  insertLog,
} from './databaseService';
import {
  connectMqtt,
  isMqttConnected,
  publishMqttJson,
  subscribeMqtt,
  waitForMqttMessage,
} from './mqttService';

export async function syncNow(settings: AppSettings): Promise<boolean> {
  const netState = await NetInfo.fetch();
  const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

  if (!isOnline) {
    await insertLog('warn', 'Sync failed: No internet connection');
    return false;
  }

  try {
    // 1. Prepare data
    const content = await getAllDatabaseContent();
    
    // 2. Connect and subscribe
    await connectMqtt(settings);
    if (!isMqttConnected()) {
      await insertLog('error', 'Sync failed: MQTT could not connect');
      return false;
    }

    const responseTopic = `${settings.mqttTopic}/response`;
    subscribeMqtt(responseTopic);

    // 3. Start waiting BEFORE publishing to avoid race condition
    console.log('[Sync] Setting up listener for server confirmation on:', responseTopic);
    const confirmationPromise = waitForMqttMessage(
      responseTopic,
      (msg) => {
        try {
          const parsed = JSON.parse(msg);
          return parsed.status === 'ok';
        } catch {
          // Fallback for non-JSON or partial matches
          const cleaned = msg.replace(/\s/g, '').toLowerCase();
          return cleaned.includes('status:ok') || cleaned.includes('"status":"ok"');
        }
      },
      5000,
    );

    // 4. Publish entire content
    console.log('[Sync] Publishing entire database content...');
    const publishSuccess = await publishMqttJson(settings.mqttTopic, {
      kind: 'sync_full',
      source: 'mobile',
      ...content,
    });

    if (!publishSuccess) {
      await insertLog('error', 'Sync failed: MQTT publish failed');
      return false;
    }

    // 5. Wait for the confirmation we already started listening for
    const confirmed = await confirmationPromise;

    if (confirmed) {
      console.log('[Sync] Server confirmed receipt. Clearing database...');
      await clearAllData();
      await insertLog('info', 'Sync successful: Database cleared');
      return true;
    } else {
      console.warn('[Sync] No confirmation from server within timeout');
      await insertLog('error', 'Sync failed: No confirmation from server');
      return false;
    }
  } catch (err) {
    console.error('[Sync] Unexpected error during sync:', err);
    await insertLog('error', 'Sync failed: Internal error', String(err));
    return false;
  }
}
