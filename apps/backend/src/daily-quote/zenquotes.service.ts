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

const ZENQUOTES_ENDPOINTS = [
  'https://zenquotes.io/api/today',
  'https://zenquotes.io/api/random',
];
const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class ZenQuotesService {
  private readonly logger = new Logger(ZenQuotesService.name);

  async fetchTodayQuote(): Promise<ZenQuotePayload> {
    let lastError: Error | null = null;

    for (const endpoint of ZENQUOTES_ENDPOINTS) {
      try {
        return await this.fetchFromEndpoint(endpoint);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `Falha ao consultar ${endpoint}: ${lastError.message}`,
        );
      }
    }

    throw lastError ?? new Error('ZenQuotes indisponível no momento.');
  }

  private async fetchFromEndpoint(endpoint: string): Promise<ZenQuotePayload> {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'NoticeME-DailyQuote/1.0',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`ZenQuotes indisponível: ${msg}`);
    }

    if (!response.ok) {
      throw new Error(
        `ZenQuotes retornou HTTP ${response.status} ${response.statusText}`,
      );
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
