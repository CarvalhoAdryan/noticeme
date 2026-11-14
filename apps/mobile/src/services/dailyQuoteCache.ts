import type { DailyQuoteResponse } from '@dailybrief/shared';

interface SqliteDatabaseLike {
  execSync: (sql: string) => void;
  runSync: (sql: string, params?: unknown[]) => void;
  getFirstSync: <T>(sql: string, params?: unknown[]) => T | null;
}

interface SqliteModuleLike {
  openDatabaseSync: (databaseName: string) => SqliteDatabaseLike;
}

interface CachedRow {
  quote: string;
  author: string;
  display_date: string;
  source: string;
  is_fallback: number;
}

const DB_NAME = 'noticeme_cache.db';
const MEMORY_CACHE_KEY = 'noticeme:daily_quote';

let memoryFallback: DailyQuoteResponse | null = null;
let cachedDb: SqliteDatabaseLike | null | undefined;

function getSqliteDatabase(): SqliteDatabaseLike | null {
  if (cachedDb !== undefined) {
    return cachedDb;
  }

  try {
    // Carrega expo-sqlite dinamicamente quando disponível no runtime nativo
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqlite = require('expo-sqlite') as SqliteModuleLike;
    if (typeof sqlite?.openDatabaseSync !== 'function') {
      cachedDb = null;
      return null;
    }

    const db = sqlite.openDatabaseSync(DB_NAME);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS daily_quote_cache (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        quote TEXT NOT NULL,
        author TEXT NOT NULL,
        display_date TEXT NOT NULL,
        source TEXT NOT NULL,
        is_fallback INTEGER NOT NULL DEFAULT 0
      );
    `);
    cachedDb = db;
    return db;
  } catch {
    cachedDb = null;
    return null;
  }
}

export function areDailyQuotesEqual(
  a: DailyQuoteResponse | null,
  b: DailyQuoteResponse | null,
): boolean {
  if (!a || !b) return false;
  return (
    a.quote === b.quote &&
    a.author === b.author &&
    a.display_date === b.display_date &&
    a.source === b.source &&
    a.is_fallback === b.is_fallback
  );
}

export function readCachedDailyQuote(): DailyQuoteResponse | null {
  const db = getSqliteDatabase();
  if (db) {
    try {
      const row = db.getFirstSync<CachedRow>(
        'SELECT quote, author, display_date, source, is_fallback FROM daily_quote_cache WHERE id = 1',
      );
      if (row) {
        return {
          quote: row.quote,
          author: row.author,
          display_date: row.display_date,
          source: row.source,
          is_fallback: Boolean(row.is_fallback),
        };
      }
    } catch {
      // Fallback para armazenamento em memória/web
    }
  }

  if (memoryFallback) {
    return memoryFallback;
  }

  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    const raw = storage?.getItem(MEMORY_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyQuoteResponse;
      memoryFallback = parsed;
      return parsed;
    }
  } catch {
    // Ignora falha de leitura no storage web
  }

  return null;
}

export function writeCachedDailyQuote(quote: DailyQuoteResponse): void {
  memoryFallback = quote;

  const db = getSqliteDatabase();
  if (db) {
    try {
      db.runSync(
        `
        INSERT INTO daily_quote_cache (id, quote, author, display_date, source, is_fallback)
        VALUES (1, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          quote = excluded.quote,
          author = excluded.author,
          display_date = excluded.display_date,
          source = excluded.source,
          is_fallback = excluded.is_fallback
        `,
        [
          quote.quote,
          quote.author,
          quote.display_date,
          quote.source,
          quote.is_fallback ? 1 : 0,
        ],
      );
      return;
    } catch {
      // Fallback para storage em memória/web
    }
  }

  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    storage?.setItem(MEMORY_CACHE_KEY, JSON.stringify(quote));
  } catch {
    // Ignora falha de escrita no storage web
  }
}
