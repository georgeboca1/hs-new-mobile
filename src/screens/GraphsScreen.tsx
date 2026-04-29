import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { EspData } from '../types/telemetry';
import { AppColors, useAppColors } from '../theme/colors';
import { TELEMETRY_PARAMETERS, getParameterUnit } from '../config/parameterDisplayConfig';

const CHART_COLORS = ['#2DD4BF', '#60A5FA', '#F59E0B', '#34D399', '#F97316', '#60A5FA', '#94A3B8'];

function asNumber(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return null;
}

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

function buildTelemetryRows(payload: Record<string, unknown> | null): Array<{ key: string; label: string; value: unknown; unit?: string }> {
  if (!payload) {
    return [];
  }

  return TELEMETRY_PARAMETERS.map(param => ({
    key: param.key,
    label: param.label,
    value: payload[param.key],
    unit: param.unit,
  })).filter(row => row.value !== undefined);
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

function MiniLineChart({
  values,
  width,
  height,
  color,
  borderColor,
  textColor,
}: {
  values: number[];
  width: number;
  height: number;
  color: string;
  borderColor: string;
  textColor: string;
}) {
  if (values.length === 0) {
    return null;
  }

  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 15;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const min = 0;
  const rawMax = Math.max(...values, 0.1);
  const max = rawMax * 1.1; // 10% headroom
  const span = max - min;

  const xStep = chartWidth / Math.max(values.length - 1, 1);

  const points = values
    .map((value, index) => {
      const x = paddingLeft + index * xStep;
      const normalized = (value - min) / span;
      const y = paddingTop + chartHeight - normalized * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const lastValue = values[values.length - 1];
  const lastX = paddingLeft + (values.length - 1) * xStep;
  const lastY = paddingTop + chartHeight - ((lastValue - min) / span) * chartHeight;

  const yLabels = [
    { y: paddingTop, val: max },
    { y: paddingTop + chartHeight / 2, val: max / 2 },
    { y: paddingTop + chartHeight, val: 0 },
  ];

  return (
    <Svg width={width} height={height}>
      {yLabels.map((l, i) => (
        <React.Fragment key={i}>
          <Line
            x1={paddingLeft}
            y1={l.y}
            x2={width - paddingRight}
            y2={l.y}
            stroke={borderColor}
            strokeWidth={0.5}
            strokeDasharray="4,2"
          />
          <SvgText
            x={paddingLeft - 6}
            y={l.y + 4}
            fill={textColor}
            fontSize="10"
            textAnchor="end"
          >
            {l.val >= 10 ? Math.round(l.val) : l.val.toFixed(1)}
          </SvgText>
        </React.Fragment>
      ))}

      <Line
        x1={paddingLeft}
        y1={paddingTop + chartHeight}
        x2={width - paddingRight}
        y2={paddingTop + chartHeight}
        stroke={borderColor}
        strokeWidth={1.5}
      />
      <Line
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={paddingTop + chartHeight}
        stroke={borderColor}
        strokeWidth={1.5}
      />

      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={lastX} cy={lastY} r={3.5} fill={color} />
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
  colors,
}: {
  title: string;
  unit: string;
  color: string;
  history: EspData[];
  selector: (value: EspData) => unknown;
  width: number;
  colors: AppColors;
}) {
  const styles = makeStyles(colors);
  const data = useMemo(
    () => {
      const rawData = history.slice(-30).map((item, index) => {
        const numValue = asNumber(selector(item));
        return {
          value: numValue,
          label: index % 6 === 0 ? `${index}` : '',
        };
      });

      // Filter out items with null values (missing data)
      return rawData.filter(item => item.value !== null).map(item => ({
        ...item,
        value: Number(item.value!.toFixed(2)),
      }));
    },
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
            height={180}
            color={color}
            borderColor={colors.border}
            textColor={colors.textSecondary}
          />
          <View style={styles.statRow}>
            <Text style={styles.axisText}>Min {Math.min(...data.map(d => d.value)).toFixed(2)}{unit === '%' ? '%' : ''}</Text>
            <Text style={styles.axisText}>Max {Math.max(...data.map(d => d.value)).toFixed(2)}{unit === '%' ? '%' : ''}</Text>
            <Text style={styles.axisText}>Now {data[data.length - 1].value.toFixed(2)}{unit === '%' ? '%' : ''}</Text>
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
  const colors = useAppColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const history = useTelemetryStore(state => state.espHistory);
  const latestEsp = useTelemetryStore(state => state.latestEsp);
  const latestParachute = useTelemetryStore(state => state.latestParachute);
  const settings = useTelemetryStore(state => state.settings);
  const { width } = useWindowDimensions();

  const combinedPayload = useMemo(() => {
    if (!latestEsp && !latestParachute) return null;
    return {
      ...(latestEsp || {}),
      ...(latestParachute || {}),
    };
  }, [latestEsp, latestParachute]);

  const espParameters = useMemo(
    () =>
      (settings?.packetParameterSchemas?.esp ?? [])
        .map(parameter => ({
          ...parameter,
          name: parameter.name.trim(),
        }))
        .filter(parameter => Boolean(parameter.name)),
    [settings],
  );

  const numericParameters = useMemo(
    () =>
      espParameters.filter(
        parameter =>
          (parameter.type === 'number' || parameter.type === 'integer') &&
          !['temperature', 'rssi', 'currentnow'].includes(parameter.name.toLowerCase()),
      ),
    [espParameters],
  );

  const telemetryRows = useMemo(
    () => buildTelemetryRows(combinedPayload),
    [combinedPayload],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>System Telemetry</Text>
        {combinedPayload ? (
          telemetryRows.length > 0 ? (
            telemetryRows.map(row => (
              <Row
                key={row.key}
                label={row.label}
                value={row.value as string | number}
                unit={row.unit}
                colors={colors}
              />
            ))
          ) : (
            <Text style={styles.empty}>No system telemetry data received yet.</Text>
          )
        ) : (
          <Text style={styles.empty}>No telemetry data yet.</Text>
        )}
      </View>

      <Text style={styles.header}>ESP Value History</Text>

      {numericParameters.length > 0 ? (
        numericParameters.map((parameter, index) => (
          <MetricChart
            key={parameter.id}
            title={parameter.name}
            unit={getParameterUnit(parameter.name, TELEMETRY_PARAMETERS) ?? parameter.type}
            color={CHART_COLORS[index % CHART_COLORS.length]}
            history={history}
            selector={value => value[parameter.name]}
            width={width - 48}
            colors={colors}
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
