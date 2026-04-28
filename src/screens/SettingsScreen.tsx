import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {DEFAULT_ESP_PACKET_PARAMETERS, DEFAULT_PARACHUTE_PACKET_PARAMETERS} from '../config/defaults';
import {useTelemetryStore} from '../store/useTelemetryStore';
import {AppColors, useAppColors} from '../theme/colors';
import {MockParameterType, PacketParameterDefinition} from '../types/telemetry';
import {DatabaseView} from '../components/DatabaseView';

export function SettingsScreen(): React.JSX.Element {
  const colors = useAppColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    settings,
    updateSettings,
    triggerSync,
    exportLogs,
    clearAllData,
    logs,
  } = useTelemetryStore();

  const [mqttHost, setMqttHost] = useState('');
  const [mqttPort, setMqttPort] = useState('1883');
  const [mqttUser, setMqttUser] = useState('');
  const [mqttPassword, setMqttPassword] = useState('');
  const [mqttTopic, setMqttTopic] = useState('');
  const [useMockData, setUseMockData] = useState(true);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [bleIdentifier, setBleIdentifier] = useState('');
  const [bleCharacteristicUuid, setBleCharacteristicUuid] = useState('');
  const [dbViewVisible, setDbViewVisible] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setMqttHost(settings.mqttHost);
    setMqttPort(String(settings.mqttPort));
    setMqttUser(settings.mqttUser);
    setMqttPassword(settings.mqttPassword);
    setMqttTopic(settings.mqttTopic);
    setUseMockData(settings.useMockData);
    setBleIdentifier(settings.bleIdentifier);
    setBleCharacteristicUuid(settings.bleCharacteristicUuid);
    setThemeMode((settings.themeMode as 'dark' | 'light') ?? 'dark');
  }, [settings]);

  const saveAll = async () => {
    const portValue = Number(mqttPort);
    if (!Number.isFinite(portValue) || portValue <= 0) {
      Alert.alert('Invalid port', 'MQTT port must be a positive number.');
      return;
    }

    if (!mqttHost.trim() || !mqttTopic.trim()) {
      Alert.alert('Missing required fields', 'MQTT host and topic are required.');
      return;
    }

    await updateSettings({
      mqttHost: mqttHost.trim(),
      mqttPort: portValue,
      mqttUser,
      mqttPassword,
      mqttTopic: mqttTopic.trim(),
      useMockData,
      themeMode,
      bleIdentifier: bleIdentifier.trim(),
      bleCharacteristicUuid: bleCharacteristicUuid.trim(),
    });

    Alert.alert('Saved', 'Settings were updated.');
  };

  const onExport = async () => {
    const path = await exportLogs();
    Alert.alert('Exported', path);
  };

  const onClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all telemetry history, alerts, and logs from this device. Are you sure?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Cleared', 'All history has been deleted.');
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data Source</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Mock data</Text>
          <Switch
            value={useMockData}
            onValueChange={value => {
              setUseMockData(value);
              updateSettings({useMockData: value}).catch(() => undefined);
            }}
            trackColor={{false: colors.border, true: colors.neonSecondary}}
            thumbColor={useMockData ? colors.neonGlow : colors.textSecondary}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Dark mode</Text>
          <Switch
            value={themeMode === 'dark'}
            onValueChange={value => {
              const mode: 'dark' | 'light' = value ? 'dark' : 'light';
              setThemeMode(mode);
              updateSettings({themeMode: mode}).catch(() => undefined);
            }}
            trackColor={{false: colors.border, true: colors.neonSecondary}}
            thumbColor={themeMode === 'dark' ? colors.neonGlow : colors.textSecondary}
          />
        </View>
        <Text style={styles.hint}>
          Mock mode generates synthetic telemetry. Real mode listens to BLE notifications from the wrist device.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>MQTT</Text>
        <TextInput
          style={styles.input}
          value={mqttHost}
          onChangeText={setMqttHost}
          placeholder="Host"
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={styles.input}
          value={mqttPort}
          onChangeText={setMqttPort}
          keyboardType="numeric"
          placeholder="Port"
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={styles.input}
          value={mqttUser}
          onChangeText={setMqttUser}
          placeholder="Username"
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={styles.input}
          value={mqttPassword}
          onChangeText={setMqttPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={mqttTopic}
          onChangeText={setMqttTopic}
          placeholder="Topic"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>BLE Connection</Text>
        <TextInput
          style={styles.input}
          value={bleIdentifier}
          onChangeText={setBleIdentifier}
          placeholder="Identifier (service UUID)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          value={bleCharacteristicUuid}
          onChangeText={setBleCharacteristicUuid}
          placeholder="Characteristic UUID"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
        />
        <Text style={styles.hint}>
          This single characteristic carries both telemetry JSON and parameter-update JSON.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Debug Tools</Text>
        <View style={styles.actionsWrap}>
          <Pressable style={styles.primaryButton} onPress={saveAll}>
            <Text style={styles.buttonText}>Save Settings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => triggerSync()}>
            <Text style={styles.buttonText}>Sync Now</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onExport}>
            <Text style={styles.buttonText}>Export Logs</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setDbViewVisible(true)}>
            <Text style={styles.buttonText}>View Telemetry Database</Text>
          </Pressable>
          <Pressable style={styles.removeButton} onPress={onClearAll}>
            <Text style={styles.buttonText}>Clear Database & History</Text>
          </Pressable>
        </View>
      </View>

      <DatabaseView
        visible={dbViewVisible}
        onClose={() => setDbViewVisible(false)}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Logs</Text>
        {logs.slice(0, 25).map(log => (
          <View style={styles.logRow} key={log.id}>
            <Text style={styles.logLevel}>{log.level.toUpperCase()}</Text>
            <Text style={styles.logMsg}>{log.message}</Text>
          </View>
        ))}
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
    heading: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.neonGlow,
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
      color: colors.textPrimary,
    },
    label: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: colors.textPrimary,
      backgroundColor: colors.inputBackground,
    },
    replayInput: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    hint: {
      color: colors.textMuted,
      fontSize: 12,
    },
    actionsWrap: {
      gap: 8,
    },
    primaryButton: {
      borderRadius: 10,
      backgroundColor: colors.neonPrimary,
      paddingVertical: 11,
      alignItems: 'center',
    },
    secondaryButton: {
      borderRadius: 10,
      backgroundColor: colors.neonSecondary,
      paddingVertical: 11,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    sectionTitle: {
      color: colors.neonGlow,
      fontWeight: '700',
      marginTop: 4,
    },
    parameterRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      gap: 8,
      backgroundColor: colors.inputBackground,
    },
    parameterControls: {
      flexDirection: 'row',
      gap: 8,
    },
    typeButton: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: colors.neonSecondary,
      paddingVertical: 10,
      alignItems: 'center',
    },
    removeButton: {
      borderRadius: 10,
      backgroundColor: '#992525',
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    logRow: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingVertical: 6,
    },
    logLevel: {
      color: colors.textMuted,
      fontSize: 11,
    },
    logMsg: {
      color: colors.textPrimary,
    },
  });
