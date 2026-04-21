import MQTT, {MqttClient} from 'sp-react-native-mqtt';
import {AppSettings} from '../types/telemetry';

let client: MqttClient | null = null;
let connected = false;
let connectingPromise: Promise<void> | null = null;

function buildUri(settings: AppSettings): string {
  return `mqtt://${settings.mqttHost}:${settings.mqttPort}`;
}

export async function connectMqtt(settings: AppSettings): Promise<void> {
  if (connected) {
    return;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = MQTT.createClient({
    uri: buildUri(settings),
    clientId: `hsmobile-${Math.random().toString(16).slice(2, 10)}`,
    user: settings.mqttUser || undefined,
    pass: settings.mqttPassword || undefined,
    auth: Boolean(settings.mqttUser),
    clean: true,
    keepalive: 60,
    reconnect: true,
    tls: false,
  })
    .then(createdClient => {
      client = createdClient;

      client.on('connect', () => {
        connected = true;
      });

      client.on('closed', () => {
        connected = false;
      });

      client.on('error', () => {
        connected = false;
      });

      client.connect();
    })
    .finally(() => {
      connectingPromise = null;
    });

  return connectingPromise;
}

export function isMqttConnected(): boolean {
  return connected;
}

export async function disconnectMqtt(): Promise<void> {
  if (client) {
    client.disconnect();
    client = null;
  }
  connected = false;
}

export async function publishMqttJson(topic: string, payload: object): Promise<boolean> {
  if (!client || !connected) {
    return false;
  }

  client.publish(topic, JSON.stringify(payload), 1, false);
  return true;
}
