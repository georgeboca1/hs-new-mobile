import {ParachuteData, RiskAssessment} from '../types/telemetry';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function evaluateRisk(data: ParachuteData): RiskAssessment {
  const uncontrolledFall = !data.chuteOpened && data.verticalSpeed < -12;
  const excessiveRotation = data.rotationRate > 210;
  const lackOfMovement = data.movementIndex < 0.08;
  const abnormalHeartRate = data.heartRate < 45 || data.heartRate > 170;
  const highStress = data.stressLevel > 75;
  const abnormalAirBehavior =
    uncontrolledFall || excessiveRotation || data.bodyPosition === 'unstable' || data.bodyPosition === 'head-down';

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
  if (data.bloodOxygen < 90) {
    score += 10;
  }
  if (data.gForce > 3.5) {
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
  if (data.bloodOxygen < 90) {
    reasons.push('Low blood oxygen level');
  }
  if (data.gForce > 3.5) {
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
