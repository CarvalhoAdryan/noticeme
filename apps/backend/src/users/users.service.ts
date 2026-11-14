import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NewsCategorySchema,
  type Category,
  type NewsCategory,
  type PaginatedArticlesResponse,
  type UserArticleState,
  type UserProfile,
} from '@dailybrief/shared';
import { Pool } from 'pg';
import {
  ArticlesService,
  type ArticleQueryRow,
} from '../articles/articles.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { decodeCursor, encodeCursor } from '../common/cursor.utils';
import { PG_POOL } from '../database/database.module';
import type { ListFavoritesQueryDto } from './dto/list-favorites-query.dto';
import type { UpdateArticleStateDto } from './dto/update-article-state.dto';

interface ProfileRow {
  id: string;
  display_name: string | null;
  created_at: Date | string;
}

interface UserArticleRow {
  is_favorite: boolean;
  read_at: Date | string | null;
  hidden: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly articlesService: ArticlesService,
  ) {}

  async syncAndGetProfile(
    user: AuthenticatedUser,
    displayName?: string,
  ): Promise<UserProfile> {
    const profileRes = await this.pool.query<ProfileRow>(
      `
      INSERT INTO public.profiles (id, display_name)
      VALUES ($1::uuid, $2)
      ON CONFLICT (id) DO UPDATE
      SET display_name = COALESCE($2, public.profiles.display_name)
      RETURNING id, display_name, created_at
      `,
      [user.id, displayName ?? null],
    );

    const profile = profileRes.rows[0];

    const categoriesRes = await this.pool.query<{ slug: NewsCategory }>(
      `
      SELECT c.slug
      FROM public.user_categories uc
      INNER JOIN public.categories c ON c.id = uc.category_id
      WHERE uc.user_id = $1::uuid
      ORDER BY c.slug ASC
      `,
      [user.id],
    );

    const createdAt =
      profile.created_at instanceof Date
        ? profile.created_at.toISOString()
        : new Date(profile.created_at).toISOString();

    return {
      id: profile.id,
      email: user.email,
      displayName: profile.display_name,
      createdAt,
      categories: categoriesRes.rows.map((r) => r.slug),
    };
  }

  async getUserCategories(userId: string): Promise<Category[]> {
    const res = await this.pool.query<Category>(
      `
      SELECT c.id, c.slug, c.name
      FROM public.user_categories uc
      INNER JOIN public.categories c ON c.id = uc.category_id
      WHERE uc.user_id = $1::uuid
      ORDER BY c.slug ASC
      `,
      [userId],
    );
    return res.rows;
  }

  async setUserCategories(
    userId: string,
    slugs: NewsCategory[],
  ): Promise<Category[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `
        INSERT INTO public.profiles (id)
        VALUES ($1::uuid)
        ON CONFLICT (id) DO NOTHING
        `,
        [userId],
      );

      await client.query(
        `DELETE FROM public.user_categories WHERE user_id = $1::uuid`,
        [userId],
      );

      if (slugs.length > 0) {
        await client.query(
          `
          INSERT INTO public.user_categories (user_id, category_id)
          SELECT $1::uuid, c.id
          FROM public.categories c
          WHERE c.slug = ANY($2::text[])
          ON CONFLICT (user_id, category_id) DO NOTHING
          `,
          [userId, slugs],
        );
      }

      await client.query('COMMIT');
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return this.getUserCategories(userId);
  }

  async followCategory(userId: string, slug: string): Promise<Category[]> {
    const parsed = NewsCategorySchema.safeParse(slug);
    if (!parsed.success) {
      throw new BadRequestException(`Categoria inválida: ${slug}`);
    }

    await this.pool.query(
      `
      INSERT INTO public.profiles (id)
      VALUES ($1::uuid)
      ON CONFLICT (id) DO NOTHING
      `,
      [userId],
    );

    const res = await this.pool.query(
      `
      INSERT INTO public.user_categories (user_id, category_id)
      SELECT $1::uuid, c.id
      FROM public.categories c
      WHERE c.slug = $2
      ON CONFLICT (user_id, category_id) DO NOTHING
      `,
      [userId, parsed.data],
    );

    if (res.rowCount === 0) {
      const catCheck = await this.pool.query(
        `SELECT 1 FROM public.categories WHERE slug = $1`,
        [parsed.data],
      );
      if (catCheck.rowCount === 0) {
        throw new NotFoundException(`Categoria "${slug}" não encontrada.`);
      }
    }

    return this.getUserCategories(userId);
  }

  async unfollowCategory(userId: string, slug: string): Promise<Category[]> {
    const parsed = NewsCategorySchema.safeParse(slug);
    if (!parsed.success) {
      throw new BadRequestException(`Categoria inválida: ${slug}`);
    }

    await this.pool.query(
      `
      DELETE FROM public.user_categories uc
      USING public.categories c
      WHERE uc.category_id = c.id
        AND uc.user_id = $1::uuid
        AND c.slug = $2
      `,
      [userId, parsed.data],
    );

    return this.getUserCategories(userId);
  }

  async updateArticleState(
    userId: string,
    articleId: string,
    dto: UpdateArticleStateDto,
  ): Promise<UserArticleState> {
    if (
      dto.isFavorite === undefined &&
      dto.markAsRead === undefined &&
      dto.hidden === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar (isFavorite, markAsRead ou hidden).',
      );
    }

    const articleExists = await this.pool.query(
      `SELECT 1 FROM public.articles WHERE id = $1::uuid LIMIT 1`,
      [articleId],
    );

    if (articleExists.rowCount === 0) {
      throw new NotFoundException('Artigo não encontrado.');
    }

    const res = await this.pool.query<UserArticleRow>(
      `
      INSERT INTO public.user_articles (
        user_id,
        article_id,
        is_favorite,
        read_at,
        hidden,
        updated_at
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        COALESCE($3::boolean, false),
        CASE WHEN $4::boolean IS TRUE THEN now() ELSE NULL END,
        COALESCE($5::boolean, false),
        now()
      )
      ON CONFLICT (user_id, article_id) DO UPDATE
      SET
        is_favorite = COALESCE($3::boolean, public.user_articles.is_favorite),
        read_at = CASE
          WHEN $4::boolean IS TRUE THEN COALESCE(public.user_articles.read_at, now())
          WHEN $4::boolean IS FALSE THEN NULL
          ELSE public.user_articles.read_at
        END,
        hidden = COALESCE($5::boolean, public.user_articles.hidden),
        updated_at = now()
      RETURNING is_favorite, read_at, hidden
      `,
      [
        userId,
        articleId,
        dto.isFavorite ?? null,
        dto.markAsRead ?? null,
        dto.hidden ?? null,
      ],
    );

    const row = res.rows[0];
    const readAt =
      row.read_at == null
        ? null
        : row.read_at instanceof Date
          ? row.read_at.toISOString()
          : new Date(row.read_at).toISOString();

    return {
      isFavorite: row.is_favorite,
      readAt,
      hidden: row.hidden,
    };
  }

  async listFavoriteArticles(
    userId: string,
    query: ListFavoritesQueryDto,
  ): Promise<PaginatedArticlesResponse> {
    const limit = query.limit ?? 20;
    const params: unknown[] = [userId];
    const conditions: string[] = [`ua.is_favorite = true`];

    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      params.push(decoded.published_at, decoded.id);
      const pubIdx = params.length - 1;
      const idIdx = params.length;
      conditions.push(
        `(a.published_at, a.id) < ($${pubIdx}::timestamptz, $${idIdx}::uuid)`,
      );
    }

    params.push(limit + 1);
    const limitIdx = params.length;

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
      FROM public.user_articles ua
      INNER JOIN public.articles a ON a.id = ua.article_id
      INNER JOIN public.sources s ON s.id = a.source_id
      WHERE ua.user_id = $1::uuid
        AND ${conditions.join(' AND ')}
      ORDER BY a.published_at DESC, a.id DESC
      LIMIT $${limitIdx}
      `,
      params,
    );

    const hasMore = res.rows.length > limit;
    const slice = hasMore ? res.rows.slice(0, limit) : res.rows;
    const data = slice.map((row) =>
      this.articlesService.mapRowToFeedItem(row, true),
    );

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
}
