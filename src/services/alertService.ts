import { Alert, Vibration } from 'react-native';
import SoundPlayer from 'react-native-sound-player';
import { ParachuteData, RiskAssessment, AppSettings } from '../types/telemetry';
import { publishMqttJson, isMqttConnected } from './mqttService';

const ALERT_COOLDOWN_MS = 10000; // 10 seconds cooldown
let lastAlertTime = 0;

/**
 * Triggers a high-priority alert when a dangerous situation is detected.
 * Includes sound, vibration, visual popup, and remote notification.
 */
export async function triggerDangerAlert(
  risk: RiskAssessment, 
  data: ParachuteData, 
  settings: AppSettings | null
) {
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) {
    console.log('[AlertService] Alert suppressed due to cooldown');
    return;
  }

  lastAlertTime = now;

  console.log('[AlertService] TRIGGERING DANGER ALERT:', risk.reasons);

  // 1. Send alert to team via MQTT if connected
  if (settings && isMqttConnected()) {
    console.log('[AlertService] Sending real-time alert via MQTT to team...');
    publishMqttJson(`${settings.mqttTopic}/alerts`, {
      kind: 'emergency_alert',
      timestamp: data.timestamp || new Date().toISOString(),
      risk,
      data,
    });
  }

  // 2. Play Alert Sound
  try {
    // Attempt to play a local 'alert' file if it exists
    // Fallback to a public emergency siren if local file is missing
    SoundPlayer.playSoundFile('alert', 'mp3');
  } catch (e) {
    console.warn('[AlertService] Local alert.mp3 missing, attempting web fallback...');
    try {
      // Using a loud siren sound as a fallback
      SoundPlayer.playUrl('https://www.soundjay.com/misc/sounds/emergency-siren-01.mp3');
    } catch (urlErr) {
      console.error('[AlertService] Web sound fallback failed:', urlErr);
    }
  }

  // 3. Vibrate device with WEA-inspired cadence
  // WEA pattern: 2s on, 0.5s off, 0.5s on, 0.5s off, 0.5s on, 0.5s off
  Vibration.vibrate([0, 2000, 500, 500, 500, 500, 500, 500], false);

  // 4. Show Popup
  Alert.alert(
    '⚠️ ALERTĂ PARACUTIST',
    `SITUAȚIE PERICULOASĂ DETECTATĂ!\n\nMotiv:\n• ${risk.reasons.join('\n• ')}`,
    [{ text: 'Am înțeles', style: 'destructive' }]
  );
}
