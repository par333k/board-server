import { NotificationEntity } from './entities/notification.entity';
import { PostNotificationEntity } from './entities/post-notification.entity';
import { CommentNotificationEntity } from './entities/comment-notification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsProcessor } from './processor/notifications.processor';

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
    NotificationsService,
    NotificationsRepository,
    NotificationsProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
