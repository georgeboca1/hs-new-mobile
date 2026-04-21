import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Svg, {Circle, Line, Polyline} from 'react-native-svg';
import {useTelemetryStore} from '../store/useTelemetryStore';
import {EspData} from '../types/telemetry';
import {colors} from '../theme/colors';

function Row({label, value}: {label: string; value: string | number}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function MiniLineChart({
  values,
  width,
  height,
  color,
}: {
  values: number[];
  width: number;
  height: number;
  color: string;
}) {
  const padding = 12;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const xStep = (width - padding * 2) / Math.max(values.length - 1, 1);

  const points = values
    .map((value, index) => {
      const x = padding + index * xStep;
      const normalized = (value - min) / span;
      const y = height - padding - normalized * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const lastValue = values[values.length - 1];
  const lastX = padding + (values.length - 1) * xStep;
  const lastY =
    height - padding - ((lastValue - min) / span) * (height - padding * 2);

  return (
    <Svg width={width} height={height}>
      <Line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke={colors.border}
        strokeWidth={1}
      />
      <Line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke={colors.border}
        strokeWidth={1}
      />
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={lastX} cy={lastY} r={3} fill={color} />
    </Svg>
  );
}

function MetricChart({
  title,
  unit,
  color,
  history,
  selector,
  width,
}: {
  title: string;
  unit: string;
  color: string;
  history: EspData[];
  selector: (value: EspData) => number;
  width: number;
}) {
  const data = useMemo(
    () =>
      history.slice(-30).map((item, index) => ({
        value: Number(selector(item).toFixed(2)),
        label: index % 6 === 0 ? `${index}` : '',
      })),
    [history, selector],
  );

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {data.length > 1 ? (
        <>
          <MiniLineChart
            values={data.map(item => item.value)}
            width={width}
            height={170}
            color={color}
          />
          <View style={styles.statRow}>
            <Text style={styles.axisText}>Min {Math.min(...data.map(d => d.value)).toFixed(2)}</Text>
            <Text style={styles.axisText}>Max {Math.max(...data.map(d => d.value)).toFixed(2)}</Text>
            <Text style={styles.axisText}>Now {data[data.length - 1].value.toFixed(2)}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.empty}>Not enough data points yet.</Text>
      )}
      <Text style={styles.unitLabel}>Unit: {unit}</Text>
    </View>
  );
}

export function GraphsScreen(): React.JSX.Element {
  const history = useTelemetryStore(state => state.espHistory);
  const latestEsp = useTelemetryStore(state => state.latestEsp);
  const {width} = useWindowDimensions();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>ESP Telemetry</Text>
        {latestEsp ? (
          <>
            <Row label="Temperature" value={`${latestEsp.temperature.toFixed(2)} C`} />
            <Row label="CPU load" value={`${latestEsp.cpuLoad.toFixed(2)} %`} />
            <Row label="Voltage" value={`${latestEsp.voltage.toFixed(2)} V`} />
            <Row label="Current now" value={`${latestEsp.currentNow.toFixed(2)} A`} />
            <Row label="Battery" value={`${latestEsp.batteryPercentage.toFixed(2)} %`} />
            <Row label="Signal" value={`${latestEsp.rssi} dBm`} />
          </>
        ) : (
          <Text style={styles.empty}>No ESP data yet.</Text>
        )}
      </View>

      <Text style={styles.header}>ESP Value History</Text>

      <MetricChart
        title="Temperature"
        unit="C"
        color="#C63BFF"
        history={history}
        selector={value => value.temperature}
        width={width - 74}
      />

      <MetricChart
        title="CPU load"
        unit="%"
        color="#E87BFF"
        history={history}
        selector={value => value.cpuLoad}
        width={width - 74}
      />

      <MetricChart
        title="Voltage"
        unit="V"
        color="#9A35FF"
        history={history}
        selector={value => value.voltage}
        width={width - 74}
      />

      <MetricChart
        title="Current now"
        unit="A"
        color="#7E2CFF"
        history={history}
        selector={value => value.currentNow}
        width={width - 74}
      />

      <MetricChart
        title="Battery percentage"
        unit="%"
        color="#D95FFF"
        history={history}
        selector={value => value.batteryPercentage}
        width={width - 74}
      />
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
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neonGlow,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: colors.textPrimary,
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
  axisText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  statRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  unitLabel: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 12,
  },
  empty: {
    color: colors.textMuted,
  },
});
