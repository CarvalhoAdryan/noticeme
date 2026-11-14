import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import Parser from 'rss-parser';
import { PG_POOL } from '../database/database.module';
import { cleanText, decodeXmlBuffer, normalizeUrl } from './collector.utils';

export interface SourceRow {
  id: string;
  slug: string;
  name: string;
  feed_url: string;
  default_category_id: string | null;
  etag: string | null;
  last_modified: string | null;
  consecutive_failures: number;
}

export interface CollectionSummary {
  sourcesTotal: number;
  sourcesSuccess: number;
  sourcesFailed: number;
  sourcesNotModified: number;
  articlesInserted: number;
  articlesPurged: number;
  durationMs: number;
}

interface ParsedFeedItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  summary?: string;
  content?: string;
  creator?: string;
  author?: string;
  isoDate?: string;
  pubDate?: string;
  enclosure?: { url?: string; type?: string };
  mediaContent?: { $?: { url?: string } };
  mediaThumbnail?: { $?: { url?: string } };
}

interface PreparedArticleRow {
  title: string;
  description: string | null;
  url: string;
  urlNormalized: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: Date;
}

const USER_AGENT = 'DailyBrief-FeedTester/1.0 (+https://github.com/dailybrief)';
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 5;
const RETENTION_DAYS = 30;

@Injectable()
export class CollectorService {
  private readonly logger = new Logger(CollectorService.name);
  private readonly parser = new Parser<Record<string, unknown>, ParsedFeedItem>({
    customFields: {
      item: [
        ['media:content', 'mediaContent'],
        ['media:thumbnail', 'mediaThumbnail'],
        ['enclosure', 'enclosure'],
      ],
    },
  });

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async runCollection(): Promise<CollectionSummary> {
    const startTime = performance.now();
    this.logger.log('Iniciando ciclo de coleta de notícias RSS...');

    const sourcesResult = await this.pool.query<SourceRow>(`
      SELECT id, slug, name, feed_url, default_category_id, etag, last_modified, consecutive_failures
      FROM public.sources
      WHERE enabled = true
      ORDER BY slug ASC
    `);

    const sources = sourcesResult.rows;
    this.logger.log(`Carregadas ${sources.length} fontes ativas para sincronização.`);

    let sourcesSuccess = 0;
    let sourcesFailed = 0;
    let sourcesNotModified = 0;
    let totalArticlesInserted = 0;

    await this.runWithConcurrency(sources, CONCURRENCY, async (source) => {
      try {
        const result = await this.collectFromSource(source);
        if (result.notModified) {
          sourcesNotModified += 1;
          sourcesSuccess += 1;
        } else {
          sourcesSuccess += 1;
          totalArticlesInserted += result.inserted;
        }
      } catch (err: unknown) {
        sourcesFailed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Falha isolada na fonte "${source.slug}": ${msg}`);
      }
    });

    let articlesPurged = 0;
    try {
      const purgeRes = await this.pool.query<{ purged: number }>(
        'SELECT public.purge_old_articles($1) AS purged',
        [RETENTION_DAYS],
      );
      articlesPurged = purgeRes.rows[0]?.purged ?? 0;
      this.logger.log(
        `Retenção de ${RETENTION_DAYS} dias executada: ${articlesPurged} artigo(s) antigo(s) expurgado(s).`,
      );
    } catch (err: unknown) {
      this.logger.error('Erro ao executar purge_old_articles:', err);
    }

    const durationMs = Math.round(performance.now() - startTime);
    const summary: CollectionSummary = {
      sourcesTotal: sources.length,
      sourcesSuccess,
      sourcesFailed,
      sourcesNotModified,
      articlesInserted: totalArticlesInserted,
      articlesPurged,
      durationMs,
    };

    this.logger.log(
      `Ciclo de coleta finalizado em ${durationMs}ms: ` +
        `${sourcesSuccess}/${sources.length} fontes OK (${sourcesNotModified} sem alterações), ` +
        `${totalArticlesInserted} novos artigos inseridos, ` +
        `${sourcesFailed} falhas.`,
    );

    return summary;
  }

  private async collectFromSource(
    source: SourceRow,
  ): Promise<{ inserted: number; notModified: boolean }> {
    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    };

    if (source.etag) {
      headers['If-None-Match'] = source.etag;
    }
    if (source.last_modified) {
      headers['If-Modified-Since'] = source.last_modified;
    }

    let response: Response;
    try {
      response = await fetch(source.feed_url, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      await this.recordSourceFailure(source.id, `Erro de rede/timeout: ${msg}`);
      throw fetchErr;
    }

    if (response.status === 304) {
      await this.recordSourceSuccess(source.id, source.etag, source.last_modified);
      return { inserted: 0, notModified: true };
    }

    if (!response.ok) {
      const statusMsg = `HTTP ${response.status} ${response.statusText}`;
      await this.recordSourceFailure(source.id, statusMsg);
      throw new Error(statusMsg);
    }

    const newEtag = response.headers.get('etag') || null;
    const newLastModified = response.headers.get('last-modified') || null;

    const xmlBuffer = Buffer.from(await response.arrayBuffer());
    const xml = decodeXmlBuffer(xmlBuffer, response.headers.get('content-type'));
    let feed: Parser.Output<ParsedFeedItem>;
    try {
      feed = await this.parser.parseString(xml);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      await this.recordSourceFailure(source.id, `Erro ao processar XML RSS: ${msg}`);
      throw parseErr;
    }

    const items = feed.items ?? [];
    const cutoffTime = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const seenUrls = new Set<string>();
    const preparedRows: PreparedArticleRow[] = [];

    for (const item of items) {
      const title = cleanText(item.title, 300);
      const url = item.link?.trim();

      if (!title || !url) {
        continue;
      }

      const urlNormalized = normalizeUrl(url);
      if (seenUrls.has(urlNormalized)) {
        continue;
      }

      const rawDate = item.isoDate || item.pubDate;
      const parsedDate = rawDate ? new Date(rawDate) : new Date();
      const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

      if (publishedAt.getTime() < cutoffTime) {
        continue;
      }

      seenUrls.add(urlNormalized);

      preparedRows.push({
        title,
        description: cleanText(item.contentSnippet || item.summary || item.content, 600),
        url,
        urlNormalized,
        imageUrl: this.extractImageUrl(item),
        author: cleanText(item.creator || item.author, 100),
        publishedAt,
      });
    }

    const insertedCount = await this.batchInsertArticles(source, preparedRows);
    await this.recordSourceSuccess(source.id, newEtag, newLastModified);

    return { inserted: insertedCount, notModified: false };
  }

  private async batchInsertArticles(
    source: SourceRow,
    rows: PreparedArticleRow[],
  ): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }

    const titles = rows.map((r) => r.title);
    const descriptions = rows.map((r) => r.description);
    const urls = rows.map((r) => r.url);
    const urlsNormalized = rows.map((r) => r.urlNormalized);
    const imageUrls = rows.map((r) => r.imageUrl);
    const authors = rows.map((r) => r.author);
    const publishedAts = rows.map((r) => r.publishedAt.toISOString());

    if (source.default_category_id) {
      const res = await this.pool.query<{ inserted_count: number }>(
        `
        WITH inserted AS (
          INSERT INTO public.articles (
            source_id, title, description, url, url_normalized, image_url, author, published_at
          )
          SELECT
            $1::uuid,
            u.title,
            u.description,
            u.url,
            u.url_normalized,
            u.image_url,
            u.author,
            u.published_at::timestamptz
          FROM UNNEST(
            $2::text[],
            $3::text[],
            $4::text[],
            $5::text[],
            $6::text[],
            $7::text[],
            $8::text[]
          ) AS u(title, description, url, url_normalized, image_url, author, published_at)
          ON CONFLICT (url_normalized) DO NOTHING
          RETURNING id
        ),
        linked AS (
          INSERT INTO public.article_categories (article_id, category_id)
          SELECT id, $9::uuid FROM inserted
          ON CONFLICT (article_id, category_id) DO NOTHING
        )
        SELECT count(*)::int AS inserted_count FROM inserted
        `,
        [
          source.id,
          titles,
          descriptions,
          urls,
          urlsNormalized,
          imageUrls,
          authors,
          publishedAts,
          source.default_category_id,
        ],
      );

      return res.rows[0]?.inserted_count ?? 0;
    }

    const res = await this.pool.query<{ inserted_count: number }>(
      `
      WITH inserted AS (
        INSERT INTO public.articles (
          source_id, title, description, url, url_normalized, image_url, author, published_at
        )
        SELECT
          $1::uuid,
          u.title,
          u.description,
          u.url,
          u.url_normalized,
          u.image_url,
          u.author,
          u.published_at::timestamptz
        FROM UNNEST(
          $2::text[],
          $3::text[],
          $4::text[],
          $5::text[],
          $6::text[],
          $7::text[],
          $8::text[]
        ) AS u(title, description, url, url_normalized, image_url, author, published_at)
        ON CONFLICT (url_normalized) DO NOTHING
        RETURNING id
      )
      SELECT count(*)::int AS inserted_count FROM inserted
      `,
      [source.id, titles, descriptions, urls, urlsNormalized, imageUrls, authors, publishedAts],
    );

    return res.rows[0]?.inserted_count ?? 0;
  }

  private extractImageUrl(item: ParsedFeedItem): string | null {
    if (item.enclosure?.url && typeof item.enclosure.url === 'string') {
      const type = item.enclosure.type || '';
      if (!type || type.startsWith('image/')) {
        return item.enclosure.url.trim();
      }
    }

    if (item.mediaContent?.$?.url && typeof item.mediaContent.$.url === 'string') {
      return item.mediaContent.$.url.trim();
    }

    if (item.mediaThumbnail?.$?.url && typeof item.mediaThumbnail.$.url === 'string') {
      return item.mediaThumbnail.$.url.trim();
    }

    return null;
  }

  private async recordSourceSuccess(
    sourceId: string,
    etag: string | null,
    lastModified: string | null,
  ): Promise<void> {
    await this.pool.query(
      `
      UPDATE public.sources
      SET
        etag = COALESCE($2, etag),
        last_modified = COALESCE($3, last_modified),
        last_success_at = now(),
        last_error = null,
        consecutive_failures = 0
      WHERE id = $1
      `,
      [sourceId, etag, lastModified],
    );
  }

  private async recordSourceFailure(sourceId: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE public.sources
      SET
        last_error = $2,
        last_error_at = now(),
        consecutive_failures = consecutive_failures + 1
      WHERE id = $1
      `,
      [sourceId, errorMessage.slice(0, 500)],
    );
  }

  private async runWithConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>,
  ): Promise<void> {
    let index = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (index < items.length) {
        const item = items[index++];
        await worker(item);
      }
    });
    await Promise.all(runners);
  }
}
