import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { AppColors, useAppColors } from '../theme/colors';
import { DASHBOARD_PARAMETERS } from '../config/parameterDisplayConfig';

function displayValue(value: unknown, unit?: string): string {
  if (typeof value === 'number') {
    const numeric = Number.isInteger(value) ? String(value) : value.toFixed(2);
    return unit === '%' ? `${numeric}%` : numeric;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return '-';
}

function Row({ label, value, unit, colors }: { label: string; value: string | number; unit?: string; colors: AppColors }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{displayValue(value, unit)}</Text>
    </View>
  );
}

function buildDashboardRows(payload: Record<string, unknown> | null): Array<{ key: string; label: string; value: unknown; unit?: string }> {
  if (!payload) {
    return [];
  }

  return DASHBOARD_PARAMETERS.map(param => ({
    key: param.key,
    label: param.label,
    value: payload[param.key],
    unit: param.unit,
  })).filter(row => row.value !== undefined);
}

export function DashboardScreen(): React.JSX.Element {
  const colors = useAppColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    settings,
    telemetryRunning,
    internetConnected,
    latestEsp,
    latestParachute,
    risk,
    mqttLastSyncAt,
    triggerSync,
  } = useTelemetryStore();

  const dashboardRows = buildDashboardRows(latestEsp || latestParachute);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Parachutist Safety Monitor</Text>
        <Text style={styles.heroSubtitle}>Live telemetry + on-device danger prediction + offline-first MQTT sync.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection Status</Text>
        <Row label="Data mode" value={settings?.useMockData ? 'Mock' : 'Real BLE'} colors={colors} />
        <Row label="Telemetry stream" value={telemetryRunning ? 'Running' : 'Stopped'} colors={colors} />
        <Row label="Internet" value={internetConnected ? 'Connected' : 'Offline'} colors={colors} />
        <Row label="Last sync" value={mqttLastSyncAt || 'Not synced yet'} colors={colors} />

        <View style={styles.actionsRow}>
          <Pressable style={styles.syncButton} onPress={() => triggerSync()}>
            <Text style={styles.buttonText}>Sync Now</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dashboard Telemetry</Text>
        {latestEsp || latestParachute ? (
          dashboardRows.length > 0 ? (
            dashboardRows.map(row => <Row key={row.key} label={row.label} value={row.value as string | number} colors={colors} />)
          ) : (
            <Text style={styles.emptyText}>No dashboard data received yet.</Text>
          )
        ) : (
          <Text style={styles.emptyText}>No telemetry data yet.</Text>
        )}
      </View>

      {risk ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Safety Assessment</Text>
          <View style={[styles.riskBanner, risk.shouldAlert ? styles.riskHigh : styles.riskNormal]}>
            <Text style={styles.riskTitle}>Accident risk score: {risk.accidentRiskScore}</Text>
            <Text style={styles.riskText}>{risk.reasons.join(' | ') || 'No anomalies detected'}</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
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
