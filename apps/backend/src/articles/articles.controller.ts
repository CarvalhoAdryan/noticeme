import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { ArticleFeedItem, PaginatedArticlesResponse } from '@dailybrief/shared';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalSupabaseAuthGuard } from '../auth/optional-supabase-auth.guard';
import { ArticlesService } from './articles.service';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto';

@Controller('articles')
@UseGuards(OptionalSupabaseAuthGuard)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  async list(
    @Query() query: ListArticlesQueryDto,
    @CurrentUser() user: AuthenticatedUser | null,
  ): Promise<PaginatedArticlesResponse> {
    return this.articlesService.listArticles(query, user?.id ?? null);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser | null,
  ): Promise<ArticleFeedItem> {
    return this.articlesService.getArticleById(id, user?.id ?? null);
  }
}
