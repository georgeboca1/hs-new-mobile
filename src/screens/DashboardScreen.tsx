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

function StatusIndicator({ label, active, colors }: { label: string; active: boolean; colors: AppColors }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.indicatorWrapper}>
      <View style={[styles.indicatorDot, active ? styles.indicatorDotActive : styles.indicatorDotInactive]} />
      <Text style={styles.indicatorLabel}>{label}</Text>
    </View>
  );
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detailed Risk Assessment</Text>
        
        <View style={styles.riskScoreContainer}>
          <View style={styles.riskScoreCircle}>
            <Text style={styles.riskScoreValue}>{risk.accidentRiskScore}</Text>
            <Text style={styles.riskScoreLabel}>RISK SCORE</Text>
          </View>
          <View style={styles.riskStatusContainer}>
             <View style={[styles.statusBadge, risk.shouldAlert ? styles.statusBadgeDanger : styles.statusBadgeSafe]}>
                <Text style={styles.statusBadgeText}>{risk.shouldAlert ? 'DANGER' : 'SAFE'}</Text>
             </View>
             <Text style={styles.riskSummaryText}>
               {risk.reasons.length > 0 
                 ? `${risk.reasons.length} threats detected` 
                 : 'All systems nominal'}
             </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Dangerous Situations</Text>
        <View style={styles.statusGrid}>
          <StatusIndicator label="Uncontrolled Fall" active={risk.uncontrolledFall} colors={colors} />
          <StatusIndicator label="Excessive Rotation" active={risk.excessiveRotation} colors={colors} />
          <StatusIndicator label="Inactivity / Fall" active={risk.lackOfMovement} colors={colors} />
        </View>

        <Text style={styles.sectionTitle}>Physiological Analysis</Text>
        <View style={styles.statusGrid}>
          <StatusIndicator label="Abnormal Pulse" active={risk.abnormalHeartRate} colors={colors} />
          <StatusIndicator label="Critical Stress" active={risk.highStress} colors={colors} />
          <StatusIndicator label="Abnormal Behavior" active={risk.abnormalAirBehavior} colors={colors} />
        </View>

        {risk.reasons.length > 0 && (
          <View style={styles.reasonsContainer}>
            <Text style={styles.reasonsTitle}>Detailed Alerts:</Text>
            {risk.reasons.map((reason, i) => (
              <Text key={i} style={styles.reasonItem}>• {reason}</Text>
            ))}
          </View>
        )}
      </View>
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
    // New Detailed Risk Card Styles
    riskScoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 20,
    },
    riskScoreCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 3,
      borderColor: colors.neonPrimary,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
    },
    riskScoreValue: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    riskScoreLabel: {
      fontSize: 8,
      fontWeight: '700',
      color: colors.textMuted,
    },
    riskStatusContainer: {
      flex: 1,
      gap: 6,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    statusBadgeSafe: {
      backgroundColor: '#132A23',
      borderWidth: 1,
      borderColor: colors.success,
    },
    statusBadgeDanger: {
      backgroundColor: '#2D1320',
      borderWidth: 1,
      borderColor: colors.danger,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    riskSummaryText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 14,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    indicatorWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: '48%',
    },
    indicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    indicatorDotActive: {
      backgroundColor: colors.danger,
      shadowColor: colors.danger,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 4,
    },
    indicatorDotInactive: {
      backgroundColor: colors.border,
    },
    indicatorLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    reasonsContainer: {
      marginTop: 4,
      padding: 10,
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.danger,
    },
    reasonsTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.danger,
      marginBottom: 4,
    },
    reasonItem: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
