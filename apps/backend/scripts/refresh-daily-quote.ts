import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DailyQuoteService } from '../src/daily-quote/daily-quote.service';

async function runRefreshDailyQuote(): Promise<void> {
  const logger = new Logger('RefreshDailyQuoteScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dailyQuoteService = app.get(DailyQuoteService);
    const result = await dailyQuoteService.refreshDailyQuote();
    logger.log(
      `Citação do dia processada (${result.status}): ${result.data.display_date} — ${result.data.author}`,
    );
  } catch (err: unknown) {
    logger.error('Erro fatal ao atualizar a citação do dia:', err);
    throw err;
  } finally {
    await app.close();
  }
}

runRefreshDailyQuote().catch((err: unknown) => {
  console.error('Falha na execução do refresh de citação standalone:', err);
  process.exit(1);
});
