import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FEEDS } from '../src/collector/feeds.config';

async function runCollect(): Promise<void> {
  const logger = new Logger('CollectScript');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const enabledCount = FEEDS.filter((feed) => feed.enabled).length;
    logger.log(
      `Contexto standalone inicializado com sucesso (${enabledCount} feeds habilitados). Stub de coleta concluído.`,
    );
  } finally {
    await app.close();
  }
}

runCollect().catch((err: unknown) => {
  console.error('Erro ao executar script de coleta:', err);
  process.exit(1);
});
