import {EspData, ParachuteData, ParsedPacket, TelemetryKind} from '../types/telemetry';

type PacketCallback = (packet: ParsedPacket) => void;

interface PartialBuffer {
  kind: TelemetryKind | 'unknown';
  accumulated: Partial<EspData | ParachuteData>;
  lastUpdateTime: number;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
}

const PARTIAL_PACKET_TIMEOUT_MS = 50; // Flush partial packets after a short delay if no more fields arrive
const buffers: Map<TelemetryKind | 'unknown', PartialBuffer> = new Map();

/**
 * Merges partial field updates into accumulated data
 * @param accumulated The previously accumulated data
 * @param partial The new partial fields to merge
 * @returns The merged result
 */
function mergePartialUpdate(
  accumulated: Partial<EspData | ParachuteData>,
  partial: Record<string, unknown>,
): Partial<EspData | ParachuteData> {
  return {
    ...accumulated,
    ...partial,
  } as Partial<EspData | ParachuteData>;
}

/**
 * Clears any pending timeout for a buffer
 */
function clearBufferTimeout(buffer: PartialBuffer): void {
  if (buffer.timeoutHandle !== null) {
    clearTimeout(buffer.timeoutHandle);
    buffer.timeoutHandle = null;
  }
}

/**
 * Schedules a timeout to flush the buffer if no new updates arrive
 */
function scheduleBufferFlush(
  bufferKey: TelemetryKind | 'unknown',
  buffer: PartialBuffer,
  callback: PacketCallback,
  normalizer: (data: Partial<EspData | ParachuteData>) => ParsedPacket | null,
): void {
  clearBufferTimeout(buffer);

  buffer.timeoutHandle = setTimeout(() => {
    flushBuffer(bufferKey, callback, normalizer);
  }, PARTIAL_PACKET_TIMEOUT_MS);
}

/**
 * Flushes the accumulated buffer and emits the packet if valid
 * Preserves accumulated data for field retention across multiple partial updates
 */
function flushBuffer(
  bufferKey: TelemetryKind | 'unknown',
  callback: PacketCallback,
  normalizer: (data: Partial<EspData | ParachuteData>) => ParsedPacket | null,
): void {
  const buffer = buffers.get(bufferKey);
  if (!buffer || Object.keys(buffer.accumulated).length === 0) {
    return;
  }

  clearBufferTimeout(buffer);

  const packet = normalizer(buffer.accumulated);
  if (packet) {
    callback(packet);
    // NOTE: Do NOT clear accumulated data here. We preserve it so that
    // subsequent partial updates can retain previously received field values.
    // This is important for MTU-limited JSON where fields arrive across multiple messages.
  } else {
    // Failed to normalize
  }
}

/**
 * Processes a partial packet update
 * If kind is provided, accumulates in the specific kind buffer
 * Otherwise tries to determine kind and accumulates accordingly
 *
 * @param kind The packet kind (esp, parachute, or undefined for auto-detect)
 * @param partialData The partial fields received
 * @param callback The callback to invoke when packet is ready to emit
 * @param normalizer A function to normalize and validate the accumulated data
 * @param sourceId Optional identifier for the source (e.g. characteristic UUID) to prevent collision in 'unknown' state
 */
export function accumulatePartialPacket(
  kind: TelemetryKind | undefined,
  partialData: Record<string, unknown>,
  callback: PacketCallback,
  normalizer: (data: Partial<EspData | ParachuteData>) => ParsedPacket | null,
  sourceId?: string,
): void {
  // Determine which buffer to use
  const bufferKey = kind || (sourceId ? `unknown-${sourceId}` : 'unknown');
  let buffer = buffers.get(bufferKey);

  if (!buffer) {
    buffer = {
      kind: kind || 'unknown',
      accumulated: {},
      lastUpdateTime: Date.now(),
      timeoutHandle: null,
    };
    buffers.set(bufferKey, buffer);
  }

  buffer.accumulated = mergePartialUpdate(buffer.accumulated, partialData);
  buffer.lastUpdateTime = Date.now();

  // Try to normalize to see if we now have a valid packet
  const packet = normalizer(buffer.accumulated);
  if (packet) {
    if (!kind) {
      // We determined the kind! Move the data from 'unknown' to the specific kind buffer
      clearBufferTimeout(buffer);
      buffers.delete(bufferKey);
      
      // Accumulate in the correct kind buffer
      accumulatePartialPacket(packet.kind, buffer.accumulated, callback, normalizer);
      return;
    }

    // Emit the valid packet immediately for responsiveness
    callback(packet);
    
    // Clear timeout and return; we just emitted a full packet, so no need to flush.
    // We keep buffer.accumulated for subsequent partial updates (field retention).
    clearBufferTimeout(buffer);
    return;
  }

  // Only schedule timeout flush if we HAVEN'T just emitted a valid packet
  scheduleBufferFlush(bufferKey, buffer, callback, normalizer);
}

/**
 * Clears all accumulated buffers. Call this on disconnect or stop.
 */
export function clearAccumulatedBuffers(): void {
  for (const buffer of buffers.values()) {
    clearBufferTimeout(buffer);
  }
  buffers.clear();
}

