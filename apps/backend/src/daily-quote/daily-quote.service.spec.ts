import assert from 'node:assert/strict';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { describe, it } from 'node:test';
import type { Pool } from 'pg';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import {
  DailyQuoteService,
  type DailyQuoteRow,
  getSaoPauloDateString,
} from './daily-quote.service';
import type { ZenQuotePayload, ZenQuotesService } from './zenquotes.service';

function createInMemoryPool(initialRows: DailyQuoteRow[] = []) {
  const rows: DailyQuoteRow[] = [...initialRows];
  let insertAttempts = 0;

  const pool = {
    query: async (sql: string, params?: unknown[]) => {
      if (sql.includes('WHERE display_date = $1::date')) {
        const targetDate = String(params?.[0] ?? '').slice(0, 10);
        const found = rows.find(
          (r) => String(r.display_date).slice(0, 10) === targetDate,
        );
        return { rows: found ? [found] : [] };
      }

      if (sql.includes('ORDER BY display_date DESC')) {
        const sorted = [...rows].sort((a, b) =>
          String(b.display_date).localeCompare(String(a.display_date)),
        );
        return { rows: sorted.length > 0 ? [sorted[0]] : [] };
      }

      if (sql.includes('INSERT INTO public.daily_quotes')) {
        insertAttempts += 1;
        const [quote, author, displayDate, source] = params as [
          string,
          string,
          string,
          string,
        ];
        const exists = rows.some(
          (r) => String(r.display_date).slice(0, 10) === displayDate,
        );
        if (!exists) {
          rows.push({
            id: `quote-${rows.length + 1}`,
            quote,
            author,
            display_date: displayDate,
            source,
            created_at: new Date().toISOString(),
          });
        }
        return { rows: [] };
      }

      throw new Error(`Query não esperada no mock: ${sql}`);
    },
  } as unknown as Pool;

  return {
    pool,
    rows,
    getInsertAttempts: () => insertAttempts,
  };
}

function createMockZenQuotes(
  handler: () => Promise<ZenQuotePayload>,
): { service: ZenQuotesService; getCallCount: () => number } {
  let calls = 0;
  const service = {
    fetchTodayQuote: async () => {
      calls += 1;
      return handler();
    },
  } as unknown as ZenQuotesService;

  return {
    service,
    getCallCount: () => calls,
  };
}

function createMockContext(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

void describe('DailyQuoteService', () => {
  const fixedDay1 = new Date('2026-11-14T15:00:00.000Z'); // 2026-11-14 BRT
  const fixedDay2 = new Date('2026-11-15T15:00:00.000Z'); // 2026-11-15 BRT

  void it('1. Primeira execução do dia: consulta o ZenQuotes e salva a citação', async () => {
    const { pool, rows } = createInMemoryPool();
    const { service: zen, getCallCount } = createMockZenQuotes(async () => ({
      quote: 'Quality means doing it right when no one is looking.',
      author: 'Henry Ford',
      source: 'https://zenquotes.io',
    }));

    const dailyQuoteService = new DailyQuoteService(pool, zen);
    const result = await dailyQuoteService.refreshDailyQuote(fixedDay1);

    assert.equal(getCallCount(), 1);
    assert.equal(result.status, 'created');
    assert.equal(result.data.quote, 'Quality means doing it right when no one is looking.');
    assert.equal(result.data.author, 'Henry Ford');
    assert.equal(result.data.display_date, '2026-11-14');
    assert.equal(result.data.source, 'ZenQuotes');
    assert.equal(result.data.is_fallback, false);
    assert.equal(rows.length, 1);
  });

  void it('2. Segunda execução no mesmo dia: reutiliza o registro existente sem chamar ZenQuotes', async () => {
    const { pool } = createInMemoryPool([
      {
        id: 'q1',
        quote: 'Existing quote',
        author: 'Author One',
        display_date: '2026-11-14',
        source: 'https://zenquotes.io',
        created_at: '2026-11-14T03:10:00.000Z',
      },
    ]);
    const { service: zen, getCallCount } = createMockZenQuotes(async () => {
      throw new Error('Não deveria consultar ZenQuotes novamente');
    });

    const dailyQuoteService = new DailyQuoteService(pool, zen);
    const result = await dailyQuoteService.refreshDailyQuote(fixedDay1);

    assert.equal(getCallCount(), 0);
    assert.equal(result.status, 'already_exists');
    assert.equal(result.data.quote, 'Existing quote');
    assert.equal(result.data.is_fallback, false);
  });

  void it('3. Vários usuários recebem a mesma citação global', async () => {
    const { pool } = createInMemoryPool([
      {
        id: 'q1',
        quote: 'Shared wisdom',
        author: 'Ada Lovelace',
        display_date: '2026-11-14',
        source: 'https://zenquotes.io',
        created_at: '2026-11-14T03:10:00.000Z',
      },
    ]);
    const { service: zen } = createMockZenQuotes(async () => ({
      quote: 'Unused',
      author: 'Unused',
      source: 'https://zenquotes.io',
    }));

    const dailyQuoteService = new DailyQuoteService(pool, zen);
    const [userA, userB, userC] = await Promise.all([
      dailyQuoteService.getDailyQuote(fixedDay1),
      dailyQuoteService.getDailyQuote(fixedDay1),
      dailyQuoteService.getDailyQuote(fixedDay1),
    ]);

    assert.deepEqual(userA, userB);
    assert.deepEqual(userB, userC);
    assert.equal(userA.quote, 'Shared wisdom');
  });

  void it('4. API indisponível: utiliza última citação válida como fallback sem apagar anteriores', async () => {
    const { pool, rows } = createInMemoryPool([
      {
        id: 'q-prev',
        quote: 'Yesterday quote',
        author: 'Marcus Aurelius',
        display_date: '2026-11-13',
        source: 'https://zenquotes.io',
        created_at: '2026-11-13T03:10:00.000Z',
      },
    ]);
    const { service: zen } = createMockZenQuotes(async () => {
      throw new Error('ZenQuotes timeout');
    });

    const dailyQuoteService = new DailyQuoteService(pool, zen);
    const refreshResult = await dailyQuoteService.refreshDailyQuote(fixedDay1);
    const publicResult = await dailyQuoteService.getDailyQuote(fixedDay1);

    assert.equal(refreshResult.status, 'fallback');
    assert.equal(refreshResult.data.is_fallback, true);
    assert.equal(refreshResult.data.display_date, '2026-11-13');
    assert.equal(publicResult.is_fallback, true);
    assert.equal(publicResult.quote, 'Yesterday quote');
    assert.equal(rows.length, 1);
  });

  void it('5. Resposta inválida: não grava dados incorretos no banco', async () => {
    const { pool, rows, getInsertAttempts } = createInMemoryPool([
      {
        id: 'q-prev',
        quote: 'Valid previous quote',
        author: 'Seneca',
        display_date: '2026-11-13',
        source: 'https://zenquotes.io',
        created_at: '2026-11-13T03:10:00.000Z',
      },
    ]);
    const { service: zen } = createMockZenQuotes(async () => {
      throw new Error('Campos "q" ou "a" ausentes na resposta do ZenQuotes.');
    });

    const dailyQuoteService = new DailyQuoteService(pool, zen);
    const result = await dailyQuoteService.refreshDailyQuote(fixedDay1);

    assert.equal(getInsertAttempts(), 0);
    assert.equal(rows.length, 1);
    assert.equal(result.status, 'fallback');
    assert.equal(result.data.quote, 'Valid previous quote');
  });

  void it('6. Execuções simultâneas: não criam registros duplicados nem chamadas repetidas', async () => {
    const { pool, rows } = createInMemoryPool();
    const { service: zen, getCallCount } = createMockZenQuotes(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
      return {
        quote: 'Atomic quote',
        author: 'Grace Hopper',
        source: 'https://zenquotes.io',
      };
    });

    const dailyQuoteService = new DailyQuoteService(pool, zen);
    const [r1, r2, r3] = await Promise.all([
      dailyQuoteService.refreshDailyQuote(fixedDay1),
      dailyQuoteService.refreshDailyQuote(fixedDay1),
      dailyQuoteService.refreshDailyQuote(fixedDay1),
    ]);

    assert.equal(getCallCount(), 1);
    assert.equal(rows.length, 1);
    assert.equal(r1.data.quote, 'Atomic quote');
    assert.equal(r2.data.quote, 'Atomic quote');
    assert.equal(r3.data.quote, 'Atomic quote');
  });

  void it('7. Mudança de data em America/Sao_Paulo: permite buscar nova citação no dia seguinte', async () => {
    const { pool, rows } = createInMemoryPool([
      {
        id: 'q1',
        quote: 'Day 1 quote',
        author: 'Author 1',
        display_date: '2026-11-14',
        source: 'https://zenquotes.io',
        created_at: '2026-11-14T03:10:00.000Z',
      },
    ]);
    const { service: zen, getCallCount } = createMockZenQuotes(async () => ({
      quote: 'Day 2 quote',
      author: 'Author 2',
      source: 'https://zenquotes.io',
    }));

    assert.equal(
      getSaoPauloDateString(new Date('2026-11-15T02:59:00.000Z')),
      '2026-11-14',
    );
    assert.equal(
      getSaoPauloDateString(new Date('2026-11-15T03:05:00.000Z')),
      '2026-11-15',
    );

    const dailyQuoteService = new DailyQuoteService(pool, zen);
    const result = await dailyQuoteService.refreshDailyQuote(fixedDay2);

    assert.equal(getCallCount(), 1);
    assert.equal(result.status, 'created');
    assert.equal(result.data.display_date, '2026-11-15');
    assert.equal(rows.length, 2);
  });

  void it('8. Segurança: usuário comum ou sem ADMIN_API_KEY válido não executa atualização administrativa', () => {
    const previousKey = process.env.ADMIN_API_KEY;
    process.env.ADMIN_API_KEY = 'super-secret-admin-key';

    try {
      const guard = new AdminApiKeyGuard();

      assert.throws(
        () => guard.canActivate(createMockContext({})),
        UnauthorizedException,
      );

      assert.throws(
        () =>
          guard.canActivate(
            createMockContext({ 'x-admin-token': 'wrong-token' }),
          ),
        UnauthorizedException,
      );

      assert.equal(
        guard.canActivate(
          createMockContext({ 'x-admin-token': 'super-secret-admin-key' }),
        ),
        true,
      );
    } finally {
      if (previousKey === undefined) {
        delete process.env.ADMIN_API_KEY;
      } else {
        process.env.ADMIN_API_KEY = previousKey;
      }
    }
  });

  void it('9. Leitura pública: busca e grava automaticamente a citação do dia quando ainda não existe no banco', async () => {
    const { pool, rows } = createInMemoryPool([
      {
        id: 'q1',
        quote: 'Old quote',
        author: 'Old Author',
        display_date: '2026-11-14',
        source: 'https://zenquotes.io',
        created_at: '2026-11-14T03:10:00.000Z',
      },
    ]);
    const { service: zen, getCallCount } = createMockZenQuotes(async () => ({
      quote: 'Fresh today quote',
      author: 'New Author',
      source: 'https://zenquotes.io',
    }));

    const dailyQuoteService = new DailyQuoteService(pool, zen);
    const result = await dailyQuoteService.getDailyQuote(fixedDay2);

    assert.equal(getCallCount(), 1);
    assert.equal(result.display_date, '2026-11-15');
    assert.equal(result.quote, 'Fresh today quote');
    assert.equal(result.is_fallback, false);
    assert.equal(rows.length, 2);
  });
});
