import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { CategoriesController } from './categories.controller';

@Module({
  controllers: [ArticlesController, CategoriesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
