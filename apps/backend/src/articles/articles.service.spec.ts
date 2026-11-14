import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { decodeCursor } from '../common/cursor.utils';
import { ArticlesService, type ArticleQueryRow } from './articles.service';

function createMockRow(id: string, publishedAt: string): ArticleQueryRow {
  return {
    id,
    title: `Notícia ${id}`,
    description: 'Resumo curto da notícia',
    url: `https://exemplo.com/${id}`,
    image_url: null,
    author: 'Redação',
    published_at: new Date(publishedAt),
    collected_at: new Date(publishedAt),
    summary: null,
    source_id: '11111111-1111-4111-8111-111111111111',
    source_slug: 'g1-geral',
    source_name: 'g1',
    categories: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        slug: 'geral',
        name: 'Geral',
      },
    ],
    is_favorite: true,
    read_at: null,
    hidden: false,
  };
}

void describe('ArticlesService', () => {
  void it('deve paginar artigos por cursor composto (published_at, id) e gerar nextCursor', async () => {
    let capturedSql = '';
    let capturedParams: unknown[] = [];

    const mockPool = {
      query: async (sql: string, params: unknown[]) => {
        capturedSql = sql;
        capturedParams = params;
        return {
          rows: [
            createMockRow(
              '550e8400-e29b-41d4-a716-446655440001',
              '2026-11-14T10:00:00.000Z',
            ),
            createMockRow(
              '550e8400-e29b-41d4-a716-446655440002',
              '2026-11-14T09:00:00.000Z',
            ),
            createMockRow(
              '550e8400-e29b-41d4-a716-446655440003',
              '2026-11-14T08:00:00.000Z',
            ),
          ],
        };
      },
    } as unknown as Pool;

    const service = new ArticlesService(mockPool);
    const result = await service.listArticles(
      {
        limit: 2,
        category: 'tecnologia',
        q: 'inteligência',
      },
      '99999999-9999-4999-8999-999999999999',
    );

    assert.equal(result.data.length, 2);
    assert.equal(result.hasMore, true);
    assert.ok(result.nextCursor);

    const decoded = decodeCursor(result.nextCursor);
    assert.equal(decoded.id, '550e8400-e29b-41d4-a716-446655440002');
    assert.equal(decoded.published_at, '2026-11-14T09:00:00.000Z');
    assert.equal(result.data[0].userState?.isFavorite, true);

    assert.match(capturedSql, /websearch_to_tsquery/);
    assert.match(capturedSql, /ORDER BY a\.published_at DESC, a\.id DESC/);
    assert.deepEqual(capturedParams, [
      '99999999-9999-4999-8999-999999999999',
      'tecnologia',
      'inteligência',
      3,
    ]);
  });

  void it('deve lançar NotFoundException quando artigo não existir', async () => {
    const mockPool = {
      query: async () => ({ rows: [] }),
    } as unknown as Pool;

    const service = new ArticlesService(mockPool);
    await assert.rejects(
      () => service.getArticleById('550e8400-e29b-41d4-a716-446655440000'),
      NotFoundException,
    );
  });
});
