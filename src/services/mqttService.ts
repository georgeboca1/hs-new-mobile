import './mqttPolyfill';
import {NativeModules} from 'react-native';
import MQTT, {MqttClient} from 'sp-react-native-mqtt';
import {AppSettings} from '../types/telemetry';

let client: MqttClient | null = null;
let connected = false;
let connectingPromise: Promise<void> | null = null;

function buildUri(settings: AppSettings): string {
  const isTls = settings.mqttPort === 8883 || settings.mqttHost.includes('hivemq.cloud');
  const protocol = isTls ? 'mqtts' : 'mqtt';
  return `${protocol}://${settings.mqttHost}:${settings.mqttPort}`;
}

export async function connectMqtt(settings: AppSettings): Promise<void> {
  if (connected && client) {
    return;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = new Promise<void>(async (resolve, reject) => {
    try {
      const uri = buildUri(settings);
      const isTls = uri.startsWith('mqtts');
      
      console.log('[MQTT] Creating client for:', uri, isTls ? '(TLS enabled)' : '');
      const createdClient = await MQTT.createClient({
        uri,
        clientId: `hsmobile-${Math.random().toString(16).slice(2, 10)}`,
        user: settings.mqttUser || undefined,
        pass: settings.mqttPassword || undefined,
        auth: Boolean(settings.mqttUser),
        clean: true,
        keepalive: 60,
        reconnect: true,
        tls: isTls,
      });

      client = createdClient;

      const timeout = setTimeout(() => {
        console.warn('[MQTT] Connection timeout');
        reject(new Error('MQTT connection timeout'));
      }, 10000);

      client.on('connect', () => {
        clearTimeout(timeout);
        console.log('[MQTT] Connected successfully');
        connected = true;
        resolve();
      });

      client.on('closed', () => {
        console.log('[MQTT] Connection closed');
        connected = false;
      });

      client.on('error', (msg: string) => {
        console.error('[MQTT] Error:', msg);
        connected = false;
        clearTimeout(timeout);
        reject(new Error(msg));
      });

      console.log('[MQTT] Initiating connection...');
      client.connect();
    } catch (err) {
      console.error('[MQTT] Failed to initialize MQTT client:', err);
      reject(err);
    }
  }).finally(() => {
    connectingPromise = null;
  });

  return connectingPromise;
}

export function isMqttConnected(): boolean {
  return connected;
}

export async function disconnectMqtt(): Promise<void> {
  if (client) {
    console.log('[MQTT] Disconnecting...');
    client.disconnect();
    client = null;
  }
  connected = false;
}

export async function publishMqttJson(topic: string, payload: object): Promise<boolean> {
  if (!client || !connected) {
    console.warn('[MQTT] Cannot publish: not connected');
    return false;
  }

  try {
    client.publish(topic, JSON.stringify(payload), 1, false);
    return true;
  } catch (err) {
    console.error('[MQTT] Publish failed:', err);
    return false;
  }
}
