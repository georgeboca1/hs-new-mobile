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
  const chuteOpened = asBoolean(data.chuteOpened);
  const verticalSpeed = asNumber(data.verticalSpeed);
  const rotationRate = asNumber(data.rotationRate);
  const movementIndex = asNumber(data.movementIndex);
  const heartRate = asNumber(data.heartRate);
  const stressLevel = asNumber(data.stressLevel);
  const bloodOxygen = asNumber(data.bloodOxygen);
  const gForce = asNumber(data.gForce);
  const bodyPosition = asString(data.bodyPosition);

  const uncontrolledFall = !chuteOpened && verticalSpeed < -12;
  const excessiveRotation = rotationRate > 210;
  const lackOfMovement = movementIndex < 0.08;
  const abnormalHeartRate = heartRate < 45 || heartRate > 170;
  const highStress = stressLevel > 75;
  const abnormalAirBehavior =
    uncontrolledFall || excessiveRotation || bodyPosition === 'unstable' || bodyPosition === 'head-down';

  let score = 0;
  if (uncontrolledFall) {
    score += 35;
  }
  if (excessiveRotation) {
    score += 20;
  }
  if (lackOfMovement) {
    score += 20;
  }
  if (abnormalHeartRate) {
    score += 12;
  }
  if (highStress) {
    score += 8;
  }
  if (bloodOxygen < 90) {
    score += 10;
  }
  if (gForce > 3.5) {
    score += 10;
  }

  const accidentRiskScore = clamp(score, 0, 100);
  const reasons: string[] = [];

  if (uncontrolledFall) {
    reasons.push('Uncontrolled fall detected');
  }
  if (excessiveRotation) {
    reasons.push('Excessive rotation detected');
  }
  if (lackOfMovement) {
    reasons.push('Low movement, possible unconsciousness');
  }
  if (abnormalHeartRate) {
    reasons.push('Abnormal heart rate');
  }
  if (highStress) {
    reasons.push('High stress level');
  }
  if (bloodOxygen < 90) {
    reasons.push('Low blood oxygen level');
  }
  if (gForce > 3.5) {
    reasons.push('Potential impact-level g-force');
  }

  const shouldAlert = accidentRiskScore >= 70 || (uncontrolledFall && excessiveRotation) || reasons.length >= 3;

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
