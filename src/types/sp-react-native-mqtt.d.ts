declare module 'sp-react-native-mqtt' {
  export interface MqttClientOptions {
    uri: string;
    clientId: string;
    user?: string;
    pass?: string;
    auth?: boolean;
    clean?: boolean;
    keepalive?: number;
    reconnect?: boolean;
    tls?: boolean;
  }

  export interface MqttClient {
    connect(): void;
    disconnect(): void;
    publish(topic: string, message: string, qos: number, retained: boolean): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
  }

  export interface MqttModule {
    createClient(options: MqttClientOptions): Promise<MqttClient>;
  }

  const MQTT: MqttModule;
  export default MQTT;
}
