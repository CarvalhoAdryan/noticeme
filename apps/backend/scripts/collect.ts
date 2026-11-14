import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CollectorService } from '../src/collector/collector.service';

async function runCollect(): Promise<void> {
  const logger = new Logger('CollectScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const collectorService = app.get(CollectorService);
    const summary = await collectorService.runCollection();
    logger.log(
      `Coleta concluída com sucesso! Fontes processadas: ${summary.sourcesSuccess}/${summary.sourcesTotal}, Artigos novos: ${summary.articlesInserted}, Expurgados: ${summary.articlesPurged}`,
    );
  } catch (err: unknown) {
    logger.error('Erro fatal durante a coleta de notícias:', err);
    throw err;
  } finally {
    await app.close();
  }
}

runCollect().catch((err: unknown) => {
  console.error('Falha na execução do coletor standalone:', err);
  process.exit(1);
});
