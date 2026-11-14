import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCachedDailyQuote, syncDailyQuote } from './dailyQuote.service.ts';
import { writeCachedDailyQuote } from './dailyQuoteCache.ts';

void describe('DailyQuote Mobile Cache', () => {
  void it('exibe a citação armazenada localmente quando o aplicativo está offline', async () => {
    const cachedSample = {
      quote: 'Offline cached quote',
      author: 'Alan Turing',
      display_date: '2026-11-14',
      source: 'ZenQuotes',
      is_fallback: false,
    };

    writeCachedDailyQuote(cachedSample);
    assert.deepEqual(getCachedDailyQuote(), cachedSample);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Network request failed');
    }) as typeof fetch;

    try {
      const result = await syncDailyQuote();
      assert.deepEqual(result, cachedSample);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
