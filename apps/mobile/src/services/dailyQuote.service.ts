import type { DailyQuoteResponse } from '@dailybrief/shared';
import { apiRequest } from './api';
import {
  areDailyQuotesEqual,
  readCachedDailyQuote,
  writeCachedDailyQuote,
} from './dailyQuoteCache';

let hasSyncedInSession = false;
let inFlightSync: Promise<DailyQuoteResponse | null> | null = null;

export function getCachedDailyQuote(): DailyQuoteResponse | null {
  return readCachedDailyQuote();
}

export async function syncDailyQuote(): Promise<DailyQuoteResponse | null> {
  const cached = readCachedDailyQuote();

  if (hasSyncedInSession && cached) {
    return cached;
  }

  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async () => {
    try {
      const fresh = await apiRequest<DailyQuoteResponse>('/daily-quote');
      hasSyncedInSession = true;

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
