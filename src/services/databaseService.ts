import SQLite from 'react-native-sqlite-storage';
import { AlertRow, AppLog, EspData, ParachuteData, QueueRow, TelemetryKind } from '../types/telemetry';

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

const TELEMETRY_COLUMNS = [
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

/**
 * In-memory cache of the latest telemetry state to avoid expensive DB reads
 * for every single high-frequency packet.
 */
let lastTelemetryRow: Record<string, any> | null = null;

export async function initializeDatabase(): Promise<void> {
  const db = await getDb();

  // Create new flat telemetry history table with EXACT columns requested
  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS telemetry_history (
      timestamp TEXT PRIMARY KEY,
      state TEXT,
      parachute TEXT,
      body_position TEXT,
      heart_rate INTEGER,
      SpO2 REAL,
      temp REAL,
      temp_ext REAL,
      stress_level REAL,
      is_pulse_stable INTEGER,
      vertical_speed REAL,
      rotation REAL,
      g_force REAL,
      battery_pct REAL,
      voltage REAL,
      current_ma REAL,
      consumed_mah REAL,
      battery_life_min REAL,
      power_state TEXT,
      cpu_load REAL,
      risk_score REAL,
      flags INTEGER,
      alert_active INTEGER,
      pitch REAL,
      roll REAL,
      yaw REAL,
      ax REAL,
      ay REAL,
      az REAL
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

  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_alerts_synced ON alerts_queue(synced)');

  // Simple migration: Check if new columns exist, and add them if they don't
  try {
    const [results] = await db.executeSql('PRAGMA table_info(telemetry_history)');
    const existingCols = [];
    for (let i = 0; i < results.rows.length; i++) {
      existingCols.push(results.rows.item(i).name);
    }

    for (const col of TELEMETRY_COLUMNS) {
      if (!existingCols.includes(col)) {
        console.log(`[DB] Migrating: Adding missing column ${col} to telemetry_history`);
        // Note: SQLite ALTER TABLE ADD COLUMN is limited but fine for simple numeric/text types
        const type = ['state', 'parachute', 'body_position', 'power_state'].includes(col) ? 'TEXT' : 'REAL';
        await db.executeSql(`ALTER TABLE telemetry_history ADD COLUMN ${col} ${type}`);
      }
    }
  } catch (err) {
    console.error('[DB] Schema migration failed:', err);
  }
}


/**
 * Safely extracts a value from a database row by case-insensitive column name
 */
function getRowValue(row: any, columnName: string): any {
  if (!row) {
    return null;
  }
  if (row[columnName] !== undefined) {
    return row[columnName];
  }
  
  // Fallback to case-insensitive search
  const lowerName = columnName.toLowerCase();
  const actualKey = Object.keys(row).find(k => k.toLowerCase() === lowerName);
  return actualKey ? row[actualKey] : null;
}

export async function storeTelemetry(payload: EspData | ParachuteData): Promise<void> {
  try {
    const db = await getDb();
    const { timestamp, ...params } = payload;

    if (!timestamp || String(timestamp).trim() === '') {
      console.warn('[DB] Dropping telemetry packet: missing or empty timestamp.', {
        kind: (payload as any).kind,
        keys: Object.keys(params),
      });
      return;
    }

    let baseData: Record<string, any> = {};
    let isUpdate = false;

    // 1. Try to get base data from memory cache or DB
    if (lastTelemetryRow && lastTelemetryRow.timestamp === timestamp) {
      // Same timestamp (partial update for same record)
      baseData = { ...lastTelemetryRow };
      isUpdate = true;
    } else {
      // Different timestamp.
      // Check if we already have this specific timestamp in DB (could be a delayed partial)
      const [existingResult] = await db.executeSql(
        'SELECT * FROM telemetry_history WHERE timestamp = ?',
        [timestamp],
      );

      if (existingResult.rows.length > 0) {
        isUpdate = true;
        const row = existingResult.rows.item(0);
        TELEMETRY_COLUMNS.forEach(col => {
          baseData[col] = getRowValue(row, col);
        });
      } else if (lastTelemetryRow && lastTelemetryRow.timestamp < timestamp) {
        // Optimization: inherit from the in-memory cache if it's the immediate predecessor
        baseData = { ...lastTelemetryRow };
        console.log(`[DB] Inheriting for ${timestamp} from cache (${lastTelemetryRow.timestamp})`);
      } else {
        // Fallback: search DB for most recent previous row
        const [lastRowResult] = await db.executeSql(
          'SELECT * FROM telemetry_history WHERE timestamp < ? ORDER BY timestamp DESC LIMIT 1',
          [timestamp],
        );

        if (lastRowResult.rows.length > 0) {
          const row = lastRowResult.rows.item(0);
          console.log(`[DB] Inheriting for ${timestamp} from DB (${row.timestamp})`);
          TELEMETRY_COLUMNS.forEach(col => {
            baseData[col] = getRowValue(row, col);
          });
        } else {
          // First row ever
          TELEMETRY_COLUMNS.forEach(col => {
            baseData[col] = null;
          });
        }
      }
    }

    // 2. Merge incoming parameters into base data
    // Only merge non-undefined and non-null values to avoid wiping out existing data
    Object.keys(params).forEach(key => {
      if (TELEMETRY_COLUMNS.includes(key) && params[key] !== undefined && params[key] !== null) {
        let val = params[key];
        if (typeof val === 'boolean') {
          val = val ? 1 : 0;
        }
        baseData[key] = val;
      }
    });

    // 3. Save the complete row back to DB
    const cols = ['timestamp', ...TELEMETRY_COLUMNS].join(', ');
    const placeholders = ['?', ...TELEMETRY_COLUMNS.map(() => '?')].join(', ');
    const values = [timestamp, ...TELEMETRY_COLUMNS.map(col => baseData[col])];

    await db.executeSql(
      `INSERT OR REPLACE INTO telemetry_history (${cols}) VALUES (${placeholders})`,
      values,
    );
    
    // Update cache
    lastTelemetryRow = { ...baseData, timestamp };

    console.log(`[DB] ${isUpdate ? 'Updated' : 'Stored'} telemetry for ${timestamp}. Merged keys:`, 
      Object.keys(params).filter(k => TELEMETRY_COLUMNS.includes(k))
    );
  } catch (error) {
    console.error('[DB] Error storing telemetry:', error);
  }
}

export async function queueTelemetry(kind: TelemetryKind, payload: object): Promise<void> {
  // Maintaining this signature for compatibility during migration, but it now calls storeTelemetry
  await storeTelemetry(payload as any);
}

export async function queueAlert(payload: object): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    'INSERT INTO alerts_queue (payload, created_at, synced) VALUES (?, ?, 0)',
    [JSON.stringify(payload), new Date().toISOString()],
  );
}

export async function getPendingTelemetry(limit = 100): Promise<QueueRow[]> {
  // This is now legacy since we scrapped telemetry_queue, returning empty for now
  // to avoid breaking sync service completely before it's updated.
  return [];
}

export async function markTelemetrySynced(ids: number[]): Promise<void> {
  // Legacy
}

export async function getTelemetryHistory(limit = 100): Promise<any[]> {
  const db = await getDb();
  const [result] = await db.executeSql(
    'SELECT * FROM telemetry_history ORDER BY timestamp DESC LIMIT ?',
    [limit],
  );

  const rows: any[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(result.rows.item(i));
  }
  return rows;
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
  // Fetch from the new flat table
  const [result] = await db.executeSql(
    `SELECT *
     FROM telemetry_history
     ORDER BY timestamp DESC
     LIMIT ?`,
    [limit],
  );

  const history: EspData[] = [];

  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i);
    // Convert SQLite 0/1 to boolean for chuteOpened if present
    if (row.chuteOpened !== undefined) {
      row.chuteOpened = Boolean(row.chuteOpened);
    }
    history.push(row as EspData);
  }

  return history.reverse();
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.executeSql('DELETE FROM telemetry_history');
  await db.executeSql('DELETE FROM alerts_queue');
  await db.executeSql('DELETE FROM app_logs');
  await db.executeSql('VACUUM');
}

export async function getAllDatabaseContent(): Promise<any> {
  const db = await getDb();
  
  const [telemetryResult] = await db.executeSql('SELECT * FROM telemetry_history');
  const [alertsResult] = await db.executeSql('SELECT * FROM alerts_queue');
  const [logsResult] = await db.executeSql('SELECT * FROM app_logs');

  const telemetry = [];
  for (let i = 0; i < telemetryResult.rows.length; i++) {
    telemetry.push(telemetryResult.rows.item(i));
  }

  const alerts = [];
  for (let i = 0; i < alertsResult.rows.length; i++) {
    alerts.push(alertsResult.rows.item(i));
  }

  const logs = [];
  for (let i = 0; i < logsResult.rows.length; i++) {
    logs.push(logsResult.rows.item(i));
  }

  return {
    telemetry,
    alerts,
    logs,
    exportedAt: new Date().toISOString(),
  };
}

