import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Svg, {Circle, Line, Polyline} from 'react-native-svg';
import {useTelemetryStore} from '../store/useTelemetryStore';
import {EspData} from '../types/telemetry';
import {colors} from '../theme/colors';

const CHART_COLORS = ['#C63BFF', '#E87BFF', '#9A35FF', '#7E2CFF', '#D95FFF', '#6A8BFF', '#26D7AE'];

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
  selector: (value: EspData) => unknown;
  width: number;
}) {
  const data = useMemo(
    () =>
      history.slice(-30).map((item, index) => ({
        value: Number(asNumber(selector(item)).toFixed(2)),
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
  const settings = useTelemetryStore(state => state.settings);
  const {width} = useWindowDimensions();

  const espParameters = useMemo(
    () =>
      (settings?.packetParameterSchemas.esp ?? [])
        .map(parameter => ({
          ...parameter,
          name: parameter.name.trim(),
        }))
        .filter(parameter => Boolean(parameter.name)),
    [settings],
  );

  const numericParameters = useMemo(
    () => espParameters.filter(parameter => parameter.type === 'number' || parameter.type === 'integer'),
    [espParameters],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>ESP Telemetry</Text>
        {latestEsp ? (
          espParameters.length > 0 ? (
            espParameters.map(parameter => (
              <Row key={parameter.id} label={parameter.name} value={displayValue(latestEsp[parameter.name])} />
            ))
          ) : (
            <Text style={styles.empty}>No ESP parameters are configured.</Text>
          )
        ) : (
          <Text style={styles.empty}>No ESP data yet.</Text>
        )}
      </View>

      <Text style={styles.header}>ESP Value History</Text>

      {numericParameters.length > 0 ? (
        numericParameters.map((parameter, index) => (
          <MetricChart
            key={parameter.id}
            title={parameter.name}
            unit={parameter.type}
            color={CHART_COLORS[index % CHART_COLORS.length]}
            history={history}
            selector={value => value[parameter.name]}
            width={width - 74}
          />
        ))
      ) : (
        <View style={styles.chartCard}>
          <Text style={styles.empty}>No numeric/integer ESP parameters configured for charting.</Text>
        </View>
      )}
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
