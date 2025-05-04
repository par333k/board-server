import { NotificationEntity } from './entities/notification.entity';
import { PostNotificationEntity } from './entities/post-notification.entity';
import { CommentNotificationEntity } from './entities/comment-notification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { NotificationProcessor } from './processor/notification.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      PostNotificationEntity,
      CommentNotificationEntity,
    ]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationProcessor,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
