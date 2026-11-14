import type { DailyQuoteResponse } from '@dailybrief/shared';
import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { ZenQuotesService } from './zenquotes.service';

export interface DailyQuoteRow {
  id: string;
  quote: string;
  author: string;
  display_date: Date | string;
  source: string;
  created_at: Date | string;
}

export interface RefreshDailyQuoteResult {
  status: 'already_exists' | 'created' | 'fallback';
  data: DailyQuoteResponse;
}

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';
const SOURCE_DISPLAY_NAME = 'ZenQuotes';

export function getSaoPauloDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function normalizeDisplayDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

@Injectable()
export class DailyQuoteService {
  private readonly logger = new Logger(DailyQuoteService.name);
  private readonly inFlightRefreshes = new Map<
    string,
    Promise<RefreshDailyQuoteResult>
  >();

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly zenQuotesService: ZenQuotesService,
  ) {}

  async getDailyQuote(now: Date = new Date()): Promise<DailyQuoteResponse> {
    const today = getSaoPauloDateString(now);

    const todayRow = await this.findByDate(today);
    if (todayRow) {
      return this.toResponse(todayRow, false);
    }

    const latestRow = await this.findLatest();
    if (latestRow) {
      return this.toResponse(latestRow, true);
    }

    throw new ServiceUnavailableException(
      'Nenhuma citação do dia disponível no momento.',
    );
  }

  async refreshDailyQuote(
    now: Date = new Date(),
  ): Promise<RefreshDailyQuoteResult> {
    const today = getSaoPauloDateString(now);

    const existingPromise = this.inFlightRefreshes.get(today);
    if (existingPromise) {
      return existingPromise;
    }

    const refreshPromise = this.executeRefresh(today).finally(() => {
      this.inFlightRefreshes.delete(today);
    });

    this.inFlightRefreshes.set(today, refreshPromise);
    return refreshPromise;
  }

  private async executeRefresh(
    today: string,
  ): Promise<RefreshDailyQuoteResult> {
    const existing = await this.findByDate(today);
    if (existing) {
      return {
        status: 'already_exists',
        data: this.toResponse(existing, false),
      };
    }

    try {
      const fetched = await this.zenQuotesService.fetchTodayQuote();

      await this.pool.query<DailyQuoteRow>(
        `
        INSERT INTO public.daily_quotes (quote, author, display_date, source)
        VALUES ($1, $2, $3::date, $4)
        ON CONFLICT (display_date) DO NOTHING
        `,
        [fetched.quote, fetched.author, today, fetched.source],
      );

      const saved = await this.findByDate(today);
      if (saved) {
        return {
          status: 'created',
          data: this.toResponse(saved, false),
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Falha ao atualizar citação do dia (${today}): ${msg}`,
      );
    }

    const fallback = await this.findLatest();
    if (fallback) {
      return {
        status: 'fallback',
        data: this.toResponse(fallback, normalizeDisplayDate(fallback.display_date) !== today),
      };
    }

    throw new ServiceUnavailableException(
      'Não foi possível obter a citação do dia no ZenQuotes e não há fallback disponível.',
    );
  }

  private async findByDate(dateStr: string): Promise<DailyQuoteRow | null> {
    const res = await this.pool.query<DailyQuoteRow>(
      `
      SELECT id, quote, author, display_date, source, created_at
      FROM public.daily_quotes
      WHERE display_date = $1::date
      LIMIT 1
      `,
      [dateStr],
    );
    return res.rows[0] ?? null;
  }

  private async findLatest(): Promise<DailyQuoteRow | null> {
    const res = await this.pool.query<DailyQuoteRow>(
      `
      SELECT id, quote, author, display_date, source, created_at
      FROM public.daily_quotes
      ORDER BY display_date DESC
      LIMIT 1
      `,
    );
    return res.rows[0] ?? null;
  }

  private toResponse(
    row: DailyQuoteRow,
    isFallback: boolean,
  ): DailyQuoteResponse {
    return {
      quote: row.quote,
      author: row.author,
      display_date: normalizeDisplayDate(row.display_date),
      source: SOURCE_DISPLAY_NAME,
      is_fallback: isFallback,
    };
  }
}
