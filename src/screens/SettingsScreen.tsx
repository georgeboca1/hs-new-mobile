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
import {DEFAULT_ESP_PACKET_PARAMETERS, DEFAULT_PARACHUTE_PACKET_PARAMETERS} from '../config/defaults';
import {useTelemetryStore} from '../store/useTelemetryStore';
import {colors} from '../theme/colors';
import {MockParameterType, PacketParameterDefinition} from '../types/telemetry';

const PARAMETER_TYPES: MockParameterType[] = ['number', 'integer', 'boolean', 'string', 'enum', 'isoDate'];

function createParameterDraft(type: MockParameterType = 'number'): PacketParameterDefinition {
  return {
    id: `param-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    name: '',
    type,
    enumValues: '',
  };
}

function sanitizeSchema(parameters: PacketParameterDefinition[]): PacketParameterDefinition[] {
  const seen = new Set<string>();

  return parameters
    .map(parameter => ({
      ...parameter,
      name: parameter.name.trim(),
      enumValues: parameter.enumValues?.trim() ?? '',
    }))
    .filter(parameter => {
      if (!parameter.name) {
        return false;
      }
      const key = parameter.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

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
  const [bleTelemetryUuid, setBleTelemetryUuid] = useState('');
  const [bleHealthUuid, setBleHealthUuid] = useState('');
  const [bleDebugJsonUuid, setBleDebugJsonUuid] = useState('');
  const [espPacketParameters, setEspPacketParameters] = useState<PacketParameterDefinition[]>([]);
  const [parachutePacketParameters, setParachutePacketParameters] = useState<PacketParameterDefinition[]>([]);
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
    setBleTelemetryUuid(settings.bleTelemetryUuid);
    setBleHealthUuid(settings.bleHealthUuid);
    setBleDebugJsonUuid(settings.bleDebugJsonUuid);
    setEspPacketParameters(settings.packetParameterSchemas.esp);
    setParachutePacketParameters(settings.packetParameterSchemas.parachute);
  }, [settings]);

  const updateParameter = (
    kind: 'esp' | 'parachute',
    id: string,
    patch: Partial<PacketParameterDefinition>,
  ) => {
    const setter = kind === 'esp' ? setEspPacketParameters : setParachutePacketParameters;
    setter(list => list.map(item => (item.id === id ? {...item, ...patch} : item)));
  };

  const removeParameter = (kind: 'esp' | 'parachute', id: string) => {
    const setter = kind === 'esp' ? setEspPacketParameters : setParachutePacketParameters;
    setter(list => list.filter(item => item.id !== id));
  };

  const addParameter = (kind: 'esp' | 'parachute') => {
    const setter = kind === 'esp' ? setEspPacketParameters : setParachutePacketParameters;
    setter(list => [...list, createParameterDraft()]);
  };

  const cycleParameterType = (kind: 'esp' | 'parachute', id: string) => {
    const setter = kind === 'esp' ? setEspPacketParameters : setParachutePacketParameters;
    setter(list =>
      list.map(item => {
        if (item.id !== id) {
          return item;
        }

        const currentIndex = PARAMETER_TYPES.indexOf(item.type);
        const nextType = PARAMETER_TYPES[(currentIndex + 1) % PARAMETER_TYPES.length];
        return {
          ...item,
          type: nextType,
          enumValues: nextType === 'enum' ? item.enumValues ?? '' : '',
        };
      }),
    );
  };

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

    const normalizedEspSchema = sanitizeSchema(espPacketParameters);
    const normalizedParachuteSchema = sanitizeSchema(parachutePacketParameters);

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
      bleTelemetryUuid: bleTelemetryUuid.trim(),
      bleHealthUuid: bleHealthUuid.trim(),
      bleDebugJsonUuid: bleDebugJsonUuid.trim(),
      packetParameterSchemas: {
        esp: normalizedEspSchema,
        parachute: normalizedParachuteSchema,
      },
    });

    setEspPacketParameters(normalizedEspSchema);
    setParachutePacketParameters(normalizedParachuteSchema);

    Alert.alert('Saved', 'Settings were updated.');
  };

  const resetPacketSchemaDefaults = () => {
    setEspPacketParameters(DEFAULT_ESP_PACKET_PARAMETERS.map(parameter => ({...parameter})));
    setParachutePacketParameters(DEFAULT_PARACHUTE_PACKET_PARAMETERS.map(parameter => ({...parameter})));
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
          value={bleTelemetryUuid}
          onChangeText={setBleTelemetryUuid}
          placeholder="Telemetry characteristic UUID"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          value={bleHealthUuid}
          onChangeText={setBleHealthUuid}
          placeholder="Health characteristic UUID"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          value={bleDebugJsonUuid}
          onChangeText={setBleDebugJsonUuid}
          placeholder="Debug JSON characteristic UUID"
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
        <Text style={styles.cardTitle}>Mock Packet Parameters</Text>
        <Text style={styles.hint}>
          Add, remove, and type packet parameters used during mock telemetry generation.
        </Text>

        <Text style={styles.sectionTitle}>ESP packet</Text>
        {espPacketParameters.map(parameter => (
          <View key={parameter.id} style={styles.parameterRow}>
            <TextInput
              style={styles.input}
              value={parameter.name}
              onChangeText={value => updateParameter('esp', parameter.id, {name: value})}
              placeholder="Parameter name"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.parameterControls}>
              <Pressable style={styles.typeButton} onPress={() => cycleParameterType('esp', parameter.id)}>
                <Text style={styles.buttonText}>Type: {parameter.type}</Text>
              </Pressable>
              <Pressable style={styles.removeButton} onPress={() => removeParameter('esp', parameter.id)}>
                <Text style={styles.buttonText}>Remove</Text>
              </Pressable>
            </View>
            {parameter.type === 'enum' && (
              <TextInput
                style={styles.input}
                value={parameter.enumValues}
                onChangeText={value => updateParameter('esp', parameter.id, {enumValues: value})}
                placeholder="Enum values (comma-separated)"
                placeholderTextColor={colors.textMuted}
              />
            )}
          </View>
        ))}
        <Pressable style={styles.secondaryButton} onPress={() => addParameter('esp')}>
          <Text style={styles.buttonText}>Add ESP Parameter</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Parachute packet</Text>
        {parachutePacketParameters.map(parameter => (
          <View key={parameter.id} style={styles.parameterRow}>
            <TextInput
              style={styles.input}
              value={parameter.name}
              onChangeText={value => updateParameter('parachute', parameter.id, {name: value})}
              placeholder="Parameter name"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.parameterControls}>
              <Pressable style={styles.typeButton} onPress={() => cycleParameterType('parachute', parameter.id)}>
                <Text style={styles.buttonText}>Type: {parameter.type}</Text>
              </Pressable>
              <Pressable style={styles.removeButton} onPress={() => removeParameter('parachute', parameter.id)}>
                <Text style={styles.buttonText}>Remove</Text>
              </Pressable>
            </View>
            {parameter.type === 'enum' && (
              <TextInput
                style={styles.input}
                value={parameter.enumValues}
                onChangeText={value => updateParameter('parachute', parameter.id, {enumValues: value})}
                placeholder="Enum values (comma-separated)"
                placeholderTextColor={colors.textMuted}
              />
            )}
          </View>
        ))}
        <Pressable style={styles.secondaryButton} onPress={() => addParameter('parachute')}>
          <Text style={styles.buttonText}>Add Parachute Parameter</Text>
        </Pressable>

        <Pressable style={styles.typeButton} onPress={resetPacketSchemaDefaults}>
          <Text style={styles.buttonText}>Reset Parameter Defaults</Text>
        </Pressable>
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
