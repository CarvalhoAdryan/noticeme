import type {
  Category,
  NewsCategory,
  PaginatedArticlesResponse,
} from '@dailybrief/shared';
import { apiRequest } from './api';

export interface FetchArticlesParams {
  limit?: number;
  cursor?: string | null;
  category?: NewsCategory | null;
  categories?: NewsCategory[];
  q?: string;
  onlyFollowed?: boolean;
}

export async function fetchArticles(
  params: FetchArticlesParams = {},
): Promise<PaginatedArticlesResponse> {
  const searchParams = new URLSearchParams();

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }
  if (params.category) {
    searchParams.set('category', params.category);
  }
  if (params.categories && params.categories.length > 0) {
    searchParams.set('categories', params.categories.join(','));
  }
  if (params.q && params.q.trim().length > 0) {
    searchParams.set('q', params.q.trim());
  }
  if (params.onlyFollowed) {
    searchParams.set('onlyFollowed', 'true');
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/articles?${queryString}` : '/articles';

  return apiRequest<PaginatedArticlesResponse>(path);
}

export async function fetchCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/categories');
}

