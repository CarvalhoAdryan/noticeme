import type {
  Category,
  NewsCategory,
  PaginatedArticlesResponse,
} from '@dailybrief/shared';
import { ApiError, apiRequest } from './api';

export interface FetchArticlesParams {
  limit?: number;
  cursor?: string | null;
  category?: NewsCategory | null;
  categories?: NewsCategory[];
  q?: string;
  onlyFollowed?: boolean;
}

function buildArticlesPath(
  params: FetchArticlesParams,
  overrideCategory?: NewsCategory,
): string {
  const searchParams = new URLSearchParams();

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }
  if (overrideCategory) {
    searchParams.set('category', overrideCategory);
  } else if (params.category) {
    searchParams.set('category', params.category);
  } else if (params.categories && params.categories.length === 1) {
    searchParams.set('category', params.categories[0]);
  } else if (params.categories && params.categories.length > 1) {
    searchParams.set('categories', params.categories.join(','));
  }
  if (params.q && params.q.trim().length > 0) {
    searchParams.set('q', params.q.trim());
  }
  if (params.onlyFollowed) {
    searchParams.set('onlyFollowed', 'true');
  }

  const queryString = searchParams.toString();
  return queryString ? `/articles?${queryString}` : '/articles';
}

export async function fetchArticles(
  params: FetchArticlesParams = {},
): Promise<PaginatedArticlesResponse> {
  try {
    return await apiRequest<PaginatedArticlesResponse>(buildArticlesPath(params));
  } catch (err: unknown) {
    // Fallback caso o backend em produção ainda não tenha o filtro `categories[]` publicado
    if (
      params.categories &&
      params.categories.length > 1 &&
      err instanceof ApiError &&
      err.status === 400 &&
      err.message.includes('categories')
    ) {
      const limit = params.limit ?? 20;
      const responses = await Promise.all(
        params.categories.map((cat) =>
          apiRequest<PaginatedArticlesResponse>(
            buildArticlesPath({ ...params, categories: undefined, cursor: null }, cat),
          ),
        ),
      );
      const seen = new Set<string>();
      const merged = responses
        .flatMap((res) => res.data)
        .filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        })
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, limit);

      return {
        data: merged,
        nextCursor: null,
        hasMore: false,
      };
    }

    throw err;
  }
}

export async function fetchCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/categories');
}

