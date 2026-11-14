import { Injectable, Logger } from '@nestjs/common';

export interface ZenQuotePayload {
  quote: string;
  author: string;
  source: string;
}

interface RawZenQuoteItem {
  q?: unknown;
  a?: unknown;
}

const ZENQUOTES_TODAY_URL = 'https://zenquotes.io/api/today';
const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class ZenQuotesService {
  private readonly logger = new Logger(ZenQuotesService.name);

  async fetchTodayQuote(): Promise<ZenQuotePayload> {
    let response: Response;
    try {
      response = await fetch(ZENQUOTES_TODAY_URL, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'NoticeME-DailyQuote/1.0',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Erro de rede/timeout ao consultar ZenQuotes: ${msg}`);
      throw new Error(`ZenQuotes indisponível: ${msg}`);
    }

    if (!response.ok) {
      const msg = `ZenQuotes retornou HTTP ${response.status} ${response.statusText}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error('Resposta do ZenQuotes não é um JSON válido.');
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Resposta do ZenQuotes vazia ou fora do formato esperado.');
    }

    const first = data[0] as RawZenQuoteItem;
    const quote = typeof first?.q === 'string' ? first.q.trim() : '';
    const author = typeof first?.a === 'string' ? first.a.trim() : '';

    if (!quote || !author) {
      throw new Error('Campos "q" ou "a" ausentes na resposta do ZenQuotes.');
    }

    // Proteção contra mensagens de rate-limit retornadas como citação pelo ZenQuotes
    if (
      author.toLowerCase() === 'zenquotes.io' ||
      quote.toLowerCase().includes('too many requests')
    ) {
      throw new Error(`ZenQuotes retornou mensagem de limite/erro: "${quote}"`);
    }

    return {
      quote,
      author,
      source: 'https://zenquotes.io',
    };
  }
}
