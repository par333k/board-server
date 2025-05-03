import { IsDefined, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: '댓글 내용',
    example: '좋은 게시글이네요!',
  })
  @IsDefined()
  @IsString()
  content: string;

  @ApiProperty({
    description: '작성자 이름',
    example: '익명 사용자',
    maxLength: 100,
  })
  @IsDefined()
  @IsString()
  author: string;

  @ApiProperty({
    description: '부모 댓글 ID (대댓글인 경우)',
    required: false,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
