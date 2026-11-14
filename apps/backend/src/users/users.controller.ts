import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  Category,
  PaginatedArticlesResponse,
  UserArticleState,
  UserProfile,
} from '@dailybrief/shared';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ListFavoritesQueryDto } from './dto/list-favorites-query.dto';
import { UpdateArticleStateDto } from './dto/update-article-state.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserCategoriesDto } from './dto/update-user-categories.dto';
import { UsersService } from './users.service';

@Controller('me')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfile> {
    return this.usersService.syncAndGetProfile(user);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.usersService.syncAndGetProfile(user, dto.displayName);
  }

  @Get('categories')
  async getCategories(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Category[]> {
    return this.usersService.getUserCategories(user.id);
  }

  @Put('categories')
  async setCategories(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserCategoriesDto,
  ): Promise<Category[]> {
    return this.usersService.setUserCategories(user.id, dto.categories);
  }

  @Post('categories/:slug')
  @HttpCode(HttpStatus.OK)
  async followCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
  ): Promise<Category[]> {
    return this.usersService.followCategory(user.id, slug);
  }

  @Delete('categories/:slug')
  async unfollowCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
  ): Promise<Category[]> {
    return this.usersService.unfollowCategory(user.id, slug);
  }

  @Get('favorites')
  async listFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFavoritesQueryDto,
  ): Promise<PaginatedArticlesResponse> {
    return this.usersService.listFavoriteArticles(user.id, query);
  }

  @Patch('articles/:articleId')
  async updateArticleState(
    @CurrentUser() user: AuthenticatedUser,
    @Param('articleId', ParseUUIDPipe) articleId: string,
    @Body() dto: UpdateArticleStateDto,
  ): Promise<UserArticleState> {
    return this.usersService.updateArticleState(user.id, articleId, dto);
  }

  @Post('articles/:articleId/favorite')
  @HttpCode(HttpStatus.OK)
  async favoriteArticle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('articleId', ParseUUIDPipe) articleId: string,
  ): Promise<UserArticleState> {
    return this.usersService.updateArticleState(user.id, articleId, {
      isFavorite: true,
    });
  }

  @Delete('articles/:articleId/favorite')
  async unfavoriteArticle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('articleId', ParseUUIDPipe) articleId: string,
  ): Promise<UserArticleState> {
    return this.usersService.updateArticleState(user.id, articleId, {
      isFavorite: false,
    });
  }

  @Post('articles/:articleId/read')
  @HttpCode(HttpStatus.OK)
  async markArticleAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('articleId', ParseUUIDPipe) articleId: string,
  ): Promise<UserArticleState> {
    return this.usersService.updateArticleState(user.id, articleId, {
      markAsRead: true,
    });
  }
}
