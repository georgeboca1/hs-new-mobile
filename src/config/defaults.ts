import {AppSettings} from '../types/telemetry';

export const DEFAULT_SETTINGS: AppSettings = {
  mqttHost: 'broker.hivemq.com',
  mqttPort: 1883,
  mqttUser: '',
  mqttPassword: '',
  mqttTopic: 'hs/parachute/team-alpha',
  espPacketHeaderHex: 'A1B2',
  parachutePacketHeaderHex: 'C3D4',
  useMockData: true,
  bleServiceUuid: '0000FFE0-0000-1000-8000-00805F9B34FB',
  bleCharacteristicUuid: '0000FFE1-0000-1000-8000-00805F9B34FB',
};

export const SYNC_INTERVAL_MS = 20000;
export const MOCK_INTERVAL_MS = 1200;
