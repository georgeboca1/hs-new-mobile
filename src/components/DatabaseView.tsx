import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { AppColors, useAppColors } from '../theme/colors';

interface DatabaseViewProps {
  visible: boolean;
  onClose: () => void;
}

export function DatabaseView({ visible, onClose }: DatabaseViewProps): React.JSX.Element {
  const colors = useAppColors();
  const styles = makeStyles(colors);
  const { fetchFullHistory } = useTelemetryStore();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      fetchFullHistory(200).then(setData);
    }
  }, [visible, fetchFullHistory]);

  const columns = [
    'timestamp',
    'state',
    'parachute',
    'body_position',
    'heart_rate',
    'SpO2',
    'temp',
    'temp_ext',
    'stress_level',
    'is_pulse_stable',
    'vertical_speed',
    'rotation',
    'g_force',
    'battery_pct',
    'voltage',
    'current_ma',
    'consumed_mah',
    'battery_life_min',
    'power_state',
    'cpu_load',
    'risk_score',
    'flags',
    'alert_active',
    'pitch',
    'roll',
    'yaw',
    'ax',
    'ay',
    'az',
  ];

  const renderHeader = () => (
    <View style={styles.headerRow}>
      {columns.map(col => (
        <View key={col} style={[styles.cell, styles.headerCell]}>
          <Text style={styles.headerText}>{col}</Text>
        </View>
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.row}>
      {columns.map(col => {
        let val = item[col];
        if (typeof val === 'boolean') {
          val = val ? 'TRUE' : 'FALSE';
        } else if (val === null || val === undefined) {
          val = 'null';
        } else if (typeof val === 'number') {
          val = val.toFixed(2);
        }

        return (
          <View key={col} style={styles.cell}>
            <Text style={styles.cellText} numberOfLines={1}>{String(val)}</Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.title}>Telemetry Database</Text>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView horizontal bounces={false}>
          <View>
            {renderHeader()}
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={item => item.timestamp}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No data in database</Text>
                </View>
              }
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.neonGlow,
    },
    closeButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.neonSecondary,
    },
    closeButtonText: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    headerRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderBottomWidth: 2,
      borderBottomColor: colors.neonPrimary,
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cell: {
      width: 120,
      padding: 10,
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    headerCell: {
      backgroundColor: colors.surface,
    },
    headerText: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 12,
    },
    cellText: {
      color: colors.textPrimary,
      fontSize: 12,
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.textMuted,
    },
  });
