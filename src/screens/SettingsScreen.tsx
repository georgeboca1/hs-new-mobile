import React, {useEffect, useState} from 'react';
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
import {useTelemetryStore} from '../store/useTelemetryStore';
import {colors} from '../theme/colors';

export function SettingsScreen(): React.JSX.Element {
  const {
    settings,
    updateSettings,
    triggerSync,
    replayHexPacket,
    exportLogs,
    logs,
  } = useTelemetryStore();

  const [mqttHost, setMqttHost] = useState('');
  const [mqttPort, setMqttPort] = useState('1883');
  const [mqttUser, setMqttUser] = useState('');
  const [mqttPassword, setMqttPassword] = useState('');
  const [mqttTopic, setMqttTopic] = useState('');
  const [espHeader, setEspHeader] = useState('A1B2');
  const [parachuteHeader, setParachuteHeader] = useState('C3D4');
  const [useMockData, setUseMockData] = useState(true);
  const [bleServiceUuid, setBleServiceUuid] = useState('');
  const [bleCharacteristicUuid, setBleCharacteristicUuid] = useState('');
  const [replayHex, setReplayHex] = useState('');

  useEffect(() => {
    if (!settings) {
      return;
    }

    setMqttHost(settings.mqttHost);
    setMqttPort(String(settings.mqttPort));
    setMqttUser(settings.mqttUser);
    setMqttPassword(settings.mqttPassword);
    setMqttTopic(settings.mqttTopic);
    setEspHeader(settings.espPacketHeaderHex);
    setParachuteHeader(settings.parachutePacketHeaderHex);
    setUseMockData(settings.useMockData);
    setBleServiceUuid(settings.bleServiceUuid);
    setBleCharacteristicUuid(settings.bleCharacteristicUuid);
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
      espPacketHeaderHex: espHeader.trim(),
      parachutePacketHeaderHex: parachuteHeader.trim(),
      useMockData,
      bleServiceUuid: bleServiceUuid.trim(),
      bleCharacteristicUuid: bleCharacteristicUuid.trim(),
    });

    Alert.alert('Saved', 'Settings were updated.');
  };

  const onReplay = async () => {
    const count = await replayHexPacket(replayHex);
    Alert.alert('Replay complete', `Parsed ${count} packet(s).`);
  };

  const onExport = async () => {
    const path = await exportLogs();
    Alert.alert('Exported', path);
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
        <Text style={styles.cardTitle}>Packet Headers (hex)</Text>
        <TextInput
          style={styles.input}
          value={espHeader}
          onChangeText={setEspHeader}
          placeholder="ESP header (example A1B2)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          value={parachuteHeader}
          onChangeText={setParachuteHeader}
          placeholder="Parachute header (example C3D4)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
        />
        <Text style={styles.hint}>
          Packet structure used by this app: header bytes + 2-byte payload length + UTF-8 JSON payload.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>BLE Identifiers</Text>
        <TextInput
          style={styles.input}
          value={bleServiceUuid}
          onChangeText={setBleServiceUuid}
          placeholder="Service UUID"
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
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Debug Tools</Text>
        <TextInput
          style={[styles.input, styles.replayInput]}
          value={replayHex}
          onChangeText={setReplayHex}
          placeholder="Paste raw packet bytes in HEX for manual replay"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <View style={styles.actionsWrap}>
          <Pressable style={styles.primaryButton} onPress={saveAll}>
            <Text style={styles.buttonText}>Save Settings</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => triggerSync()}>
            <Text style={styles.buttonText}>Sync Now</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onReplay}>
            <Text style={styles.buttonText}>Replay Packets</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onExport}>
            <Text style={styles.buttonText}>Export Logs</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Parachute Packet Schema</Text>
        <Text style={styles.schemaLine}>chuteOpened: boolean</Text>
        <Text style={styles.schemaLine}>bodyPosition: stable | tilted-left | tilted-right | head-down | unstable</Text>
        <Text style={styles.schemaLine}>stressLevel, bodyTemperature, bloodOxygen, heartRate</Text>
        <Text style={styles.schemaLine}>verticalSpeed, rotationRate, movementIndex</Text>
        <Text style={styles.schemaLine}>altitude (added key parameter), gForce, batteryPercentage, timestamp</Text>
      </View>

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

const styles = StyleSheet.create({
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
  schemaLine: {
    color: colors.textSecondary,
    lineHeight: 18,
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
