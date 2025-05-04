import { Injectable } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { NotificationsService } from '../notifications.service';
import { Job } from 'bull';
import { KEYWORD_SOURCE_TYPE } from '../../common/enum/shared.enum';

@Injectable()
@Processor('notifications')
export class NotificationsProcessor {
  constructor(private readonly notificationService: NotificationsService) {}

  @Process('processPostKeywords')
  async processPostKeywords(
    job: Job<{ id: number; title: string; content: string; author: string }>,
  ): Promise<void> {
    const { id, title, content, author } = job.data;

    const fullContent = `${title} ${content}`;
    await this.notificationService.processContentKeywords(
      KEYWORD_SOURCE_TYPE.POST,
      id,
      fullContent,
      author,
    );
  }

  @Process('processCommentKeywords')
  async processCommentKeywords(
    job: Job<{ commentId: number; content: string; author: string }>,
  ) {
    const { commentId, content, author } = job.data;

    await this.notificationService.processContentKeywords(
      KEYWORD_SOURCE_TYPE.COMMENT,
      commentId,
      content,
      author,
    );
  }
}
