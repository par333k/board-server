import { IsInt, Min, Max, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetCommentDto {
  @ApiProperty({
    description: '페이지 번호',
    example: 1,
    default: 1,
    required: false,
    minimum: 1,
  })
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({
    description: '페이지 당 항목 수',
    example: 20,
    default: 20,
    required: false,
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
