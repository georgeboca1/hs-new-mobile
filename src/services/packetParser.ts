import { Buffer } from 'buffer';
import {
  EspData,
  PacketParameterDefinition,
  PacketParameterSchemas,
  ParsedPacket,
  ParachuteData,
} from '../types/telemetry';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getValue(payload: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (payload[key] !== undefined) {
      return payload[key];
    }
  }

  return undefined;
}

function assignNumberField(
  target: Record<string, unknown>,
  payload: Record<string, unknown>,
  targetKey: string,
  keys: string[],
  fallback?: number,
): void {
  const value = getValue(payload, keys);
  if (value !== undefined) {
    target[targetKey] = Number(value);
    return;
  }

  if (fallback !== undefined) {
    target[targetKey] = fallback;
  }
}

function assignStringField(
  target: Record<string, unknown>,
  payload: Record<string, unknown>,
  targetKey: string,
  keys: string[],
  fallback?: string,
): void {
  const value = getValue(payload, keys);
  if (value !== undefined) {
    target[targetKey] = String(value);
    return;
  }

  if (fallback !== undefined) {
    target[targetKey] = fallback;
  }
}

export function hasPacketParameterSchemaPayload(payload: unknown): boolean {
  if (Array.isArray(payload)) {
    return true;
  }

  if (!isRecord(payload)) {
    return false;
  }

  if (isRecord(payload.packetParameterSchemas)) {
    return true;
  }

  if (Array.isArray(payload.parameters) || Array.isArray(payload.fields) || Array.isArray(payload.items)) {
    return true;
  }

  if (Array.isArray(payload.esp) || Array.isArray(payload.parachute)) {
    return true;
  }

  const kind = String(payload.kind ?? payload.type ?? payload.target ?? '').trim().toLowerCase();
  return kind === 'schema' || kind === 'parameters' || kind === 'parameter-schema';
}

export function decodeBleJsonPayload(value: string | null | undefined): unknown | null {
  if (!value) {
    return null;
  }

  try {
    const raw = Buffer.from(value, 'base64').toString('utf8').trim();
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as unknown;
  } catch (error) {
    return null;
  }
}

function normalizeBodyPosition(value: unknown): ParachuteData['bodyPosition'] {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'horizontal' || normalized === 'stable') {
    return 'stable';
  }
  if (normalized === 'tilted-left' || normalized === 'tilted_left') {
    return 'tilted-left';
  }
  if (normalized === 'tilted-right' || normalized === 'tilted_right') {
    return 'tilted-right';
  }
  if (normalized === 'head-down' || normalized === 'head_down') {
    return 'head-down';
  }
  if (normalized === 'unstable') {
    return 'unstable';
  }
  return 'stable';
}

function normalizeEspPartialData(payload: Record<string, unknown>): Partial<EspData> {
  const normalized: Record<string, unknown> = { ...payload };

  // Timestamp - strictly extract from BLE payload keys
  assignStringField(normalized, payload, 'timestamp', ['timestamp', 'ts', 't']);

  // Temperature
  const tempVal = getValue(payload, ['temp', 'temperature', 'bodyTemperature', 'body_temperature']);
  if (tempVal !== undefined) {
    normalized.temp = Number(tempVal);
    normalized.temperature = Number(tempVal);
  }

  assignStringField(normalized, payload, 'ioLog', ['ioLog', 'io_log', 'log', 'l']);
  assignNumberField(normalized, payload, 'rssi', ['rssi', 'rs']);
  assignStringField(normalized, payload, 'networkName', ['networkName', 'network_name', 'net', 'n']);
  
  // CPU Load
  const cpuVal = getValue(payload, ['cpu_load', 'cpuLoad', 'cpu']);
  if (cpuVal !== undefined) {
    normalized.cpu_load = Number(cpuVal);
    normalized.cpuLoad = Number(cpuVal);
  }
  
  // Voltage
  const voltVal = getValue(payload, ['voltage', 'v']);
  if (voltVal !== undefined) {
    normalized.voltage = Number(voltVal);
  }
  
  // Current
  const currentVal = getValue(payload, ['current_ma', 'currentNow', 'current_now', 'c']);
  if (currentVal !== undefined) {
    normalized.current_ma = Number(currentVal);
    normalized.currentNow = Number(currentVal);
  }
  
  // Consumed mAh
  const consumedVal = getValue(payload, ['consumed_mah', 'currentTotal', 'current_total', 'mah', 'm']);
  if (consumedVal !== undefined) {
    normalized.consumed_mah = Number(consumedVal);
    normalized.currentTotal = Number(consumedVal);
  }
  
  // Battery Life
  const lifeVal = getValue(payload, ['battery_life_min', 'batteryLife', 'battery_life', 'bl']);
  if (lifeVal !== undefined) {
    normalized.battery_life_min = Number(lifeVal);
    normalized.batteryLife = String(lifeVal);
  }
  
  // Battery Percentage
  const batteryPctVal = getValue(payload, ['battery_pct', 'batteryPercentage', 'battery_percentage', 'bat', 'b']);
  if (batteryPctVal !== undefined) {
    normalized.battery_pct = Number(batteryPctVal);
    normalized.batteryPercentage = Number(batteryPctVal);
  }

  // State
  assignStringField(normalized, payload, 'state', ['state', 's']);
  assignStringField(normalized, payload, 'power_state', ['power_state', 'powerState', 'pw']);

  return normalized as Partial<EspData>;
}

function normalizeParachutePartialData(payload: Record<string, unknown>): Partial<ParachuteData> {
  const normalized: Record<string, unknown> = { ...payload };

  // Timestamp - strictly extract from BLE payload keys
  assignStringField(normalized, payload, 'timestamp', ['timestamp', 'ts', 't']);

  // Flight State & Parachute
  assignStringField(normalized, payload, 'state', ['state', 's']);
  assignStringField(normalized, payload, 'parachute', ['parachute', 'p']);

  const positionSource = getValue(payload, ['body_position', 'bodyPosition', 'pos', 'bp']);
  if (positionSource !== undefined) {
    normalized.body_position = normalizeBodyPosition(positionSource);
    normalized.bodyPosition = normalized.body_position;
  }

  const chuteOpenedSource = getValue(payload, ['chute_opened', 'chuteOpened', 'co']);
  if (chuteOpenedSource !== undefined) {
    normalized.chuteOpened = typeof chuteOpenedSource === 'boolean' ? chuteOpenedSource : String(chuteOpenedSource).toLowerCase() === 'true';
    normalized.parachute = normalized.chuteOpened ? 'DEPLOYED' : 'STOWED';
  }

  // Stress Level
  const stressVal = getValue(payload, ['stress_level', 'stressLevel', 'sl']);
  if (stressVal !== undefined) {
    normalized.stress_level = Number(stressVal);
    normalized.stressLevel = Number(stressVal);
  }
  
  // Temperature
  const tempVal = getValue(payload, ['temp', 'temperature', 'bodyTemperature', 'body_temperature']);
  if (tempVal !== undefined) {
    normalized.temp = Number(tempVal);
    normalized.bodyTemperature = Number(tempVal);
  }
  
  // SpO2
  const spo2Val = getValue(payload, ['SpO2', 'spo2', 'bloodOxygen', 'blood_oxygen', 'o']);
  if (spo2Val !== undefined) {
    normalized.SpO2 = Number(spo2Val);
    normalized.bloodOxygen = Number(spo2Val);
  }
  
  // Heart Rate
  const hrVal = getValue(payload, ['heart_rate', 'heartRate', 'hr', 'h']);
  if (hrVal !== undefined) {
    normalized.heart_rate = Number(hrVal);
    normalized.heartRate = Number(hrVal);
  }
  
  assignNumberField(normalized, payload, 'temp_ext', ['temp_ext', 'externalTemperature', 'te']);
  
  const pulseVal = getValue(payload, ['is_pulse_stable', 'isPulseStable', 'ps']);
  if (pulseVal !== undefined) {
    normalized.is_pulse_stable = typeof pulseVal === 'boolean' ? pulseVal : String(pulseVal).toLowerCase() === 'true';
    normalized.isPulseStable = normalized.is_pulse_stable;
  }

  // Vertical Speed
  const vsVal = getValue(payload, ['vertical_speed', 'verticalSpeed', 'vs']);
  if (vsVal !== undefined) {
    normalized.vertical_speed = Number(vsVal);
    normalized.verticalSpeed = Number(vsVal);
  }
  
  // Rotation
  const rotVal = getValue(payload, ['rotation', 'rotation_rate', 'rotationRate', 'r']);
  if (rotVal !== undefined) {
    normalized.rotation = Number(rotVal);
    normalized.rotationRate = Number(rotVal);
  }
  
  // G Force
  const gVal = getValue(payload, ['g_force', 'gForce', 'g']);
  if (gVal !== undefined) {
    normalized.g_force = Number(gVal);
    normalized.gForce = Number(gVal);
  }
  
  // Battery Percentage
  const batVal = getValue(payload, ['battery_pct', 'batteryPercentage', 'battery_percentage', 'bat', 'b']);
  if (batVal !== undefined) {
    normalized.battery_pct = Number(batVal);
    normalized.batteryPercentage = Number(batVal);
  }

  // Voltage & Current (Some devices might send these in parachute packets too)
  assignNumberField(normalized, payload, 'voltage', ['voltage', 'v']);
  
  const currentVal = getValue(payload, ['current_ma', 'currentNow', 'current_now', 'c']);
  if (currentVal !== undefined) {
    normalized.current_ma = Number(currentVal);
    normalized.currentNow = Number(currentVal);
  }

  assignNumberField(normalized, payload, 'movementIndex', ['movementIndex', 'movement_index', 'mi']);
  assignNumberField(normalized, payload, 'altitude', ['altitude', 'alt', 'a']);
  assignNumberField(normalized, payload, 'risk_score', ['risk_score', 'riskScore', 'rs']);
  assignNumberField(normalized, payload, 'flags', ['flags', 'f']);

  // IMU Data
  assignNumberField(normalized, payload, 'ax', ['ax', 'accel_x', 'accelX']);
  assignNumberField(normalized, payload, 'ay', ['ay', 'accel_y', 'accelY']);
  assignNumberField(normalized, payload, 'az', ['az', 'accel_z', 'accelZ']);
  assignNumberField(normalized, payload, 'gx', ['gx', 'gyro_x', 'gyroX']);
  assignNumberField(normalized, payload, 'gy', ['gy', 'gyro_y', 'gyroY']);
  assignNumberField(normalized, payload, 'gz', ['gz', 'gyro_z', 'gyroZ']);

  const alertVal = getValue(payload, ['alert_active', 'alertActive', 'aa']);
  if (alertVal !== undefined) {
    normalized.alert_active = typeof alertVal === 'boolean' ? alertVal : String(alertVal).toLowerCase() === 'true';
  }

  return normalized as Partial<ParachuteData>;
}

function looksLikeEspData(payload: Record<string, unknown>): boolean {
  return (
    'temp' in payload ||
    'temperature' in payload ||
    'cpu_load' in payload ||
    'cpuLoad' in payload ||
    'cpu' in payload ||
    'voltage' in payload ||
    'v' in payload ||
    'current_ma' in payload ||
    'currentNow' in payload ||
    'current_now' in payload ||
    'c' in payload ||
    'consumed_mah' in payload ||
    'currentTotal' in payload ||
    'mah' in payload ||
    'm' in payload ||
    'battery_pct' in payload ||
    'batteryPercentage' in payload ||
    'bat' in payload ||
    'b' in payload ||
    'battery_life_min' in payload ||
    'batteryLife' in payload ||
    'bl' in payload ||
    'network_name' in payload ||
    'networkName' in payload ||
    'net' in payload ||
    'n' in payload ||
    'rssi' in payload ||
    'rs' in payload ||
    'io_log' in payload ||
    'ioLog' in payload ||
    'log' in payload ||
    'l' in payload
  );
}

function looksLikeParachuteData(payload: Record<string, unknown>): boolean {
  return (
    'body_position' in payload ||
    'bodyPosition' in payload ||
    'pos' in payload ||
    'bp' in payload ||
    'heart_rate' in payload ||
    'heartRate' in payload ||
    'hr' in payload ||
    'h' in payload ||
    'SpO2' in payload ||
    'spo2' in payload ||
    'o' in payload ||
    'vertical_speed' in payload ||
    'verticalSpeed' in payload ||
    'vs' in payload ||
    'rotation' in payload ||
    'rotation_rate' in payload ||
    'r' in payload ||
    'stress_level' in payload ||
    'stressLevel' in payload ||
    'sl' in payload ||
    'g_force' in payload ||
    'gForce' in payload ||
    'g' in payload ||
    'state' in payload ||
    's' in payload ||
    'parachute' in payload ||
    'p' in payload ||
    'chute_opened' in payload ||
    'co' in payload ||
    'alert_active' in payload ||
    'aa' in payload ||
    'risk_score' in payload ||
    'rs' in payload
  );
}

function normalizeTelemetryPacket(payload: unknown): ParsedPacket | null {
  if (!isRecord(payload)) {
    return null;
  }

  const data = isRecord(payload.payload)
    ? payload.payload
    : isRecord(payload.data)
      ? payload.data
      : payload;
  const kind = String(payload.kind ?? '').trim().toLowerCase();

  if (kind === 'esp' || looksLikeEspData(data)) {
    const normalized = normalizeEspPartialData(data);
    if (normalized.timestamp) {
      return { kind: 'esp', payload: normalized as EspData };
    }
  }

  if (kind === 'parachute' || looksLikeParachuteData(data)) {
    const normalized = normalizeParachutePartialData(data);
    if (normalized.timestamp) {
      return { kind: 'parachute', payload: normalized as ParachuteData };
    }
  }

  return null;
}

function sanitizeParameterDefinition(value: unknown): PacketParameterDefinition | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = String(value.name ?? '').trim();
  if (!name) {
    return null;
  }

  const typeValue = String(value.type ?? 'number').trim().toLowerCase();
  const type =
    typeValue === 'integer' ||
      typeValue === 'boolean' ||
      typeValue === 'string' ||
      typeValue === 'enum' ||
      typeValue === 'isoDate'
      ? (typeValue as PacketParameterDefinition['type'])
      : 'number';

  const id = String(value.id ?? name)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  const definition: PacketParameterDefinition = {
    id: id || `param-${name.toLowerCase()}`,
    name,
    type,
  };

  if (typeof value.enumValues === 'string' && value.enumValues.trim()) {
    definition.enumValues = value.enumValues.trim();
  }

  return definition;
}

function sanitizeSchema(values: unknown): PacketParameterDefinition[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const definitions: PacketParameterDefinition[] = [];

  for (const value of values) {
    const definition = sanitizeParameterDefinition(value);
    if (!definition) {
      continue;
    }

    const key = definition.name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    definitions.push(definition);
  }

  return definitions;
}

export function normalizeTelemetryPayload(payload: unknown): ParsedPacket | null {
  return normalizeTelemetryPacket(payload);
}

/**
 * Normalizes partial telemetry data (accumulated from multiple BLE messages)
 * Attempts to determine the packet kind based on available fields
 * Returns null if the partial data doesn't contain enough information to identify the kind
 */
export function normalizePartialTelemetryPayload(partial: Record<string, unknown>): ParsedPacket | null {
  if (!isRecord(partial) || Object.keys(partial).length === 0) {
    return null;
  }

  // Try to determine the kind based on which fields we have
  if (looksLikeEspData(partial)) {
    const normalized = normalizeEspPartialData(partial);
    if (normalized.timestamp) {
      return { kind: 'esp', payload: normalized as EspData };
    }
  }

  if (looksLikeParachuteData(partial)) {
    const normalized = normalizeParachutePartialData(partial);
    if (normalized.timestamp) {
      return { kind: 'parachute', payload: normalized as ParachuteData };
    }
  }

  // If we can't determine the kind yet or don't have a timestamp, return null
  return null;
}

export function normalizePacketParameterSchemas(
  payload: unknown,
  fallback: PacketParameterSchemas,
): PacketParameterSchemas {
  if (Array.isArray(payload)) {
    return {
      esp: fallback.esp,
      parachute: sanitizeSchema(payload),
    };
  }

  if (!isRecord(payload)) {
    return fallback;
  }

  const nestedSchemas = isRecord(payload.packetParameterSchemas) ? payload.packetParameterSchemas : payload;
  const esp = sanitizeSchema(nestedSchemas.esp);
  const parachute = sanitizeSchema(nestedSchemas.parachute);

  if (esp.length === 0 && parachute.length === 0) {
    const parameters = sanitizeSchema(payload.parameters ?? payload.fields ?? payload.items);
    if (parameters.length > 0) {
      const kind = String(payload.kind ?? payload.target ?? '').trim().toLowerCase();
      return {
        esp: kind === 'esp' ? parameters : fallback.esp,
        parachute: kind === 'esp' ? fallback.parachute : parameters,
      };
    }

    return fallback;
  }

  return {
    esp: esp.length > 0 ? esp : fallback.esp,
    parachute: parachute.length > 0 ? parachute : fallback.parachute,
  };
}
