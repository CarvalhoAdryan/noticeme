import { Module } from '@nestjs/common';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { DailyQuoteController } from './daily-quote.controller';
import { DailyQuoteService } from './daily-quote.service';
import { ZenQuotesService } from './zenquotes.service';

@Module({
  controllers: [DailyQuoteController],
  providers: [ZenQuotesService, DailyQuoteService, AdminApiKeyGuard],
  exports: [DailyQuoteService],
})
export class DailyQuoteModule {}
