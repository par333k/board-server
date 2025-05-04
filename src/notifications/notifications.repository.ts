import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { QueryRunner, Repository } from 'typeorm';
import { PostNotificationEntity } from './entities/post-notification.entity';
import { CommentNotificationEntity } from './entities/comment-notification.entity';

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

  async markAsRead(id: number): Promise<void> {
    await this.notificationRepository.update(id, { is_read: true });
  }

  async countUnreadByRecipient(recipient: string): Promise<number> {
    return this.notificationRepository.count({
      where: { recipient, is_read: false },
    });
  }
}
