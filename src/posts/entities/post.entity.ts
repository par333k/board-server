import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommentEntity } from '../../comments/entities/comment.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity('posts')
export class PostEntity {
  @ApiProperty({ description: '게시글 고유 ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '게시글 제목' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ description: '게시글 내용' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ description: '작성자 이름' })
  @Column({ length: 100 })
  author: string;

  @Exclude()
  @Column({ length: 255, select: false }) // 비밀번호는 기본 조회에서 제외
  password: string;

  @ApiProperty({ description: '작성일시' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: '수정일시' })
  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => CommentEntity, (comment) => comment.post)
  comments: CommentEntity[];
}
