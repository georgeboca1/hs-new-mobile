import {Buffer} from 'buffer';
import {PermissionsAndroid, Platform} from 'react-native';
import {
  BleManager,
  Characteristic,
  Device,
  Subscription,
} from 'react-native-ble-plx';
import {AppSettings, ParsedPacket} from '../types/telemetry';
import {parsePacketsFromChunk} from './packetParser';

type PacketCallback = (packet: ParsedPacket) => void;
type LogCallback = (level: 'info' | 'warn' | 'error', message: string, context?: string) => void;
const BLE_CONNECT_TIMEOUT_MS = 12000;

const manager = new BleManager();
let monitorSub: Subscription | null = null;
let currentDevice: Device | null = null;
let carry: Uint8Array<ArrayBufferLike> = new Uint8Array(0);

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

function handleCharacteristic(
  characteristic: Characteristic,
  settings: AppSettings,
  onPacket: PacketCallback,
): void {
  if (!characteristic.value) {
    return;
  }

  const raw = Buffer.from(characteristic.value, 'base64');
  const chunk = new Uint8Array(raw);
  const parsed = parsePacketsFromChunk(chunk, carry, settings);
  carry = parsed.remaining;

  parsed.packets.forEach(packet => onPacket(packet));
}

function selectDevice(device: Device, settings: AppSettings): boolean {
  const deviceName = device.name?.toLowerCase() ?? '';
  const localName = device.localName?.toLowerCase() ?? '';
  const hasEspName = deviceName.includes('esp') || localName.includes('esp');
  const serviceMatch =
    device.serviceUUIDs?.some(uuid => uuid.toLowerCase() === settings.bleServiceUuid.toLowerCase()) ?? false;

  return hasEspName || serviceMatch;
}

export async function startBleIngestion(
  settings: AppSettings,
  onPacket: PacketCallback,
  onLog: LogCallback,
): Promise<boolean> {
  const granted = await requestAndroidPermissions();
  if (!granted) {
    onLog('error', 'BLE permissions were not granted');
    return false;
  }

  carry = new Uint8Array(0);

  return new Promise(resolve => {
    let settled = false;

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

      if (!scannedDevice || !selectDevice(scannedDevice, settings)) {
        return;
      }

      manager.stopDeviceScan();

      try {
        currentDevice = await scannedDevice.connect();
        await currentDevice.discoverAllServicesAndCharacteristics();

        monitorSub = currentDevice.monitorCharacteristicForService(
          settings.bleServiceUuid,
          settings.bleCharacteristicUuid,
          (monitorError, characteristic) => {
            if (monitorError) {
              onLog('error', 'BLE monitor error', String(monitorError));
              return;
            }

            if (characteristic) {
              handleCharacteristic(characteristic, settings, onPacket);
            }
          },
        );

        onLog('info', 'BLE connected', currentDevice.id);
        finish(true);
      } catch (connectionError) {
        onLog('error', 'BLE connection failed', String(connectionError));
        finish(false);
      }
    });
  });
}

export async function stopBleIngestion(): Promise<void> {
  monitorSub?.remove();
  monitorSub = null;

  if (currentDevice) {
    try {
      await currentDevice.cancelConnection();
    } catch {
      // Ignore disconnect errors when the device is already disconnected.
    }
  }

  currentDevice = null;
  manager.stopDeviceScan();
}
