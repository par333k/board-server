import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PostEntity } from '../../posts/entities/post.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('comments')
export class CommentEntity {
  @ApiProperty({ description: '댓글 고유 ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '댓글 내용' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ description: '작성자 이름' })
  @Column({ length: 100 })
  author: string;

  @ApiProperty({ description: '게시글 ID' })
  @Column()
  post_id: number;

  @ApiProperty({ description: '부모 댓글 ID (대댓글인 경우)' })
  @Column({ nullable: true })
  parent_id: number;

  @ApiProperty({ description: '작성일시' })
  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => PostEntity, (post) => post.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post: PostEntity;

  @ManyToOne(() => CommentEntity, (comment) => comment.replies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: CommentEntity;

  @OneToMany(() => CommentEntity, (comment) => comment.parent)
  replies: CommentEntity[];
}
