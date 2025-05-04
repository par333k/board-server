import { NotificationEntity } from './entities/notification.entity';
import { PostNotificationEntity } from './entities/post-notification.entity';
import { CommentNotificationEntity } from './entities/comment-notification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsProcessor } from './processor/notifications.processor';
import { KeywordsModule } from '../keywords/keywords.module';

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
    KeywordsModule,
  ],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsProcessor,
  ],
  exports: [NotificationsService, NotificationsRepository, BullModule],
})
export class NotificationsModule {}
