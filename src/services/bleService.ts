import {PermissionsAndroid, Platform} from 'react-native';
import {Buffer} from 'buffer';
import {
  BleManager,
  Characteristic,
  Device,
  Subscription,
} from 'react-native-ble-plx';
import {AppSettings, ParsedPacket} from '../types/telemetry';
import {
  decodeBleJsonPayload,
  hasPacketParameterSchemaPayload,
  normalizePacketParameterSchemas,
  normalizeTelemetryPayload,
  normalizePartialTelemetryPayload,
} from './packetParser';
import {accumulatePartialPacket} from './partialPacketAccumulator';

type PacketCallback = (packet: ParsedPacket) => void;
type SchemaCallback = (schemas: AppSettings['packetParameterSchemas']) => void;
type LogCallback = (level: 'info' | 'warn' | 'error', message: string, context?: string) => void;
const BLE_CONNECT_TIMEOUT_MS = 12000;

const manager = new BleManager();
let monitorSub: Subscription | null = null;
let currentDevice: Device | null = null;

async function requestAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version < 31) {
    const coarse = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    return coarse === PermissionsAndroid.RESULTS.GRANTED;
  }

  const statuses = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);

  return (
    statuses[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
    statuses[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
  );
}

function selectDevice(device: Device, settings: AppSettings): boolean {
  const deviceName = device.name?.toLowerCase() ?? '';
  const localName = device.localName?.toLowerCase() ?? '';
  const serviceMatch =
    device.serviceUUIDs?.some(uuid => uuid.toLowerCase() === settings.bleIdentifier.toLowerCase()) ?? false;

  return Boolean(deviceName || localName || serviceMatch);
}

function getConfiguredCharacteristics(settings: AppSettings): string[] {
  return [settings.bleCharacteristicUuid]
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

async function hasConfiguredNotificationTargets(device: Device, settings: AppSettings): Promise<boolean> {
  const serviceUUID = settings.bleIdentifier.toLowerCase();
  const characteristicUUIDs = getConfiguredCharacteristics(settings);

  try {
    const services = await device.services();
    console.log('[BLE] Available services:', services.map(s => s.uuid));
    const matchingService = services.find(service => service.uuid.toLowerCase() === serviceUUID);

    if (!matchingService) {
      console.warn('[BLE] Service not found:', {
        looking_for: serviceUUID,
        available: services.map(s => s.uuid),
      });
      return false;
    }

    const characteristics = await device.characteristicsForService(serviceUUID);
    console.log('[BLE] Available characteristics for service:', {
      service: serviceUUID,
      characteristics: characteristics.map(c => c.uuid),
    });

    const found = characteristicUUIDs.every(uuid => {
      const exists = characteristics.some(characteristic => characteristic.uuid.toLowerCase() === uuid);
      console.log('[BLE] Characteristic check:', {uuid, exists});
      return exists;
    });

    return found;
  } catch (error) {
    console.error('[BLE] Error checking characteristics:', String(error));
    return false;
  }
}

function handleCharacteristicValue(
  characteristic: Characteristic,
  settings: AppSettings,
  onPacket: PacketCallback,
  onSchemaUpdate: SchemaCallback,
  onLog: LogCallback,
): void {
  const rawValue = characteristic.value;
  console.log('[BLE] Characteristic received:', {
    uuid: characteristic.uuid,
    rawLength: rawValue?.length ?? 0,
    rawValue: rawValue?.substring(0, 100),
  });

  const payload = decodeBleJsonPayload(rawValue);
  if (payload === null) {
    console.warn('[BLE] Failed to decode payload. Raw value:', rawValue?.substring(0, 200));
    onLog('warn', 'BLE payload decode failed', `uuid: ${characteristic.uuid}`);
    return;
  }

  console.log('[BLE] Decoded payload:', JSON.stringify(payload).substring(0, 200));

  // Check if this is a schema update payload
  if (hasPacketParameterSchemaPayload(payload)) {
    console.log('[BLE] Processing schema update');
    onSchemaUpdate(normalizePacketParameterSchemas(payload, settings.packetParameterSchemas));
    return;
  }

  // All telemetry objects should go through the accumulator to ensure fields
  // from multiple partial JSON messages are correctly merged.
  if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
    console.log('[BLE] Accumulating telemetry fields:', Object.keys(payload));
    accumulatePartialPacket(
      undefined, // Let accumulator auto-detect the kind
      payload as Record<string, unknown>,
      onPacket,
      normalizePartialTelemetryPayload,
    );
  } else {
    console.warn('[BLE] Payload is not a valid object:', typeof payload);
    onLog('warn', 'BLE payload is not an object', `type: ${typeof payload}`);
  }
}

export async function startBleIngestion(
  settings: AppSettings,
  onPacket: PacketCallback,
  onSchemaUpdate: SchemaCallback,
  onLog: LogCallback,
): Promise<boolean> {
  const granted = await requestAndroidPermissions();
  if (!granted) {
    onLog('error', 'BLE permissions were not granted');
    return false;
  }

  return new Promise(resolve => {
    let settled = false;
    let connecting = false;

    const finish = (result: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutHandle);
      if (!result) {
        manager.stopDeviceScan();
      }
      resolve(result);
    };

    const timeoutHandle = setTimeout(() => {
      onLog('warn', 'BLE connection timeout: no compatible device found');
      finish(false);
    }, BLE_CONNECT_TIMEOUT_MS);

    manager.startDeviceScan(null, {allowDuplicates: false}, async (error, scannedDevice) => {
      if (settled) {
        return;
      }

      if (error) {
        onLog('error', 'BLE scan failed', String(error));
        finish(false);
        return;
      }

      if (connecting || !scannedDevice || !selectDevice(scannedDevice, settings)) {
        return;
      }

      connecting = true;

      try {
        currentDevice = await scannedDevice.connect();
        await currentDevice.discoverAllServicesAndCharacteristics();

        console.log('[BLE] Connected and services discovered');
        console.log('[BLE] Looking for:', {
          serviceUUID: settings.bleIdentifier,
          characteristicUUIDs: getConfiguredCharacteristics(settings),
        });

        // Request larger MTU to prevent payload truncation
        try {
          const mtuResult = await currentDevice.requestMTU(517);
          console.log('[BLE] MTU response:', mtuResult);
          const mtuValue = typeof mtuResult === 'number' ? mtuResult : (mtuResult as any)?.mtu ?? 512;
          onLog('info', 'MTU negotiated', `${mtuValue} bytes`);
        } catch (mtuError) {
          console.error('[BLE] MTU error:', mtuError);
          onLog('warn', 'MTU negotiation failed, continuing with default', String(mtuError));
        }

        const hasTarget = await hasConfiguredNotificationTargets(currentDevice, settings);
        if (!hasTarget) {
          onLog(
            'error',
            'BLE device does not expose the configured identifier/characteristic',
            `${settings.bleIdentifier}/${getConfiguredCharacteristics(settings).join(',')}`,
          );
          await currentDevice.cancelConnection();
          currentDevice = null;
          connecting = false;
          return;
        }

        const connectedDevice = currentDevice;
        if (!connectedDevice) {
          onLog('error', 'BLE connection lost before monitors were created');
          connecting = false;
          finish(false);
          return;
        }

        manager.stopDeviceScan();

        const monitorSubscriptions = getConfiguredCharacteristics(settings).map(characteristicUuid =>
          connectedDevice.monitorCharacteristicForService(settings.bleIdentifier, characteristicUuid, (monitorError, characteristic) => {
            if (monitorError) {
              onLog('error', 'BLE monitor error', `${characteristicUuid}: ${String(monitorError)}`);
              return;
            }

            if (characteristic) {
              handleCharacteristicValue(characteristic, settings, onPacket, onSchemaUpdate, onLog);
            }
          }),
        );

        monitorSub = {
          remove: () => {
            monitorSubscriptions.forEach(subscription => subscription.remove());
          },
        };

        onLog('info', 'BLE connected', currentDevice.id);
        finish(true);
      } catch (connectionError) {
        onLog('error', 'BLE connection failed', String(connectionError));
        connecting = false;
        finish(false);
      }
    });
  });
}

export async function stopBleIngestion(settings?: AppSettings): Promise<void> {
  monitorSub?.remove();
  monitorSub = null;

  if (currentDevice) {
    // Try to inform the device about our intent to disconnect so it can react if needed
    if (settings) {
      const serviceUUID = settings.bleIdentifier;
      const characteristicUUIDs = getConfiguredCharacteristics(settings);
      const payload = Buffer.from(JSON.stringify({command: 'disconnect'}), 'utf8').toString('base64');
      for (const charUuid of characteristicUUIDs) {
        try {
          // best-effort write; ignore failures
          // @ts-ignore: react-native-ble-plx types
          await currentDevice.writeCharacteristicWithResponseForService(serviceUUID, charUuid, payload);
        } catch (err) {
          console.warn('[BLE] Failed to send disconnect command', {charUuid, err});
        }
      }
    }

    try {
      await currentDevice.cancelConnection();
    } catch {
      // Ignore disconnect errors when the device is already disconnected.
    }
  }

  currentDevice = null;
  manager.stopDeviceScan();
}
