import type { DailyQuoteResponse } from '@dailybrief/shared';
import { apiRequest } from './api';
import {
  areDailyQuotesEqual,
  readCachedDailyQuote,
  writeCachedDailyQuote,
} from './dailyQuoteCache';

let lastSyncedDate: string | null = null;
let inFlightSync: Promise<DailyQuoteResponse | null> | null = null;

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCachedDailyQuote(): DailyQuoteResponse | null {
  return readCachedDailyQuote();
}

export async function syncDailyQuote(
  force = false,
): Promise<DailyQuoteResponse | null> {
  const cached = readCachedDailyQuote();
  const today = getLocalDateString();

  if (
    !force &&
    lastSyncedDate === today &&
    cached &&
    !cached.is_fallback
  ) {
    return cached;
  }

  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async () => {
    try {
      const fresh = await apiRequest<DailyQuoteResponse>('/daily-quote');
      lastSyncedDate = today;

      if (!areDailyQuotesEqual(cached, fresh)) {
        writeCachedDailyQuote(fresh);
      }

      return fresh;
    } catch {
      // Offline ou backend indisponível: mantém última citação em cache
      return cached;
    } finally {
      inFlightSync = null;
    }
  })();

  return inFlightSync;
}
