import type {
  Category,
  NewsCategory,
  PaginatedArticlesResponse,
  UserArticleState,
  UserProfile,
} from '@dailybrief/shared';
import { apiRequest } from './api';

export interface AuthSessionResponse {
  accessToken: string;
  user: UserProfile;
}

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthSessionResponse> {
  return apiRequest<AuthSessionResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}

export async function fetchProfileApi(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/me');
}

export async function updateProfileApi(displayName: string): Promise<UserProfile> {
  return apiRequest<UserProfile>('/me', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
}

export async function updateUserCategoriesApi(
  categories: NewsCategory[],
): Promise<Category[]> {
  return apiRequest<Category[]>('/me/categories', {
    method: 'PUT',
    body: JSON.stringify({ categories }),
  });
}

export async function fetchFavoritesApi(
  cursor?: string | null,
  limit = 20,
): Promise<PaginatedArticlesResponse> {
  const searchParams = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    searchParams.set('cursor', cursor);
  }
  return apiRequest<PaginatedArticlesResponse>(
    `/me/favorites?${searchParams.toString()}`,
  );
}

export async function setArticleFavoriteApi(
  articleId: string,
  isFavorite: boolean,
): Promise<UserArticleState> {
  return apiRequest<UserArticleState>(`/me/articles/${articleId}/favorite`, {
    method: isFavorite ? 'POST' : 'DELETE',
  });
}

export async function markArticleReadApi(
  articleId: string,
): Promise<UserArticleState> {
  return apiRequest<UserArticleState>(`/me/articles/${articleId}/read`, {
    method: 'POST',
  });
}

