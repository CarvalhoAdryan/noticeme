import { NewsCategorySchema, type NewsCategory } from '@dailybrief/shared';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn } from 'class-validator';

const VALID_CATEGORIES = NewsCategorySchema.options;

export class UpdateUserCategoriesDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(VALID_CATEGORIES.length)
  @IsIn(VALID_CATEGORIES, { each: true })
  categories!: NewsCategory[];
}
