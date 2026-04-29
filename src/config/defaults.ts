import { AppSettings, PacketParameterDefinition } from '../types/telemetry';

export const DEFAULT_ESP_PACKET_PARAMETERS: PacketParameterDefinition[] = [
  { id: 'esp-timestamp', name: 'timestamp', type: 'isoDate' },
  { id: 'esp-cpu-load', name: 'cpu_load', type: 'number' },
  { id: 'esp-voltage', name: 'voltage', type: 'number' },
  { id: 'esp-current-ma', name: 'current_ma', type: 'number' },
  { id: 'esp-consumed-mah', name: 'consumed_mah', type: 'number' },
  { id: 'esp-battery-life-min', name: 'battery_life_min', type: 'number' },
  { id: 'esp-battery-pct', name: 'battery_pct', type: 'number' },
  { id: 'esp-state', name: 'state', type: 'string' },
  { id: 'esp-power-state', name: 'power_state', type: 'string' },
];

export const DEFAULT_PARACHUTE_PACKET_PARAMETERS: PacketParameterDefinition[] = [
  { id: 'para-device-id', name: 'device_id', type: 'string' },
  { id: 'para-timestamp', name: 'timestamp', type: 'integer' },
  { id: 'para-state', name: 'state', type: 'string' },
  { id: 'para-parachute', name: 'parachute', type: 'string' },
  { id: 'para-body-position', name: 'body_position', type: 'string' },
  { id: 'para-heart-rate', name: 'heart_rate', type: 'integer' },
  { id: 'para-spo2', name: 'SpO2', type: 'number' },
  { id: 'para-temp', name: 'temp', type: 'number' },
  { id: 'para-temp-ext', name: 'temp_ext', type: 'number' },
  { id: 'para-stress-level', name: 'stress_level', type: 'number' },
  { id: 'para-pulse-stable', name: 'is_pulse_stable', type: 'boolean' },
  { id: 'para-vertical-speed', name: 'vertical_speed', type: 'number' },
  { id: 'para-rotation', name: 'rotation', type: 'number' },
  { id: 'para-g-force', name: 'g_force', type: 'number' },
  { id: 'para-battery-pct', name: 'battery_pct', type: 'number' },
  { id: 'para-voltage', name: 'voltage', type: 'number' },
  { id: 'para-current-ma', name: 'current_ma', type: 'number' },
  { id: 'para-consumed-mah', name: 'consumed_mah', type: 'number' },
  { id: 'para-battery-life-min', name: 'battery_life_min', type: 'number' },
  { id: 'para-power-state', name: 'power_state', type: 'string' },
  { id: 'para-cpu-load', name: 'cpu_load', type: 'number' },
  { id: 'para-risk-score', name: 'risk_score', type: 'number' },
  { id: 'para-flags', name: 'flags', type: 'integer' },
  { id: 'para-alert-active', name: 'alert_active', type: 'boolean' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  mqttHost: 'broker.hivemq.com',
  mqttPort: 1883,
  mqttUser: '',
  mqttPassword: '',
  mqttTopic: 'hs/parachute/team-alpha',
  useMockData: true,
  bleIdentifier: 'f8e2f200-bf43-4ccf-a52b-5f9d9cd10001',
  bleCharacteristicUuid: 'f8e2f201-bf43-4ccf-a52b-5f9d9cd10001',
  themeMode: 'dark',
  packetParameterSchemas: {
    esp: DEFAULT_ESP_PACKET_PARAMETERS,
    parachute: DEFAULT_PARACHUTE_PACKET_PARAMETERS,
  },
};

export const SYNC_INTERVAL_MS = 20000;
export const MOCK_INTERVAL_MS = 100;
