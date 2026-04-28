import {EspData, ParachuteData, ParsedPacket, TelemetryKind} from '../types/telemetry';

type PacketCallback = (packet: ParsedPacket) => void;

interface PartialBuffer {
  kind: TelemetryKind | 'unknown';
  accumulated: Partial<EspData | ParachuteData>;
  lastUpdateTime: number;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
}

const PARTIAL_PACKET_TIMEOUT_MS = 1000; // Flush partial packets if no updates for 1 second
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
  };
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
    console.log('[PartialAccumulator] Timeout flushing buffer:', bufferKey);
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

  console.log('[PartialAccumulator] Flushing buffer:', {
    key: bufferKey,
    fieldCount: Object.keys(buffer.accumulated).length,
    fields: Object.keys(buffer.accumulated),
  });

  const packet = normalizer(buffer.accumulated);
  if (packet) {
    console.log('[PartialAccumulator] Emitting normalized packet:', {kind: packet.kind, timestamp: (packet.payload as any).timestamp});
    callback(packet);
    // NOTE: Do NOT clear accumulated data here. We preserve it so that
    // subsequent partial updates can retain previously received field values.
    // This is important for MTU-limited JSON where fields arrive across multiple messages.
  } else {
    console.warn('[PartialAccumulator] Failed to normalize accumulated data:', JSON.stringify(buffer.accumulated).substring(0, 100));
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
 */
export function accumulatePartialPacket(
  kind: TelemetryKind | undefined,
  partialData: Record<string, unknown>,
  callback: PacketCallback,
  normalizer: (data: Partial<EspData | ParachuteData>) => ParsedPacket | null,
): void {
  // Determine which buffer to use
  const bufferKey = kind || 'unknown';
  let buffer = buffers.get(bufferKey);

  if (!buffer) {
    buffer = {
      kind: bufferKey,
      accumulated: {},
      lastUpdateTime: Date.now(),
      timeoutHandle: null,
    };
    buffers.set(bufferKey, buffer);
  }

  console.log('[PartialAccumulator] Received partial update:', {
    bufferKey,
    newFields: Object.keys(partialData),
    totalFields: Object.keys(buffer.accumulated).length,
  });

  buffer.accumulated = mergePartialUpdate(buffer.accumulated, partialData);
  buffer.lastUpdateTime = Date.now();

  // Try to normalize to see if we now have a valid packet
  const packet = normalizer(buffer.accumulated);
  if (packet) {
    if (!kind) {
      // We determined the kind! Move the data from 'unknown' to the specific kind buffer
      console.log('[PartialAccumulator] Determined packet kind:', packet.kind);
      clearBufferTimeout(buffer);
      buffers.delete('unknown');
      
      // Accumulate in the correct kind buffer
      accumulatePartialPacket(packet.kind, buffer.accumulated, callback, normalizer);
      return;
    }

    // Emit the valid packet immediately for responsiveness
    callback(packet);
  }

  // Schedule timeout flush just in case no more updates arrive for a while
  scheduleBufferFlush(bufferKey, buffer, callback, normalizer);
}

