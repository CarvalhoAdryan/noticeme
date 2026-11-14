import { z } from 'zod';

export const NewsCategorySchema = z.enum([
  'geral',
  'politica',
  'economia',
  'tecnologia',
  'mundo',
  'esportes',
  'ciencia-saude',
  'engenharia',
  'maranhao',
]);

export type NewsCategory = z.infer<typeof NewsCategorySchema>;

export const CategorySchema = z.object({
  id: z.string().uuid(),
  slug: NewsCategorySchema,
  name: z.string().min(1),
});

export type Category = z.infer<typeof CategorySchema>;

export const SourceSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  feedUrl: z.string().url(),
  siteUrl: z.string().url().nullable(),
  defaultCategoryId: z.string().uuid().nullable(),
  enabled: z.boolean(),
  etag: z.string().nullable(),
  lastModified: z.string().nullable(),
  lastSuccessAt: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
  lastErrorAt: z.string().datetime().nullable(),
  consecutiveFailures: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export type Source = z.infer<typeof SourceSchema>;

export const ArticleSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  url: z.string().url(),
  urlNormalized: z.string().url(),
  imageUrl: z.string().url().nullable(),
  author: z.string().nullable(),
  publishedAt: z.string().datetime(),
  collectedAt: z.string().datetime(),
  summary: z.string().nullable(),
  clusterId: z.string().uuid().nullable(),
});

export type Article = z.infer<typeof ArticleSchema>;

export const UserArticleStateSchema = z.object({
  isFavorite: z.boolean(),
  readAt: z.string().datetime().nullable(),
  hidden: z.boolean(),
});

export type UserArticleState = z.infer<typeof UserArticleStateSchema>;

export const ArticleFeedItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  url: z.string().url(),
  imageUrl: z.string().url().nullable(),
  author: z.string().nullable(),
  publishedAt: z.string().datetime(),
  collectedAt: z.string().datetime(),
  summary: z.string().nullable(),
  source: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
  }),
  categories: z.array(CategorySchema),
  userState: UserArticleStateSchema.nullable(),
});

export type ArticleFeedItem = z.infer<typeof ArticleFeedItemSchema>;

export const PaginatedArticlesResponseSchema = z.object({
  data: z.array(ArticleFeedItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type PaginatedArticlesResponse = z.infer<typeof PaginatedArticlesResponseSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  createdAt: z.string().datetime(),
  categories: z.array(NewsCategorySchema),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const PaginationCursorSchema = z.object({
  published_at: z.string().datetime(),
  id: z.string().uuid(),
});

export type PaginationCursor = z.infer<typeof PaginationCursorSchema>;

export const DailyQuoteResponseSchema = z.object({
  quote: z.string().min(1),
  author: z.string().min(1),
  display_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  is_fallback: z.boolean(),
});

export type DailyQuoteResponse = z.infer<typeof DailyQuoteResponseSchema>;

export interface WeatherLocation {
  name: string;
  admin1?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
  timezone?: string | null;
  isAutomatic?: boolean;
}

export interface WeatherCurrent {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  precipitationProbability: number | null;
  weatherCode: number;
  description: string;
  icon: string;
  isDay: boolean;
}

export interface WeatherHourlyItem {
  time: string;
  temperature: number;
  precipitationProbability: number;
}

export interface WeatherDailyItem {
  date: string;
  weatherCode: number;
  description: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  precipitationProbabilityMax: number;
  sunrise: string | null;
  sunset: string | null;
}

export interface WeatherForecastResponse {
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: WeatherCurrent;
  hourly: WeatherHourlyItem[];
  daily: WeatherDailyItem[];
  fetchedAt: string;
  fromCache: boolean;
  isStale?: boolean;
}

export interface GeocodingResult {
  id: number;
  name: string;
  admin1: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
}
