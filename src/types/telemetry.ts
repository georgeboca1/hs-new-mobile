export interface EspData {
  timestamp: string;
  cpu_load?: number;
  voltage?: number;
  current_ma?: number;
  consumed_mah?: number;
  battery_life_min?: number;
  battery_pct?: number;
  state?: string;
  power_state?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ParachuteData {
  timestamp: string;
  state?: string;
  parachute?: string;
  body_position?: string;
  heart_rate?: number;
  SpO2?: number;
  temp?: number;
  temp_ext?: number;
  stress_level?: number;
  is_pulse_stable?: boolean;
  vertical_speed?: number;
  rotation?: number;
  g_force?: number;
  battery_pct?: number;
  voltage?: number;
  current_ma?: number;
  consumed_mah?: number;
  battery_life_min?: number;
  power_state?: string;
  cpu_load?: number;
  risk_score?: number;
  flags?: number;
  alert_active?: boolean;
  ax?: number;
  ay?: number;
  az?: number;
  pitch?: number;
  roll?: number;
  yaw?: number;
  [key: string]: string | number | boolean | undefined;
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
  useMockData: boolean;
  bleIdentifier: string;
  bleCharacteristicUuid: string;
  themeMode?: 'dark' | 'light';
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
