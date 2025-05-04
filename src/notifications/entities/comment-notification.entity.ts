import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { CommentEntity } from '../../comments/entities/comment.entity';
import { NotificationEntity } from './notification.entity';

@Entity('comment_notifications')
export class CommentNotificationEntity {
  @ApiProperty({ description: '기본 알림 ID' })
  @PrimaryColumn()
  notification_id: number;

  @ApiProperty({ description: '댓글 ID' })
  @Column({ name: 'comment_id' })
  comment_id: number;

  @OneToOne(() => NotificationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification: NotificationEntity;

  @ManyToOne(() => CommentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: CommentEntity;
}
