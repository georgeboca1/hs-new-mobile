export interface EspData {
  temperature: number;
  ioLog: string;
  timestamp: string;
  rssi: number;
  networkName: string;
  cpuLoad: number;
  voltage: number;
  currentNow: number;
  currentTotal: number;
  batteryLife: string;
  batteryPercentage: number;
  [key: string]: string | number | boolean;
}

export interface ParachuteData {
  timestamp: string;
  chuteOpened: boolean;
  bodyPosition: 'stable' | 'tilted-left' | 'tilted-right' | 'head-down' | 'unstable';
  stressLevel: number;
  bodyTemperature: number;
  bloodOxygen: number;
  heartRate: number;
  verticalSpeed: number;
  rotationRate: number;
  movementIndex: number;
  altitude: number;
  gForce: number;
  batteryPercentage: number;
  [key: string]: string | number | boolean;
}

export type MockParameterType = 'number' | 'integer' | 'boolean' | 'string' | 'enum' | 'isoDate';

export interface PacketParameterDefinition {
  id: string;
  name: string;
  type: MockParameterType;
  enumValues?: string;
}

export interface PacketParameterSchemas {
  esp: PacketParameterDefinition[];
  parachute: PacketParameterDefinition[];
}

export interface RiskAssessment {
  uncontrolledFall: boolean;
  excessiveRotation: boolean;
  lackOfMovement: boolean;
  abnormalHeartRate: boolean;
  highStress: boolean;
  abnormalAirBehavior: boolean;
  accidentRiskScore: number;
  shouldAlert: boolean;
  reasons: string[];
}

export type TelemetryKind = 'esp' | 'parachute';

export interface ParsedPacket {
  kind: TelemetryKind;
  payload: EspData | ParachuteData;
}

export interface AppSettings {
  mqttHost: string;
  mqttPort: number;
  mqttUser: string;
  mqttPassword: string;
  mqttTopic: string;
  espPacketHeaderHex: string;
  parachutePacketHeaderHex: string;
  useMockData: boolean;
  bleServiceUuid: string;
  bleTelemetryUuid: string;
  bleHealthUuid: string;
  bleDebugJsonUuid: string;
  packetParameterSchemas: PacketParameterSchemas;
}

export interface QueueRow {
  id: number;
  kind: TelemetryKind;
  payload: string;
  createdAt: string;
}

export interface AlertRow {
  id: number;
  payload: string;
  createdAt: string;
}

export interface AppLog {
  id: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  context: string;
  createdAt: string;
}
