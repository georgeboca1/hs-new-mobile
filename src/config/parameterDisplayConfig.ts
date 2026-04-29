/**
 * Hardcoded parameter display configuration for dashboard and telemetry tabs
 * Maps internal parameter names to user-friendly display names
 */

export interface ParameterDisplay {
  key: string;
  label: string;
  unit?: string;
}

export const DASHBOARD_PARAMETERS: ParameterDisplay[] = [
  { key: 'device_id', label: 'Device ID' },
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'state', label: 'Flight State' },
  { key: 'parachute', label: 'Parachute Status' },
  { key: 'body_position', label: 'Body Position' },
  { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
  { key: 'SpO2', label: 'Blood Oxygen', unit: '%' },
  { key: 'temp', label: 'Body Temperature', unit: '°C' },
  { key: 'stress_level', label: 'Stress Level', unit: '%' },
  { key: 'is_pulse_stable', label: 'Pulse Stable' },
  { key: 'vertical_speed', label: 'Vertical Speed', unit: 'm/s' },
  { key: 'rotation', label: 'Rotation Rate', unit: 'dps' },
  { key: 'g_force', label: 'G-Force', unit: 'G' },
  { key: 'pitch', label: 'Pitch', unit: '°' },
  { key: 'roll', label: 'Roll', unit: '°' },
  { key: 'yaw', label: 'Yaw', unit: '°' },
  { key: 'ax', label: 'Accel X', unit: 'G' },
  { key: 'ay', label: 'Accel Y', unit: 'G' },
  { key: 'az', label: 'Accel Z', unit: 'G' },
];

export const TELEMETRY_PARAMETERS: ParameterDisplay[] = [
  { key: 'battery_pct', label: 'Battery Percentage', unit: '%' },
  { key: 'voltage', label: 'Voltage', unit: 'V' },
  { key: 'current_ma', label: 'Current Now', unit: 'mA' },
  { key: 'consumed_mah', label: 'Consumed Energy', unit: 'mAh' },
  { key: 'battery_life_min', label: 'Battery Life Estimate', unit: 'minutes' },
  { key: 'power_state', label: 'Power State' },
  { key: 'cpu_load', label: 'CPU Load', unit: '%' },
  { key: 'risk_score', label: 'Risk Score' },
  { key: 'alert_active', label: 'Alert Active' },
  { key: 'temp_ext', label: 'External Temperature', unit: '°C' },
  { key: 'ax', label: 'Accel X', unit: 'G' },
  { key: 'ay', label: 'Accel Y', unit: 'G' },
  { key: 'az', label: 'Accel Z', unit: 'G' },
];

/**
 * Get the unit for a parameter if available
 */
export function getParameterUnit(key: string, parameters: ParameterDisplay[] = DASHBOARD_PARAMETERS): string | undefined {
  const param = parameters.find(p => p.key === key);
  return param?.unit;
}
