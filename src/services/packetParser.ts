import {Buffer} from 'buffer';
import {AppSettings, EspData, ParachuteData, ParsedPacket} from '../types/telemetry';

export interface PacketParseResult {
  packets: ParsedPacket[];
  remaining: Uint8Array<ArrayBufferLike>;
}

function sanitizeHex(value: string): string {
  return value.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
}

function hexToBytes(hex: string): number[] {
  const normalized = sanitizeHex(hex);
  if (normalized.length < 2 || normalized.length % 2 !== 0) {
    return [];
  }

  const bytes: number[] = [];
  for (let i = 0; i < normalized.length; i += 2) {
    bytes.push(parseInt(normalized.slice(i, i + 2), 16));
  }

  return bytes;
}

function startsWithAt(
  buffer: Uint8Array<ArrayBufferLike>,
  offset: number,
  expected: number[],
): boolean {
  if (expected.length === 0 || offset + expected.length > buffer.length) {
    return false;
  }

  for (let i = 0; i < expected.length; i += 1) {
    if (buffer[offset + i] !== expected[i]) {
      return false;
    }
  }

  return true;
}

function mergeBytes(
  left: Uint8Array<ArrayBufferLike>,
  right: Uint8Array<ArrayBufferLike>,
): Uint8Array<ArrayBufferLike> {
  const merged = new Uint8Array(left.length + right.length);
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
}

function normalizeEspData(payload: Record<string, unknown>): EspData {
  const nowIso = new Date().toISOString();
  return {
    temperature: Number(payload.temperature ?? 0),
    ioLog: String(payload.io_log ?? ''),
    timestamp: String(payload.timestamp ?? nowIso),
    rssi: Number(payload.rssi ?? 0),
    networkName: String(payload.network_name ?? ''),
    cpuLoad: Number(payload.cpu_load ?? 0),
    voltage: Number(payload.voltage ?? 0),
    currentNow: Number(payload.current_now ?? 0),
    currentTotal: Number(payload.current_total ?? 0),
    batteryLife: String(payload.battery_life ?? ''),
    batteryPercentage: Number(payload.battery_percentage ?? 0),
  };
}

function normalizeParachuteData(payload: Record<string, unknown>): ParachuteData {
  const nowIso = new Date().toISOString();
  const pos = String(payload.bodyPosition ?? payload.body_position ?? 'stable');

  return {
    timestamp: String(payload.timestamp ?? nowIso),
    chuteOpened: Boolean(payload.chuteOpened ?? payload.chute_opened ?? false),
    bodyPosition:
      pos === 'tilted-left' ||
      pos === 'tilted-right' ||
      pos === 'head-down' ||
      pos === 'unstable'
        ? pos
        : 'stable',
    stressLevel: Number(payload.stressLevel ?? payload.stress_level ?? 0),
    bodyTemperature: Number(payload.bodyTemperature ?? payload.body_temperature ?? 0),
    bloodOxygen: Number(payload.bloodOxygen ?? payload.blood_oxygen ?? 0),
    heartRate: Number(payload.heartRate ?? payload.heart_rate ?? 0),
    verticalSpeed: Number(payload.verticalSpeed ?? payload.vertical_speed ?? 0),
    rotationRate: Number(payload.rotationRate ?? payload.rotation_rate ?? 0),
    movementIndex: Number(payload.movementIndex ?? payload.movement_index ?? 0),
    altitude: Number(payload.altitude ?? 0),
    gForce: Number(payload.gForce ?? payload.g_force ?? 1),
    batteryPercentage: Number(payload.batteryPercentage ?? payload.battery_percentage ?? 0),
  };
}

function findHeaderStart(
  buffer: Uint8Array<ArrayBufferLike>,
  from: number,
  headers: number[][],
): number {
  for (let index = from; index < buffer.length; index += 1) {
    if (headers.some(header => startsWithAt(buffer, index, header))) {
      return index;
    }
  }

  return -1;
}

function parsePayload(rawText: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

export function parsePacketsFromChunk(
  chunk: Uint8Array<ArrayBufferLike>,
  carry: Uint8Array<ArrayBufferLike>,
  settings: AppSettings,
): PacketParseResult {
  const espHeader = hexToBytes(settings.espPacketHeaderHex);
  const parachuteHeader = hexToBytes(settings.parachutePacketHeaderHex);
  const headers = [espHeader, parachuteHeader].filter(h => h.length > 0);

  if (headers.length === 0) {
    return {packets: [], remaining: new Uint8Array(0)};
  }

  const buffer = mergeBytes(carry, chunk);
  const packets: ParsedPacket[] = [];
  let cursor = 0;

  while (cursor < buffer.length) {
    const start = findHeaderStart(buffer, cursor, headers);
    if (start < 0) {
      break;
    }

    const isEsp = startsWithAt(buffer, start, espHeader);
    const selectedHeader = isEsp ? espHeader : parachuteHeader;

    if (start + selectedHeader.length + 2 > buffer.length) {
      cursor = start;
      break;
    }

    const payloadLength =
      buffer[start + selectedHeader.length] * 256 +
      buffer[start + selectedHeader.length + 1];

    const payloadStart = start + selectedHeader.length + 2;
    const payloadEnd = payloadStart + payloadLength;

    if (payloadEnd > buffer.length) {
      cursor = start;
      break;
    }

    const payloadRaw = Buffer.from(buffer.slice(payloadStart, payloadEnd)).toString('utf8').trim();
    const payload = parsePayload(payloadRaw);

    if (payload) {
      packets.push({
        kind: isEsp ? 'esp' : 'parachute',
        payload: isEsp ? normalizeEspData(payload) : normalizeParachuteData(payload),
      });
    }

    cursor = payloadEnd;
  }

  return {
    packets,
    remaining: buffer.slice(cursor),
  };
}

export function parseHexReplayData(hexText: string, settings: AppSettings): ParsedPacket[] {
  const clean = sanitizeHex(hexText);
  if (!clean || clean.length % 2 !== 0) {
    return [];
  }

  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }

  return parsePacketsFromChunk(bytes, new Uint8Array(0), settings).packets;
}
