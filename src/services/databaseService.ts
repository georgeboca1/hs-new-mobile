import SQLite from 'react-native-sqlite-storage';
import {AlertRow, AppLog, EspData, QueueRow, TelemetryKind} from '../types/telemetry';

SQLite.enablePromise(true);

let dbInstance: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabase({
      name: 'hsnewmobile.db',
      location: 'default',
    });
  }

  return dbInstance;
}

export async function initializeDatabase(): Promise<void> {
  const db = await getDb();

  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS telemetry_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    )`,
  );

  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS alerts_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    )`,
  );

  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS app_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      context TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  );

  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_telemetry_synced ON telemetry_queue(synced)');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_alerts_synced ON alerts_queue(synced)');
}

export async function queueTelemetry(kind: TelemetryKind, payload: object): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    'INSERT INTO telemetry_queue (kind, payload, created_at, synced) VALUES (?, ?, ?, 0)',
    [kind, JSON.stringify(payload), new Date().toISOString()],
  );
}

export async function queueAlert(payload: object): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    'INSERT INTO alerts_queue (payload, created_at, synced) VALUES (?, ?, 0)',
    [JSON.stringify(payload), new Date().toISOString()],
  );
}

export async function getPendingTelemetry(limit = 100): Promise<QueueRow[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT id, kind, payload, created_at FROM telemetry_queue WHERE synced = 0 ORDER BY id ASC LIMIT ?',
    [limit],
  );

  const rows: QueueRow[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i);
    rows.push({
      id: Number(row.id),
      kind: row.kind as TelemetryKind,
      payload: String(row.payload),
      createdAt: String(row.created_at),
    });
  }

  return rows;
}

export async function markTelemetrySynced(ids: number[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.executeSql(`UPDATE telemetry_queue SET synced = 1 WHERE id IN (${placeholders})`, ids);
}

export async function getPendingAlerts(limit = 100): Promise<AlertRow[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT id, payload, created_at FROM alerts_queue WHERE synced = 0 ORDER BY id ASC LIMIT ?',
    [limit],
  );

  const rows: AlertRow[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i);
    rows.push({
      id: Number(row.id),
      payload: String(row.payload),
      createdAt: String(row.created_at),
    });
  }

  return rows;
}

export async function markAlertsSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.executeSql(`UPDATE alerts_queue SET synced = 1 WHERE id IN (${placeholders})`, ids);
}

export async function insertLog(level: 'info' | 'warn' | 'error', message: string, context = ''): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    'INSERT INTO app_logs (level, message, context, created_at) VALUES (?, ?, ?, ?)',
    [level, message, context, new Date().toISOString()],
  );
}

export async function getRecentLogs(limit = 300): Promise<AppLog[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT id, level, message, context, created_at FROM app_logs ORDER BY id DESC LIMIT ?',
    [limit],
  );

  const rows: AppLog[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i);
    rows.push({
      id: Number(row.id),
      level: row.level as AppLog['level'],
      message: String(row.message),
      context: String(row.context),
      createdAt: String(row.created_at),
    });
  }

  return rows;
}

export async function getEspHistory(limit = 80): Promise<EspData[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    `SELECT payload
     FROM telemetry_queue
     WHERE kind = 'esp'
     ORDER BY id DESC
     LIMIT ?`,
    [limit],
  );

  const history: EspData[] = [];

  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i);
    try {
      history.push(JSON.parse(String(row.payload)) as EspData);
    } catch {
      // Skip malformed row.
    }
  }

  return history.reverse();
}
