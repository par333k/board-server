import { NotificationRepository } from './notification.repository';
import { Injectable } from '@nestjs/common';
import { KeywordService } from '../keywords/keyword.service';
import { DataSource } from 'typeorm';
import { KEYWORD_SOURCE_TYPE } from '../common/enum/shared.enum';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly keywordService: KeywordService,
    private readonly dataSource: DataSource,
  ) {}

  async processContentKeywords(
    sourceType: KEYWORD_SOURCE_TYPE,
    sourceId: number,
    content: string,
    author: string,
  ): Promise<void> {
    const pendingKeywords =
      await this.keywordService.getMatchingKeywordsForNotification(
        sourceType,
        sourceId,
        content,
        author,
      );

    if (pendingKeywords.length === 0) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const promises: Promise<any>[] = [];
      const cachePromises: Promise<any>[] = [];

      for (const keyword of pendingKeywords) {
        const notification =
          await this.notificationRepository.createNotification(
            keyword.author,
            keyword.keyword,
            queryRunner,
          );

        if (sourceType === KEYWORD_SOURCE_TYPE.POST) {
          promises.push(
            this.notificationRepository.createPostNotificationLink(
              notification.id,
              sourceId,
              queryRunner,
            ),
          );
        } else {
          promises.push(
            this.notificationRepository.createCommentNotificationLink(
              notification.id,
              sourceId,
              queryRunner,
            ),
          );
        }

        cachePromises.push(
          this.keywordService.markNotificationSent(
            sourceType,
            sourceId,
            keyword.author,
            keyword.keyword,
          ),
        );

        this.sendNotification({
          recipient: keyword.author,
          sourceType,
          sourceId,
          keyword: keyword.keyword,
        });
      }

      await Promise.all(promises);
      await queryRunner.commitTransaction();
      await Promise.all(cachePromises);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 알림 전송 함수
  private sendNotification(data: {
    recipient: string;
    sourceType: KEYWORD_SOURCE_TYPE;
    sourceId: number;
    keyword: string;
  }): void {
    console.log(`전송 완료`);
  }
}
