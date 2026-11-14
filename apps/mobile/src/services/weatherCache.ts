import type {
  WeatherForecastResponse,
  WeatherLocation,
} from '@dailybrief/shared';

interface SqliteDatabaseLike {
  execSync: (sql: string) => void;
  runSync: (sql: string, params?: unknown[]) => void;
  getFirstSync: <T>(sql: string, params?: unknown[]) => T | null;
}

interface SqliteModuleLike {
  openDatabaseSync: (databaseName: string) => SqliteDatabaseLike;
}

const DB_NAME = 'noticeme_cache.db';
const LOCATION_STORAGE_KEY = 'noticeme:weather_location';
const FORECAST_STORAGE_KEY = 'noticeme:weather_forecast';

let memoryLocation: WeatherLocation | null = null;
let memoryForecast: WeatherForecastResponse | null = null;
let cachedDb: SqliteDatabaseLike | null | undefined;

function getSqliteDatabase(): SqliteDatabaseLike | null {
  if (cachedDb !== undefined) {
    return cachedDb;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqlite = require('expo-sqlite') as SqliteModuleLike;
    if (typeof sqlite?.openDatabaseSync !== 'function') {
      cachedDb = null;
      return null;
    }

    const db = sqlite.openDatabaseSync(DB_NAME);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS weather_location_cache (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS weather_forecast_cache (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        region_key TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `);
    cachedDb = db;
    return db;
  } catch {
    cachedDb = null;
    return null;
  }
}

export function getRegionKey(latitude: number, longitude: number): string {
  return `${(Math.round(latitude * 100) / 100).toFixed(2)},${(Math.round(longitude * 100) / 100).toFixed(2)}`;
}

export function readCachedWeatherLocation(): WeatherLocation | null {
  const db = getSqliteDatabase();
  if (db) {
    try {
      const row = db.getFirstSync<{ payload: string }>(
        'SELECT payload FROM weather_location_cache WHERE id = 1',
      );
      if (row?.payload) {
        const parsed = JSON.parse(row.payload) as WeatherLocation;
        memoryLocation = parsed;
        return parsed;
      }
    } catch {
      // Fallback para memória/web
    }
  }

  if (memoryLocation) {
    return memoryLocation;
  }

  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    const raw = storage?.getItem(LOCATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WeatherLocation;
      memoryLocation = parsed;
      return parsed;
    }
  } catch {
    // Ignora falha de leitura
  }

  return null;
}

export function writeCachedWeatherLocation(location: WeatherLocation): void {
  const sanitized: WeatherLocation = {
    ...location,
    latitude: Math.round(location.latitude * 100) / 100,
    longitude: Math.round(location.longitude * 100) / 100,
  };
  memoryLocation = sanitized;

  const serialized = JSON.stringify(sanitized);
  const db = getSqliteDatabase();
  if (db) {
    try {
      db.runSync(
        `
        INSERT INTO weather_location_cache (id, payload)
        VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET payload = excluded.payload
        `,
        [serialized],
      );
      return;
    } catch {
      // Fallback
    }
  }

  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    storage?.setItem(LOCATION_STORAGE_KEY, serialized);
  } catch {
    // Ignora falha de escrita
  }
}

export function readCachedWeatherForecast(
  location?: WeatherLocation | null,
): WeatherForecastResponse | null {
  const targetRegion = location
    ? getRegionKey(location.latitude, location.longitude)
    : null;

  const db = getSqliteDatabase();
  if (db) {
    try {
      const row = db.getFirstSync<{ region_key: string; payload: string }>(
        'SELECT region_key, payload FROM weather_forecast_cache WHERE id = 1',
      );
      if (row?.payload && (!targetRegion || row.region_key === targetRegion)) {
        const parsed = JSON.parse(row.payload) as WeatherForecastResponse;
        memoryForecast = parsed;
        return parsed;
      }
    } catch {
      // Fallback
    }
  }

  if (
    memoryForecast &&
    (!targetRegion ||
      getRegionKey(
        memoryForecast.location.latitude,
        memoryForecast.location.longitude,
      ) === targetRegion)
  ) {
    return memoryForecast;
  }

  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    const raw = storage?.getItem(FORECAST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WeatherForecastResponse;
      if (
        !targetRegion ||
        getRegionKey(parsed.location.latitude, parsed.location.longitude) ===
          targetRegion
      ) {
        memoryForecast = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignora falha
  }

  return null;
}

export function writeCachedWeatherForecast(
  forecast: WeatherForecastResponse,
): void {
  memoryForecast = forecast;
  const regionKey = getRegionKey(
    forecast.location.latitude,
    forecast.location.longitude,
  );
  const serialized = JSON.stringify(forecast);

  const db = getSqliteDatabase();
  if (db) {
    try {
      db.runSync(
        `
        INSERT INTO weather_forecast_cache (id, region_key, payload)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          region_key = excluded.region_key,
          payload = excluded.payload
        `,
        [regionKey, serialized],
      );
      return;
    } catch {
      // Fallback
    }
  }

  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    storage?.setItem(FORECAST_STORAGE_KEY, serialized);
  } catch {
    // Ignora falha
  }
}
