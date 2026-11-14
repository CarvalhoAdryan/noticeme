import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateArticleStateDto {
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsBoolean()
  markAsRead?: boolean;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;
}
