import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CollectorModule } from './collector/collector.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    CollectorModule,
  ],
})
export class AppModule {}
