import { Controller, Get } from '@nestjs/common';
import type { Category } from '@dailybrief/shared';
import { ArticlesService } from './articles.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  async list(): Promise<Category[]> {
    return this.articlesService.listCategories();
  }
}
