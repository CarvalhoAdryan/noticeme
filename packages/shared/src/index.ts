import { z } from 'zod';

export const NewsCategorySchema = z.enum([
  'geral',
  'politica',
  'economia',
  'tecnologia',
  'mundo',
  'esportes',
  'ciencia-saude',
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

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const PaginationCursorSchema = z.object({
  published_at: z.string().datetime(),
  id: z.string().uuid(),
});

export type PaginationCursor = z.infer<typeof PaginationCursorSchema>;
