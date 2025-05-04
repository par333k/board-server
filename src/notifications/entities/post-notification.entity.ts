import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PostEntity } from '../../posts/entities/post.entity';
import { NotificationEntity } from './notification.entity';

@Entity('post_notifications')
export class PostNotificationEntity {
  @ApiProperty({ description: '기본 알림 ID' })
  @PrimaryColumn()
  notification_id: number;

  @ApiProperty({ description: '게시글 ID' })
  @Column({ name: 'post_id' })
  post_id: number;

  @OneToOne(() => NotificationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification: NotificationEntity;

  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: PostEntity;
}
