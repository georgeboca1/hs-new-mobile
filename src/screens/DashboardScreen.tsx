import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTelemetryStore} from '../store/useTelemetryStore';
import {colors} from '../theme/colors';

function displayValue(value: unknown): string | number {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return '-';
}

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

  const parachuteParameters = settings?.packetParameterSchemas.parachute ?? [];

  const parachuteRows = latestParachute
    ? parachuteParameters
        .map(parameter => {
          const key = parameter.name.trim();
          return {
            key,
            value: key ? latestParachute[key] : undefined,
          };
        })
        .filter(row => Boolean(row.key))
    : [];

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
          parachuteRows.length > 0 ? (
            parachuteRows.map(row => <Row key={row.key} label={row.key} value={displayValue(row.value)} />)
          ) : (
            <Text style={styles.emptyText}>No parachute parameters are configured.</Text>
          )
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
