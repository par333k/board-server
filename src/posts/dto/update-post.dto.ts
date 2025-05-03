import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class UpdatePostDto {
  @ApiProperty({
    description: '수정할 게시글 제목',
    example: '수정 게시물1.',
    required: false,
  })
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: '수정할 게시글 내용',
    example: '수정할 내용1.',
    required: false,
  })
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: '게시글 비밀번호 (수정/삭제 시 필요)',
    example: '123456',
  })
  @IsDefined()
  @IsString()
  password: string;
}
