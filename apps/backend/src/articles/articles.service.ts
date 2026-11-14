import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ArticleFeedItem,
  Category,
  NewsCategory,
  PaginatedArticlesResponse,
} from '@dailybrief/shared';
import { Pool } from 'pg';
import { decodeCursor, encodeCursor } from '../common/cursor.utils';
import { PG_POOL } from '../database/database.module';
import type { ListArticlesQueryDto } from './dto/list-articles-query.dto';

export interface ArticleQueryRow {
  id: string;
  title: string;
  description: string | null;
  url: string;
  image_url: string | null;
  author: string | null;
  published_at: Date | string;
  collected_at: Date | string;
  summary: string | null;
  source_id: string;
  source_slug: string;
  source_name: string;
  categories: Array<{ id: string; slug: NewsCategory; name: string }> | null;
  is_favorite: boolean | null;
  read_at: Date | string | null;
  hidden: boolean | null;
}

@Injectable()
export class ArticlesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listCategories(): Promise<Category[]> {
    const res = await this.pool.query<Category>(`
      SELECT id, slug, name
      FROM public.categories
      ORDER BY
        CASE slug
          WHEN 'geral' THEN 1
          WHEN 'politica' THEN 2
          WHEN 'economia' THEN 3
          WHEN 'tecnologia' THEN 4
          WHEN 'mundo' THEN 5
          WHEN 'esportes' THEN 6
          WHEN 'ciencia-saude' THEN 7
          WHEN 'maranhao' THEN 8
          ELSE 99
        END ASC
    `);
    return res.rows;
  }

  async listArticles(
    query: ListArticlesQueryDto,
    userId?: string | null,
  ): Promise<PaginatedArticlesResponse> {
    const limit = query.limit ?? 20;

    let cursorPublishedAt: string | undefined;
    let cursorId: string | undefined;

    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      cursorPublishedAt = decoded.published_at;
      cursorId = decoded.id;
    } else if (query.cursorPublishedAt || query.cursorId) {
      if (!query.cursorPublishedAt || !query.cursorId) {
        throw new BadRequestException(
          'cursorPublishedAt e cursorId devem ser informados juntos.',
        );
      }
      cursorPublishedAt = query.cursorPublishedAt;
      cursorId = query.cursorId;
    }

    const params: unknown[] = [];
    const conditions: string[] = [];

    let userJoinSql = `
      LEFT JOIN public.user_articles ua
        ON false
    `;

    if (userId) {
      params.push(userId);
      const userIdx = params.length;
      userJoinSql = `
        LEFT JOIN public.user_articles ua
          ON ua.article_id = a.id AND ua.user_id = $${userIdx}::uuid
      `;
      conditions.push(`COALESCE(ua.hidden, false) = false`);
    }

    if (cursorPublishedAt && cursorId) {
      params.push(cursorPublishedAt, cursorId);
      const pubIdx = params.length - 1;
      const idIdx = params.length;
      conditions.push(
        `(a.published_at, a.id) < ($${pubIdx}::timestamptz, $${idIdx}::uuid)`,
      );
    }

    if (query.category) {
      params.push(query.category);
      const catIdx = params.length;
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM public.article_categories ac
          INNER JOIN public.categories c ON c.id = ac.category_id
          WHERE ac.article_id = a.id
            AND c.slug = $${catIdx}
        )
      `);
    }

    if (query.onlyFollowed && userId) {
      params.push(userId);
      const followUserIdx = params.length;
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM public.article_categories ac
          INNER JOIN public.user_categories uc ON uc.category_id = ac.category_id
          WHERE ac.article_id = a.id
            AND uc.user_id = $${followUserIdx}::uuid
        )
      `);
    }

    if (query.source) {
      params.push(query.source.trim());
      const srcIdx = params.length;
      conditions.push(`s.slug = $${srcIdx}`);
    }

    const searchTerm = (query.q ?? query.search)?.trim();
    if (searchTerm) {
      params.push(searchTerm);
      const searchIdx = params.length;
      conditions.push(`
        (
          to_tsvector('portuguese', a.title || ' ' || coalesce(a.description, ''))
            @@ websearch_to_tsquery('portuguese', $${searchIdx})
          OR a.title ILIKE '%' || $${searchIdx} || '%'
        )
      `);
    }

    params.push(limit + 1);
    const limitIdx = params.length;

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        a.id,
        a.title,
        a.description,
        a.url,
        a.image_url,
        a.author,
        a.published_at,
        a.collected_at,
        a.summary,
        s.id AS source_id,
        s.slug AS source_slug,
        s.name AS source_name,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('id', c.id, 'slug', c.slug, 'name', c.name)
            )
            FROM public.article_categories ac
            INNER JOIN public.categories c ON c.id = ac.category_id
            WHERE ac.article_id = a.id
          ),
          '[]'::json
        ) AS categories,
        ua.is_favorite,
        ua.read_at,
        ua.hidden
      FROM public.articles a
      INNER JOIN public.sources s ON s.id = a.source_id
      ${userJoinSql}
      ${whereClause}
      ORDER BY a.published_at DESC, a.id DESC
      LIMIT $${limitIdx}
    `;

    const res = await this.pool.query<ArticleQueryRow>(sql, params);
    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;

    const data = slice.map((row) => this.mapRowToFeedItem(row, Boolean(userId)));

    const lastItem = data[data.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? encodeCursor({
            published_at: lastItem.publishedAt,
            id: lastItem.id,
          })
        : null;

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async getArticleById(
    articleId: string,
    userId?: string | null,
  ): Promise<ArticleFeedItem> {
    const params: unknown[] = [articleId];
    let userJoinSql = `LEFT JOIN public.user_articles ua ON false`;

    if (userId) {
      params.push(userId);
      userJoinSql = `
        LEFT JOIN public.user_articles ua
          ON ua.article_id = a.id AND ua.user_id = $2::uuid
      `;
    }

    const res = await this.pool.query<ArticleQueryRow>(
      `
      SELECT
        a.id,
        a.title,
        a.description,
        a.url,
        a.image_url,
        a.author,
        a.published_at,
        a.collected_at,
        a.summary,
        s.id AS source_id,
        s.slug AS source_slug,
        s.name AS source_name,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('id', c.id, 'slug', c.slug, 'name', c.name)
            )
            FROM public.article_categories ac
            INNER JOIN public.categories c ON c.id = ac.category_id
            WHERE ac.article_id = a.id
          ),
          '[]'::json
        ) AS categories,
        ua.is_favorite,
        ua.read_at,
        ua.hidden
      FROM public.articles a
      INNER JOIN public.sources s ON s.id = a.source_id
      ${userJoinSql}
      WHERE a.id = $1::uuid
      LIMIT 1
      `,
      params,
    );

    const row = res.rows[0];
    if (!row) {
      throw new NotFoundException('Artigo não encontrado.');
    }

    return this.mapRowToFeedItem(row, Boolean(userId));
  }

  public mapRowToFeedItem(
    row: ArticleQueryRow,
    includeUserState: boolean,
  ): ArticleFeedItem {
    const publishedAt =
      row.published_at instanceof Date
        ? row.published_at.toISOString()
        : new Date(row.published_at).toISOString();

    const collectedAt =
      row.collected_at instanceof Date
        ? row.collected_at.toISOString()
        : new Date(row.collected_at).toISOString();

    const readAt =
      row.read_at == null
        ? null
        : row.read_at instanceof Date
          ? row.read_at.toISOString()
          : new Date(row.read_at).toISOString();

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      url: row.url,
      imageUrl: row.image_url,
      author: row.author,
      publishedAt,
      collectedAt,
      summary: row.summary,
      source: {
        id: row.source_id,
        slug: row.source_slug,
        name: row.source_name,
      },
      categories: row.categories ?? [],
      userState: includeUserState
        ? {
            isFavorite: Boolean(row.is_favorite),
            readAt,
            hidden: Boolean(row.hidden),
          }
        : null,
    };
  }
}
