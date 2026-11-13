import Parser from 'rss-parser';
import { FEEDS, type FeedConfig } from '../src/collector/feeds.config';

const USER_AGENT = 'DailyBrief-FeedTester/1.0 (+https://github.com/dailybrief)';
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 5;

type FeedStatus = 'OK' | 'ATENCAO' | 'FALHOU';

interface FeedTestResult {
  slug: string;
  status: FeedStatus;
  ms: number;
  itens: number;
  itensCompletos: number;
  idadeMaisRecenteHoras: number | null;
  etag: boolean;
  lastModified: boolean;
  erro: string;
}

const parser = new Parser();

async function testFeed(feed: FeedConfig): Promise<FeedTestResult> {
  const start = performance.now();

  try {
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const etag = Boolean(response.headers.get('etag'));
    const lastModified = Boolean(response.headers.get('last-modified'));

    if (!response.ok) {
      return {
        slug: feed.slug,
        status: 'FALHOU',
        ms: Math.round(performance.now() - start),
        itens: 0,
        itensCompletos: 0,
        idadeMaisRecenteHoras: null,
        etag,
        lastModified,
        erro: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const xml = await response.text();
    const parsed = await parser.parseString(xml);
    const ms = Math.round(performance.now() - start);

    const items = parsed.items ?? [];
    const totalItems = items.length;

    let completeItems = 0;
    let newestTimestamp: number | null = null;

    for (const item of items) {
      const hasTitle = Boolean(item.title && item.title.trim().length > 0);
      const hasLink = Boolean(item.link && item.link.trim().length > 0);
      const rawDate = item.isoDate ?? item.pubDate;
      const parsedTime = rawDate ? Date.parse(rawDate) : Number.NaN;
      const hasValidDate = !Number.isNaN(parsedTime);

      if (hasTitle && hasLink && hasValidDate) {
        completeItems += 1;
      }

      if (hasValidDate && (newestTimestamp === null || parsedTime > newestTimestamp)) {
        newestTimestamp = parsedTime;
      }
    }

    const newestAgeHours =
      newestTimestamp !== null
        ? Number(Math.max(0, (Date.now() - newestTimestamp) / (1000 * 60 * 60)).toFixed(2))
        : null;

    if (totalItems === 0) {
      return {
        slug: feed.slug,
        status: 'FALHOU',
        ms,
        itens: 0,
        itensCompletos: 0,
        idadeMaisRecenteHoras: null,
        etag,
        lastModified,
        erro: 'Feed sem itens',
      };
    }

    let status: FeedStatus = 'OK';
    const warnings: string[] = [];

    if (completeItems < totalItems) {
      status = 'ATENCAO';
      warnings.push(`${totalItems - completeItems} item(ns) incompleto(s)`);
    }

    if (newestAgeHours === null) {
      status = 'ATENCAO';
      warnings.push('Sem data válida');
    } else if (newestAgeHours > 48) {
      status = 'ATENCAO';
      warnings.push(`Item mais recente tem ${newestAgeHours}h`);
    }

    return {
      slug: feed.slug,
      status,
      ms,
      itens: totalItems,
      itensCompletos: completeItems,
      idadeMaisRecenteHoras: newestAgeHours,
      etag,
      lastModified,
      erro: warnings.join('; '),
    };
  } catch (err: unknown) {
    const ms = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);

    return {
      slug: feed.slug,
      status: 'FALHOU',
      ms,
      itens: 0,
      itensCompletos: 0,
      idadeMaisRecenteHoras: null,
      etag: false,
      lastModified: false,
      erro: message,
    };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let currentIndex = 0;

  async function next(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex;
      currentIndex += 1;
      results[index] = await worker(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  const enabledFeeds = FEEDS.filter((f) => f.enabled);
  console.log(
    `Testando ${enabledFeeds.length} feed(s) habilitado(s) (concorrência: ${CONCURRENCY}, timeout: ${TIMEOUT_MS}ms)...`,
  );

  const results = await runWithConcurrency(enabledFeeds, CONCURRENCY, testFeed);
  console.table(results);
}

main().catch((err: unknown) => {
  console.error('Erro inesperado ao testar feeds:', err);
  process.exit(1);
});
