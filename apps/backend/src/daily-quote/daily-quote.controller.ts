import type { DailyQuoteResponse } from '@dailybrief/shared';
import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import {
  DailyQuoteService,
  type RefreshDailyQuoteResult,
} from './daily-quote.service';

@Controller()
export class DailyQuoteController {
  constructor(private readonly dailyQuoteService: DailyQuoteService) {}

  @Get('daily-quote')
  async getDailyQuote(): Promise<DailyQuoteResponse> {
    return this.dailyQuoteService.getDailyQuote();
  }

  @Post('admin/daily-quote/refresh')
  @HttpCode(200)
  @UseGuards(AdminApiKeyGuard)
  async refreshDailyQuote(): Promise<RefreshDailyQuoteResult> {
    return this.dailyQuoteService.refreshDailyQuote();
  }
}
