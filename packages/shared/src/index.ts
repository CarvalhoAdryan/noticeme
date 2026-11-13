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

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const PaginationCursorSchema = z.object({
  published_at: z.string().datetime(),
  id: z.string().uuid(),
});

export type PaginationCursor = z.infer<typeof PaginationCursorSchema>;
