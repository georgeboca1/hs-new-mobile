import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTelemetryStore} from '../store/useTelemetryStore';
import {colors} from '../theme/colors';

function Row({label, value}: {label: string; value: string | number}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function DashboardScreen(): React.JSX.Element {
  const {
    settings,
    telemetryRunning,
    internetConnected,
    latestParachute,
    risk,
    mqttLastSyncAt,
    triggerSync,
  } = useTelemetryStore();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Parachutist Safety Monitor</Text>
        <Text style={styles.heroSubtitle}>Live telemetry + on-device danger prediction + offline-first MQTT sync.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection Status</Text>
        <Row label="Data mode" value={settings?.useMockData ? 'Mock' : 'Real BLE'} />
        <Row label="Telemetry stream" value={telemetryRunning ? 'Running' : 'Stopped'} />
        <Row label="Internet" value={internetConnected ? 'Connected' : 'Offline'} />
        <Row label="Last sync" value={mqttLastSyncAt || 'Not synced yet'} />

        <View style={styles.actionsRow}>
          <Pressable style={styles.syncButton} onPress={() => triggerSync()}>
            <Text style={styles.buttonText}>Sync Now</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Parachute + AI Safety</Text>
        {latestParachute ? (
          <>
            <Row label="Parachute" value={latestParachute.chuteOpened ? 'Opened' : 'Closed'} />
            <Row label="Body position" value={latestParachute.bodyPosition} />
            <Row label="Heart rate" value={`${latestParachute.heartRate} bpm`} />
            <Row label="Stress level" value={`${latestParachute.stressLevel.toFixed(2)} %`} />
            <Row label="SpO2" value={`${latestParachute.bloodOxygen.toFixed(2)} %`} />
            <Row label="Vertical speed" value={`${latestParachute.verticalSpeed.toFixed(2)} m/s`} />
            <Row label="Rotation" value={`${latestParachute.rotationRate.toFixed(2)} deg/s`} />
            <Row label="Altitude" value={`${latestParachute.altitude.toFixed(2)} m`} />
            <Row label="G-force" value={`${latestParachute.gForce.toFixed(2)} g`} />
          </>
        ) : (
          <Text style={styles.emptyText}>No parachute data yet.</Text>
        )}

        {risk ? (
          <View style={[styles.riskBanner, risk.shouldAlert ? styles.riskHigh : styles.riskNormal]}>
            <Text style={styles.riskTitle}>Accident risk score: {risk.accidentRiskScore}</Text>
            <Text style={styles.riskText}>{risk.reasons.join(' | ') || 'No anomalies detected'}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neonGlow,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: 4,
  },
  rowLabel: {
    color: colors.textSecondary,
  },
  rowValue: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  syncButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.neonSecondary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
  },
  riskBanner: {
    marginTop: 10,
    borderRadius: 10,
    padding: 10,
  },
  riskNormal: {
    backgroundColor: '#132A23',
    borderWidth: 1,
    borderColor: colors.success,
  },
  riskHigh: {
    backgroundColor: '#2D1320',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  riskTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  riskText: {
    color: colors.textSecondary,
    marginTop: 4,
  },
});
