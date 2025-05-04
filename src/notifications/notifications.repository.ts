import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { QueryRunner, Repository } from 'typeorm';
import { PostNotificationEntity } from './entities/post-notification.entity';
import { CommentNotificationEntity } from './entities/comment-notification.entity';
import { KEYWORD_SOURCE_TYPE, SOURCE_STATUS } from '../common/enum/shared.enum';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(PostNotificationEntity)
    private readonly postNotificationRepository: Repository<PostNotificationEntity>,
    @InjectRepository(CommentNotificationEntity)
    private readonly commentNotificationRepository: Repository<CommentNotificationEntity>,
  ) {}

  async createNotification(
    recipient: string,
    keyword: string,
    queryRunner?: QueryRunner,
  ): Promise<NotificationEntity> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(NotificationEntity)
      : this.notificationRepository;

    const notification = repo.create({
      recipient,
      keyword,
      is_read: false,
    });

    return repo.save(notification);
  }

  async createPostNotificationLink(
    notificationId: number,
    postId: number,
    queryRunner?: QueryRunner,
  ): Promise<PostNotificationEntity> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(PostNotificationEntity)
      : this.postNotificationRepository;

    const postNotification = repo.create({
      notification_id: notificationId,
      post_id: postId,
    });

    return repo.save(postNotification);
  }

  async createCommentNotificationLink(
    notificationId: number,
    commentId: number,
    queryRunner?: QueryRunner,
  ): Promise<CommentNotificationEntity> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(CommentNotificationEntity)
      : this.commentNotificationRepository;

    const commentNotification = repo.create({
      notification_id: notificationId,
      comment_id: commentId,
    });

    return repo.save(commentNotification);
  }

  async updateSourceStatus(
    sourceType: KEYWORD_SOURCE_TYPE,
    sourceId: number,
    status: SOURCE_STATUS,
    updatedAt: Date,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const notificationRepo = queryRunner
      ? queryRunner.manager.getRepository(NotificationEntity)
      : this.notificationRepository;

    if (sourceType === KEYWORD_SOURCE_TYPE.POST) {
      await notificationRepo
        .createQueryBuilder()
        .update(NotificationEntity)
        .set({
          source_status: status,
          source_updated_at: updatedAt,
        })
        .where(
          `id IN (
          SELECT "notification_id"  
          FROM "post_notifications" 
          WHERE "post_id" = :sourceId
        )`,
          { sourceId },
        )
        .execute();
    } else {
      await notificationRepo
        .createQueryBuilder()
        .update(NotificationEntity)
        .set({
          source_status: status,
          source_updated_at: updatedAt,
        })
        .where(
          `id IN (
          SELECT "notification_id"  
          FROM "comment_notifications" 
          WHERE "comment_id" = :sourceId
        )`,
          { sourceId },
        )
        .execute();
    }
  }
}
