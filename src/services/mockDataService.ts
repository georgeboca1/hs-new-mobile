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

export function generateMockEspData(parameters: PacketParameterDefinition[]): EspData {
  const payload = buildPayload(parameters);

  // Return generated values as-is. No post-processing or type coercion is applied.
  return payload as EspData;
}

export function generateMockParachuteData(parameters: PacketParameterDefinition[]): ParachuteData {
  const payload = buildPayload(parameters);

  // Return generated values as-is. No post-processing or type coercion is applied.
  return payload as ParachuteData;
}
