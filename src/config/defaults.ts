import {AppSettings, PacketParameterDefinition} from '../types/telemetry';

export const DEFAULT_ESP_PACKET_PARAMETERS: PacketParameterDefinition[] = [
  {id: 'esp-temperature', name: 'temperature', type: 'number'},
  {id: 'esp-io-log', name: 'ioLog', type: 'string'},
  {id: 'esp-timestamp', name: 'timestamp', type: 'isoDate'},
  {id: 'esp-rssi', name: 'rssi', type: 'integer'},
  {id: 'esp-network-name', name: 'networkName', type: 'string'},
  {id: 'esp-cpu-load', name: 'cpuLoad', type: 'number'},
  {id: 'esp-voltage', name: 'voltage', type: 'number'},
  {id: 'esp-current-now', name: 'currentNow', type: 'number'},
  {id: 'esp-current-total', name: 'currentTotal', type: 'number'},
  {id: 'esp-battery-life', name: 'batteryLife', type: 'string'},
  {id: 'esp-battery-percentage', name: 'batteryPercentage', type: 'number'},
];

export const DEFAULT_PARACHUTE_PACKET_PARAMETERS: PacketParameterDefinition[] = [
  {id: 'para-timestamp', name: 'timestamp', type: 'isoDate'},
  {id: 'para-chute-opened', name: 'chuteOpened', type: 'boolean'},
  {
    id: 'para-body-position',
    name: 'bodyPosition',
    type: 'enum',
    enumValues: 'stable, tilted-left, tilted-right, head-down, unstable',
  },
  {id: 'para-stress-level', name: 'stressLevel', type: 'number'},
  {id: 'para-body-temperature', name: 'bodyTemperature', type: 'number'},
  {id: 'para-blood-oxygen', name: 'bloodOxygen', type: 'number'},
  {id: 'para-heart-rate', name: 'heartRate', type: 'integer'},
  {id: 'para-vertical-speed', name: 'verticalSpeed', type: 'number'},
  {id: 'para-rotation-rate', name: 'rotationRate', type: 'number'},
  {id: 'para-movement-index', name: 'movementIndex', type: 'number'},
  {id: 'para-altitude', name: 'altitude', type: 'number'},
  {id: 'para-g-force', name: 'gForce', type: 'number'},
  {id: 'para-battery-percentage', name: 'batteryPercentage', type: 'number'},
];

export const DEFAULT_SETTINGS: AppSettings = {
  mqttHost: 'broker.hivemq.com',
  mqttPort: 1883,
  mqttUser: '',
  mqttPassword: '',
  mqttTopic: 'hs/parachute/team-alpha',
  espPacketHeaderHex: 'A1B2',
  parachutePacketHeaderHex: 'C3D4',
  useMockData: true,
  bleServiceUuid: 'f8e2f200-bf43-4ccf-a52b-5f9d9cd10001',
  bleTelemetryUuid: 'f8e2f201-bf43-4ccf-a52b-5f9d9cd10001',
  bleHealthUuid: 'f8e2f202-bf43-4ccf-a52b-5f9d9cd10001',
  bleDebugJsonUuid: 'f8e2f203-bf43-4ccf-a52b-5f9d9cd10001',
  packetParameterSchemas: {
    esp: DEFAULT_ESP_PACKET_PARAMETERS,
    parachute: DEFAULT_PARACHUTE_PACKET_PARAMETERS,
  },
};

export const SYNC_INTERVAL_MS = 20000;
export const MOCK_INTERVAL_MS = 1200;
