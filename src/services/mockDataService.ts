import {
  EspData,
  MockParameterType,
  PacketParameterDefinition,
  ParachuteData,
} from '../types/telemetry';

type MockValue = string | number | boolean;

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.round(randomBetween(min, max));
}

function parseEnumValues(raw?: string): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function generateTypedMockValue(type: MockParameterType, name: string, enumValues?: string): MockValue {
  if (type === 'boolean') {
    return Math.random() > 0.5;
  }

  if (type === 'isoDate') {
    return new Date().toISOString();
  }

  if (type === 'enum') {
    const options = parseEnumValues(enumValues);
    if (options.length === 0) {
      return 'unknown';
    }
    return options[Math.floor(randomBetween(0, options.length))];
  }

  if (type === 'string') {
    return `${name || 'field'}-${randomInt(100, 999)}`;
  }

  if (type === 'integer') {
    return randomInt(0, 100);
  }

  return Number(randomBetween(0, 100).toFixed(2));
}

function buildPayload(parameters: PacketParameterDefinition[]): Record<string, MockValue> {
  const payload: Record<string, MockValue> = {};

  for (const parameter of parameters) {
    const name = parameter.name.trim();
    if (!name) {
      continue;
    }

    payload[name] = generateTypedMockValue(parameter.type, name, parameter.enumValues);
  }

  return payload;
}

function mapBodyPosition(value: unknown): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'horizontal') {
    return 'stable';
  }
  if (normalized === 'head_down' || normalized === 'head-down') {
    return 'head-down';
  }
  if (normalized === 'tilted_left' || normalized === 'tilted-left') {
    return 'tilted-left';
  }
  if (normalized === 'tilted_right' || normalized === 'tilted-right') {
    return 'tilted-right';
  }
  if (normalized === 'unstable') {
    return 'unstable';
  }
  return 'stable';
}

function enrichParachuteAliases(payload: Record<string, MockValue>): Record<string, MockValue> {
  const enriched: Record<string, MockValue> = { ...payload };

  if (typeof payload.body_position === 'string') {
    enriched.bodyPosition = mapBodyPosition(payload.body_position);
  }

  if (typeof payload.heart_rate === 'number') {
    enriched.heartRate = payload.heart_rate;
  }

  if (typeof payload.SpO2 === 'number') {
    enriched.bloodOxygen = payload.SpO2;
  }

  if (typeof payload.temp === 'number') {
    enriched.bodyTemperature = payload.temp;
  }

  if (typeof payload.stress_level === 'number') {
    enriched.stressLevel = payload.stress_level;
  }

  if (typeof payload.is_pulse_stable === 'boolean') {
    enriched.isPulseStable = payload.is_pulse_stable;
  }

  if (typeof payload.vertical_speed === 'number') {
    enriched.verticalSpeed = payload.vertical_speed;
  }

  if (typeof payload.rotation === 'number') {
    enriched.rotationRate = payload.rotation;
  }

  if (typeof payload.g_force === 'number') {
    enriched.gForce = payload.g_force;
  }

  if (typeof payload.battery_pct === 'number') {
    enriched.batteryPercentage = payload.battery_pct;
  }

  if (typeof payload.parachute === 'string' || typeof payload.state === 'string') {
    const parachute = String(payload.parachute ?? '').trim().toUpperCase();
    const state = String(payload.state ?? '').trim().toUpperCase();
    const chuteOpened = parachute.includes('OPEN') || parachute.includes('DEPLOY');
    enriched.chuteOpened = state === 'IN_AIR' || state === 'FALLING' ? true : chuteOpened;
  }

  if (typeof payload.risk_score === 'number') {
    enriched.riskScore = payload.risk_score;
  }

  if (typeof payload.alert_active === 'boolean') {
    enriched.alertActive = payload.alert_active;
  }

  if (typeof enriched.movementIndex !== 'number') {
    enriched.movementIndex = 0.5;
  }

  if (typeof enriched.altitude !== 'number') {
    enriched.altitude = 0;
  }

  return enriched;
}

export function generateMockEspData(): EspData {
  return {
    timestamp: new Date().toLocaleTimeString('en-GB'),
    cpu_load: randomBetween(10, 85),
    voltage: randomBetween(3.7, 4.2),
    current_ma: randomBetween(50, 450),
    consumed_mah: randomInt(10, 2000),
    battery_life_min: randomInt(30, 240),
    battery_pct: randomInt(5, 100),
    state: Math.random() > 0.8 ? 'STANDBY' : 'RUNNING',
    power_state: 'BATTERY',
  };
}

export function generateMockParachuteData(): ParachuteData {
  const flightStates = ['STANDBY', 'ASCENDING', 'IN_AIR', 'FALLING', 'DEPLOYED', 'LANDED'];
  const bodyPositions = ['stable', 'head-down', 'tilted-left', 'tilted-right', 'unstable'];

  const state = flightStates[Math.floor(Math.random() * flightStates.length)];
  const isFalling = state === 'FALLING' || state === 'DEPLOYED';
  
  // Sometimes force a dangerous situation for testing (15% chance)
  const forceDanger = Math.random() > 0.85;

  return {
    timestamp: new Date().toLocaleTimeString('en-GB'),
    state,
    parachute: state === 'DEPLOYED' ? 'DEPLOYED' : 'STOWED',
    body_position: forceDanger ? 'unstable' : bodyPositions[Math.floor(Math.random() * bodyPositions.length)],
    heart_rate: forceDanger ? randomInt(185, 205) : randomInt(60, 160),
    SpO2: forceDanger ? randomBetween(85, 91) : randomBetween(94, 99),
    temp: randomBetween(36.1, 37.8),
    temp_ext: randomBetween(15, 25),
    stress_level: forceDanger ? randomBetween(85, 98) : randomBetween(10, 95),
    is_pulse_stable: Math.random() > 0.1,
    vertical_speed: forceDanger ? randomBetween(-60, -30) : (isFalling ? randomBetween(-50, -10) : randomBetween(0, 10)),
    rotation: forceDanger ? randomBetween(260, 450) : randomBetween(0, 180),
    g_force: randomBetween(0.8, 4.5),
    battery_pct: randomInt(10, 100),
    voltage: randomBetween(3.7, 4.2),
    current_ma: randomBetween(10, 100),
    consumed_mah: randomInt(0, 500),
    battery_life_min: randomInt(60, 600),
    power_state: 'ACTIVE',
    cpu_load: randomBetween(5, 40),
    risk_score: randomBetween(0, 100),
    flags: randomInt(0, 255),
    alert_active: Math.random() > 0.9,
    movementIndex: forceDanger ? randomBetween(0, 0.04) : randomBetween(0.1, 0.9),
  };
}
