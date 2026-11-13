import { Global, Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Pool => {
        const logger = new Logger('DatabaseModule');
        const connectionString = configService.get<string>('DATABASE_URL');

        if (!connectionString) {
          logger.warn('DATABASE_URL não definida; Pool criado sem connectionString.');
        }

        const isSupabase = Boolean(connectionString?.includes('supabase.com'));

        const pool = new Pool({
          connectionString,
          ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
        });

        pool.on('error', (err) => {
          logger.error('Erro inesperado no pool do Postgres', err.stack);
        });

        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
