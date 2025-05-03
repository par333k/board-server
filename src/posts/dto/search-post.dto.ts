import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchPostDto {
  @ApiProperty({
    description: '검색할 제목',
    example: '게시물 1',
    required: false,
  })
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: '검색할 작성자',
    example: '익명',
    required: false,
  })
  @IsOptional()
  author?: string;

  @ApiProperty({
    description: '페이지 번호',
    example: 1,
    required: true,
    minimum: 1,
  })
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({
    description: '페이지 당 게시물 수',
    example: 10,
    required: true,
    minimum: 1,
    maximum: 100,
  })
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;
}
