import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString, MinLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({
    description: '제목',
    example: '게시글 1',
  })
  @IsDefined()
  @IsString()
  title: string;

  @ApiProperty({
    description: '내용',
    example: '내용 1',
  })
  @IsDefined()
  @IsString()
  content: string;

  @ApiProperty({
    description: '작성자',
    example: 'master',
  })
  @IsDefined()
  @IsString()
  author: string;

  @ApiProperty({
    description: '비밀번호 (수정/삭제 시 필요)',
    example: '123456',
    minLength: 4,
  })
  @IsDefined()
  @IsString()
  @MinLength(4)
  password: string;
}
