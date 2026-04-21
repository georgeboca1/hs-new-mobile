import {EspData, ParachuteData} from '../types/telemetry';

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function generateMockEspData(): EspData {
  const battery = randomBetween(30, 100);
  return {
    temperature: Number(randomBetween(28, 41).toFixed(2)),
    ioLog: 'MOCK_SIGNAL_OK',
    timestamp: new Date().toISOString(),
    rssi: Math.round(randomBetween(-85, -45)),
    networkName: 'mock-net',
    cpuLoad: Number(randomBetween(12, 92).toFixed(2)),
    voltage: Number(randomBetween(3.4, 4.2).toFixed(2)),
    currentNow: Number(randomBetween(0.1, 1.6).toFixed(2)),
    currentTotal: Number(randomBetween(30, 600).toFixed(2)),
    batteryLife: `${Math.round(battery / 4)}h estimated`,
    batteryPercentage: Number(battery.toFixed(2)),
  };
}

const POSITIONS: ParachuteData['bodyPosition'][] = [
  'stable',
  'tilted-left',
  'tilted-right',
  'head-down',
  'unstable',
];

export function generateMockParachuteData(): ParachuteData {
  const risky = Math.random() < 0.18;
  const chuteOpened = Math.random() > 0.2;

  return {
    timestamp: new Date().toISOString(),
    chuteOpened,
    bodyPosition: POSITIONS[Math.floor(randomBetween(0, POSITIONS.length))],
    stressLevel: Number((risky ? randomBetween(75, 96) : randomBetween(25, 72)).toFixed(2)),
    bodyTemperature: Number(randomBetween(35.5, 38.2).toFixed(2)),
    bloodOxygen: Number((risky ? randomBetween(85, 95) : randomBetween(96, 100)).toFixed(2)),
    heartRate: Math.round(risky ? randomBetween(145, 190) : randomBetween(70, 138)),
    verticalSpeed: Number((risky ? randomBetween(-48, -18) : randomBetween(-16, -4)).toFixed(2)),
    rotationRate: Number((risky ? randomBetween(190, 360) : randomBetween(20, 145)).toFixed(2)),
    movementIndex: Number((risky ? randomBetween(0.01, 0.1) : randomBetween(0.25, 1.4)).toFixed(3)),
    altitude: Number(randomBetween(350, 4100).toFixed(2)),
    gForce: Number((risky ? randomBetween(2.3, 5.8) : randomBetween(0.9, 2.1)).toFixed(2)),
    batteryPercentage: Number(randomBetween(20, 100).toFixed(2)),
  };
}
