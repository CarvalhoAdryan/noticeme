import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { ArticlesService } from '../articles/articles.service';
import { UsersService } from './users.service';

void describe('UsersService', () => {
  const sampleUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'leitor@dailybrief.app',
    role: 'authenticated',
  };

  void it('deve sincronizar perfil (profiles) e retornar categorias seguidas', async () => {
    let callIndex = 0;
    const mockPool = {
      query: async () => {
        callIndex += 1;
        if (callIndex === 1) {
          return {
            rows: [
              {
                id: sampleUser.id,
                display_name: 'Adryan',
                created_at: new Date('2026-11-14T10:00:00.000Z'),
              },
            ],
          };
        }
        return {
          rows: [{ slug: 'economia' }, { slug: 'tecnologia' }],
        };
      },
    } as unknown as Pool;

    const articlesService = new ArticlesService(mockPool);
    const service = new UsersService(mockPool, articlesService);

    const profile = await service.syncAndGetProfile(sampleUser, 'Adryan');
    assert.deepEqual(profile, {
      id: sampleUser.id,
      email: 'leitor@dailybrief.app',
      displayName: 'Adryan',
      createdAt: '2026-11-14T10:00:00.000Z',
      categories: ['economia', 'tecnologia'],
    });
  });

  void it('deve rejeitar categoria inválida ao seguir categoria', async () => {
    const mockPool = {} as unknown as Pool;
    const articlesService = new ArticlesService(mockPool);
    const service = new UsersService(mockPool, articlesService);

    await assert.rejects(
      () => service.followCategory(sampleUser.id, 'categoria-inexistente'),
      BadRequestException,
    );
  });

  void it('deve atualizar estado do artigo (favorito e leitura) em user_articles', async () => {
    let callIndex = 0;
    const mockPool = {
      query: async () => {
        callIndex += 1;
        if (callIndex === 1) {
          return { rowCount: 1, rows: [{ '?column?': 1 }] };
        }
        return {
          rows: [
            {
              is_favorite: true,
              read_at: new Date('2026-11-14T11:00:00.000Z'),
              hidden: false,
            },
          ],
        };
      },
    } as unknown as Pool;

    const articlesService = new ArticlesService(mockPool);
    const service = new UsersService(mockPool, articlesService);

    const state = await service.updateArticleState(
      sampleUser.id,
      '11111111-1111-4111-8111-111111111111',
      { isFavorite: true, markAsRead: true },
    );

    assert.deepEqual(state, {
      isFavorite: true,
      readAt: '2026-11-14T11:00:00.000Z',
      hidden: false,
    });
  });

  void it('deve lançar NotFoundException ao atualizar estado de artigo inexistente', async () => {
    const mockPool = {
      query: async () => ({ rowCount: 0, rows: [] }),
    } as unknown as Pool;

    const articlesService = new ArticlesService(mockPool);
    const service = new UsersService(mockPool, articlesService);

    await assert.rejects(
      () =>
        service.updateArticleState(
          sampleUser.id,
          '11111111-1111-4111-8111-111111111111',
          { isFavorite: true },
        ),
      NotFoundException,
    );
  });
});
