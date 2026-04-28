import { ParachuteData, RiskAssessment } from '../types/telemetry';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return fallback;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

export function evaluateRisk(data: ParachuteData): RiskAssessment {
  // Extract parameters with fallbacks, supporting both snake_case and camelCase
  const verticalSpeed = asNumber(data.vertical_speed ?? data.verticalSpeed, 0);
  const rotationRate = asNumber(data.rotation ?? data.rotationRate, 0);
  const movementIndex = asNumber(data.movementIndex ?? data.movement_index, 1); // Default to 1 (moving)
  const heartRate = asNumber(data.heart_rate ?? data.heartRate, 80);
  const stressLevel = asNumber(data.stress_level ?? data.stressLevel, 0);
  const chuteOpened = asBoolean(data.chuteOpened ?? (data.parachute === 'DEPLOYED'), false);
  const bodyPosition = asString(data.body_position ?? data.bodyPosition, 'stable');
  const bloodOxygen = asNumber(data.SpO2 ?? data.bloodOxygen, 98);

  // 1. Detectare situații periculoase
  // Cădere necontrolată: parașuta nu e deschisă și viteza verticală e mare negativă (coborâre rapidă)
  const uncontrolledFall = !chuteOpened && verticalSpeed < -15;
  // Rotație excesivă: rata de rotație absolută peste prag (tumble)
  const excessiveRotation = Math.abs(rotationRate) > 250;
  // Lipsă mișcare: index de mișcare foarte mic (posibilă inconștiență)
  const lackOfMovement = movementIndex < 0.05;

  // 2. Analiză fiziologică
  const abnormalHeartRate = heartRate < 40 || heartRate > 180;
  const highStress = stressLevel > 80;

  // 3. Predicție
  const abnormalAirBehavior =
    uncontrolledFall || 
    excessiveRotation || 
    bodyPosition === 'unstable' || 
    bodyPosition === 'head-down';

  // Calculate risk score (0-100)
  let score = 0;
  const reasons: string[] = [];

  if (uncontrolledFall) {
    score += 45;
    reasons.push('Cădere necontrolată detectată');
  }
  if (excessiveRotation) {
    score += 35;
    reasons.push('Rotație excesivă detectată');
  }
  if (lackOfMovement) {
    score += 30;
    reasons.push('Lipsă mișcare (posibilă inconștiență)');
  }
  if (abnormalHeartRate) {
    score += 15;
    reasons.push('Puls anormal detectat');
  }
  if (highStress) {
    score += 10;
    reasons.push('Stres ridicat detectat');
  }
  if (bloodOxygen < 90) {
    score += 10;
    reasons.push('Nivel scăzut de oxigen (SpO2)');
  }

  // Critical combinations that immediately spike risk to maximum
  if (uncontrolledFall && excessiveRotation) {
    score = 100;
  }
  if (uncontrolledFall && lackOfMovement) {
    score = 100;
  }

  const accidentRiskScore = clamp(score, 0, 100);
  
  // Alert if risk is high or specific critical conditions are met
  const shouldAlert = accidentRiskScore >= 70 || uncontrolledFall || (lackOfMovement && !chuteOpened);

  return {
    uncontrolledFall,
    excessiveRotation,
    lackOfMovement,
    abnormalHeartRate,
    highStress,
    abnormalAirBehavior,
    accidentRiskScore,
    shouldAlert,
    reasons,
  };
}
