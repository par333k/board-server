import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { KeywordRepository } from './keyword.repository';
import { KeywordEntity } from './entities/keyword.entity';
import { KEYWORD_SOURCE_TYPE } from '../common/enum/shared.enum';

@Injectable()
export class KeywordService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly keywordRepository: KeywordRepository,
  ) {}

  async getMatchingKeywordsForNotification(
    sourceType: KEYWORD_SOURCE_TYPE,
    sourceId: number,
    content: string,
    contentAuthor: string,
  ): Promise<KeywordEntity[]> {
    const cacheKey = `notification:${sourceType}:${sourceId}:processed`;

    const allMatchingKeywords =
      await this.keywordRepository.findMatchingKeywords(content);
    const pendingKeywords: KeywordEntity[] = [];

    for (const keyword of allMatchingKeywords) {
      if (keyword.author === contentAuthor) continue;

      const userKey = `${keyword.author}:${keyword.keyword}`;
      const alreadyNotified = await this.cacheManager.get(
        `${cacheKey}:${userKey}`,
      );

      if (!alreadyNotified) {
        pendingKeywords.push(keyword);
      }
    }

    return pendingKeywords;
  }

  async markNotificationSent(
    sourceType: KEYWORD_SOURCE_TYPE,
    sourceId: number,
    recipient: string,
    keyword: string,
  ): Promise<void> {
    const cacheKey = `notification:${sourceType}:${sourceId}:processed`;
    const userKey = `${recipient}:${keyword}`;

    await this.cacheManager.set(`${cacheKey}:${userKey}`, true, 86400);
  }
}
