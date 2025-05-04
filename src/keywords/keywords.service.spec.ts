import { Test, TestingModule } from '@nestjs/testing';
import { KeywordsService } from './keywords.service';
import { KeywordsRepository } from './keywords.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { KeywordEntity } from './entities/keyword.entity';
import { KEYWORD_SOURCE_TYPE } from '../common/enum/shared.enum';

describe('KeywordsService', () => {
  let service: KeywordsService;
  let keywordRepository: jest.Mocked<KeywordsRepository>;
  let cacheManager: jest.Mocked<Cache>;

  // 테스트용 키워드 엔티티 목록 생성
  const mockKeywordEntities: KeywordEntity[] = [
    {
      id: 1,
      author: '사용자1',
      keyword: '테스트',
    },
    {
      id: 2,
      author: '사용자2',
      keyword: '키워드',
    },
    {
      id: 3,
      author: '작성자',
      keyword: '무시',
    },
  ];

  beforeEach(async () => {
    const keywordRepositoryMock = {
      findMatchingKeywords: jest.fn(),
    };

    const cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeywordsService,
        {
          provide: KeywordsRepository,
          useValue: keywordRepositoryMock,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
      ],
    }).compile();

    service = module.get<KeywordsService>(KeywordsService);
    keywordRepository = module.get(KeywordsRepository);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('getMatchingKeywordsForNotification', () => {
    it('매칭되는 키워드 중 알림을 보내지 않은 키워드만 반환해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '이것은 테스트 키워드가 포함된 내용입니다.';
      const contentAuthor: string = '작성자';

      // 모든 매칭 키워드를 반환하도록 설정
      keywordRepository.findMatchingKeywords.mockResolvedValue(
        mockKeywordEntities,
      );

      // 캐시 응답 설정 - 사용자2의 '키워드'는 이미 알림을 보냄
      cacheManager.get.mockImplementation(async (key: string) => {
        return key.includes('사용자2:키워드') ? true : null;
      });

      // when
      const result: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId,
          content,
          contentAuthor,
        );

      // then
      expect(keywordRepository.findMatchingKeywords).toHaveBeenCalledWith(
        content,
      );
      expect(cacheManager.get).toHaveBeenCalledTimes(2); // 작성자 자신을 제외한 두 개의 캐시 확인

      // 결과는 사용자1의 '테스트' 키워드만 포함해야 함
      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('사용자1');
      expect(result[0].keyword).toBe('테스트');
    });

    it('컨텐츠 작성자 자신의 키워드는 알림 목록에서 제외해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.COMMENT;
      const sourceId: number = 1;
      const content: string = '무시해야 할 키워드가 있는 내용';
      const contentAuthor: string = '작성자';

      // 매칭된 키워드 중 작성자 본인의 키워드만 있는 경우
      keywordRepository.findMatchingKeywords.mockResolvedValue([
        mockKeywordEntities[2],
      ]);

      // when
      const result: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId,
          content,
          contentAuthor,
        );

      // then
      expect(keywordRepository.findMatchingKeywords).toHaveBeenCalledWith(
        content,
      );
      expect(cacheManager.get).not.toHaveBeenCalled(); // 작성자 본인 키워드만 있으므로 캐시 확인 없음
      expect(result).toHaveLength(0); // 결과가 비어있어야 함
    });

    it('매칭되는 키워드가 없는 경우 빈 배열을 반환해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '매칭되는 키워드가 없는 내용';
      const contentAuthor: string = '작성자';

      // 매칭되는 키워드가 없는 경우
      keywordRepository.findMatchingKeywords.mockResolvedValue([]);

      // when
      const result: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId,
          content,
          contentAuthor,
        );

      // then
      expect(keywordRepository.findMatchingKeywords).toHaveBeenCalledWith(
        content,
      );
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('모든 매칭 키워드가 이미 알림을 받은 경우 빈 배열을 반환해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '모든 키워드가 이미 알림을 받은 내용';
      const contentAuthor: string = '다른작성자';

      const matchingKeywords: KeywordEntity[] = [
        mockKeywordEntities[0],
        mockKeywordEntities[1],
      ];
      keywordRepository.findMatchingKeywords.mockResolvedValue(
        matchingKeywords,
      );

      // 모든 키워드가 이미 알림을 받은 경우
      cacheManager.get.mockResolvedValue(true);

      // when
      const result: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId,
          content,
          contentAuthor,
        );

      // then
      expect(keywordRepository.findMatchingKeywords).toHaveBeenCalledWith(
        content,
      );
      expect(cacheManager.get).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(0);
    });

    it('알림이 없는 키워드와 이미 알림을 받은 키워드가 섞여있을 때 알림이 없는 키워드만 반환해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '혼합된 알림 상태의 키워드가 있는 내용';
      const contentAuthor: string = '다른작성자';

      // 두 개의 서로 다른 사용자 키워드
      const matchingKeywords: KeywordEntity[] = [
        {
          id: 1,
          author: '사용자A',
          keyword: '키워드A',
        },
        {
          id: 2,
          author: '사용자B',
          keyword: '키워드B',
        },
      ];
      keywordRepository.findMatchingKeywords.mockResolvedValue(
        matchingKeywords,
      );

      // 사용자A의 키워드A는 이미 알림을 받음, 사용자B의 키워드B는 아직 알림을 받지 않음
      cacheManager.get.mockImplementation(async (key: string) => {
        return key.includes('사용자A:키워드A') ? true : null;
      });

      // when
      const result: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId,
          content,
          contentAuthor,
        );

      // then
      expect(keywordRepository.findMatchingKeywords).toHaveBeenCalledWith(
        content,
      );
      expect(cacheManager.get).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('사용자B');
      expect(result[0].keyword).toBe('키워드B');
    });
  });

  describe('markNotificationSent', () => {
    it('알림이 발송된 키워드를 캐시에 정확히 기록해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const recipient: string = '사용자1';
      const keyword: string = '테스트';

      // 캐시 설정이 성공적으로 이루어짐
      cacheManager.set.mockResolvedValue(undefined);

      // when
      await service.markNotificationSent(
        sourceType,
        sourceId,
        recipient,
        keyword,
      );

      // then
      // 캐시키 형식: notification:{sourceType}:{sourceId}:processed:{recipient}:{keyword}
      const expectedCacheKey: string = `notification:${sourceType}:${sourceId}:processed:${recipient}:${keyword}`;
      expect(cacheManager.set).toHaveBeenCalledWith(
        expectedCacheKey,
        true,
        86400,
      );
    });

    it('서로 다른 소스 타입에 대해 다른 캐시 키를 사용해야 함', async () => {
      // given
      const postSourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const commentSourceType: KEYWORD_SOURCE_TYPE =
        KEYWORD_SOURCE_TYPE.COMMENT;
      const sourceId: number = 1;
      const recipient: string = '사용자1';
      const keyword: string = '테스트';

      // 캐시 설정이 성공적으로 이루어짐
      cacheManager.set.mockResolvedValue(undefined);

      // when
      await service.markNotificationSent(
        postSourceType,
        sourceId,
        recipient,
        keyword,
      );
      await service.markNotificationSent(
        commentSourceType,
        sourceId,
        recipient,
        keyword,
      );

      // then
      // 첫 번째 호출 - POST 소스 타입
      const expectedPostCacheKey: string = `notification:${postSourceType}:${sourceId}:processed:${recipient}:${keyword}`;
      expect(cacheManager.set).toHaveBeenNthCalledWith(
        1,
        expectedPostCacheKey,
        true,
        86400,
      );

      // 두 번째 호출 - COMMENT 소스 타입
      const expectedCommentCacheKey: string = `notification:${commentSourceType}:${sourceId}:processed:${recipient}:${keyword}`;
      expect(cacheManager.set).toHaveBeenNthCalledWith(
        2,
        expectedCommentCacheKey,
        true,
        86400,
      );
    });

    it('서로 다른 소스 ID에 대해 다른 캐시 키를 사용해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId1: number = 1;
      const sourceId2: number = 2;
      const recipient: string = '사용자1';
      const keyword: string = '테스트';

      // 캐시 설정이 성공적으로 이루어짐
      cacheManager.set.mockResolvedValue(undefined);

      // when
      await service.markNotificationSent(
        sourceType,
        sourceId1,
        recipient,
        keyword,
      );
      await service.markNotificationSent(
        sourceType,
        sourceId2,
        recipient,
        keyword,
      );

      // then
      // 첫 번째 호출 - 소스 ID 1
      const expectedCacheKey1: string = `notification:${sourceType}:${sourceId1}:processed:${recipient}:${keyword}`;
      expect(cacheManager.set).toHaveBeenNthCalledWith(
        1,
        expectedCacheKey1,
        true,
        86400,
      );

      // 두 번째 호출 - 소스 ID 2
      const expectedCacheKey2: string = `notification:${sourceType}:${sourceId2}:processed:${recipient}:${keyword}`;
      expect(cacheManager.set).toHaveBeenNthCalledWith(
        2,
        expectedCacheKey2,
        true,
        86400,
      );
    });

    it('서로 다른 수신자에 대해 다른 캐시 키를 사용해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const recipient1: string = '사용자1';
      const recipient2: string = '사용자2';
      const keyword: string = '테스트';

      // 캐시 설정이 성공적으로 이루어짐
      cacheManager.set.mockResolvedValue(undefined);

      // when
      await service.markNotificationSent(
        sourceType,
        sourceId,
        recipient1,
        keyword,
      );
      await service.markNotificationSent(
        sourceType,
        sourceId,
        recipient2,
        keyword,
      );

      // then
      // 첫 번째 호출 - 수신자 1
      const expectedCacheKey1: string = `notification:${sourceType}:${sourceId}:processed:${recipient1}:${keyword}`;
      expect(cacheManager.set).toHaveBeenNthCalledWith(
        1,
        expectedCacheKey1,
        true,
        86400,
      );

      // 두 번째 호출 - 수신자 2
      const expectedCacheKey2: string = `notification:${sourceType}:${sourceId}:processed:${recipient2}:${keyword}`;
      expect(cacheManager.set).toHaveBeenNthCalledWith(
        2,
        expectedCacheKey2,
        true,
        86400,
      );
    });

    it('서로 다른 키워드에 대해 다른 캐시 키를 사용해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const recipient: string = '사용자1';
      const keyword1: string = '테스트1';
      const keyword2: string = '테스트2';

      // 캐시 설정이 성공적으로 이루어짐
      cacheManager.set.mockResolvedValue(undefined);

      // when
      await service.markNotificationSent(
        sourceType,
        sourceId,
        recipient,
        keyword1,
      );
      await service.markNotificationSent(
        sourceType,
        sourceId,
        recipient,
        keyword2,
      );

      // then
      // 첫 번째 호출 - 키워드 1
      const expectedCacheKey1: string = `notification:${sourceType}:${sourceId}:processed:${recipient}:${keyword1}`;
      expect(cacheManager.set).toHaveBeenNthCalledWith(
        1,
        expectedCacheKey1,
        true,
        86400,
      );

      // 두 번째 호출 - 키워드 2
      const expectedCacheKey2: string = `notification:${sourceType}:${sourceId}:processed:${recipient}:${keyword2}`;
      expect(cacheManager.set).toHaveBeenNthCalledWith(
        2,
        expectedCacheKey2,
        true,
        86400,
      );
    });
  });

  describe('엣지 케이스 테스트', () => {
    it('매칭되는 키워드는 있지만 모두 작성자 본인의 키워드인 경우 빈 배열을 반환해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '작성자 본인 키워드만 포함된 내용';
      const contentAuthor: string = '작성자';

      // 작성자 본인의 키워드만 포함
      keywordRepository.findMatchingKeywords.mockResolvedValue([
        mockKeywordEntities[2],
      ]);

      // when
      const result: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId,
          content,
          contentAuthor,
        );

      // then
      expect(keywordRepository.findMatchingKeywords).toHaveBeenCalledWith(
        content,
      );
      expect(result).toHaveLength(0);
    });

    it('빈 내용으로 검색 시 빈 배열을 반환해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '';
      const contentAuthor: string = '작성자';

      // 빈 내용으로 검색 시 빈 배열 반환
      keywordRepository.findMatchingKeywords.mockResolvedValue([]);

      // when
      const result: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId,
          content,
          contentAuthor,
        );

      // then
      expect(keywordRepository.findMatchingKeywords).toHaveBeenCalledWith(
        content,
      );
      expect(result).toHaveLength(0);
    });

    it('내용에 특수문자만 있는 경우도 정상 처리되어야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '!@#$%^&*()';
      const contentAuthor: string = '작성자';

      // 특수문자만 있는 내용으로 검색 시 빈 배열 반환
      keywordRepository.findMatchingKeywords.mockResolvedValue([]);

      // when
      const result: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId,
          content,
          contentAuthor,
        );

      // then
      expect(keywordRepository.findMatchingKeywords).toHaveBeenCalledWith(
        content,
      );
      expect(result).toHaveLength(0);
    });

    it('매우 긴 내용도 정상 처리되어야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '매우 긴 내용'.repeat(1000); // 매우 긴 문자열
      const contentAuthor: string = '작성자';

      // 매우 긴 내용 처리
      keywordRepository.findMatchingKeywords.mockResolvedValue([
        mockKeywordEntities[0],
      ]);
      cacheManager.get.mockResolvedValue(null);

      // when
      const result: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId,
          content,
          contentAuthor,
        );

      // then
      expect(keywordRepository.findMatchingKeywords).toHaveBeenCalledWith(
        content,
      );
      expect(result).toHaveLength(1);
      expect(result[0].keyword).toBe('테스트');
    });

    it('내용과 작성자가 동일한 경우에도 각 호출마다 독립적으로 처리되어야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId1: number = 1;
      const sourceId2: number = 2;
      const content: string = '동일한 내용';
      const contentAuthor: string = '작성자';

      // 동일한 매칭 키워드
      keywordRepository.findMatchingKeywords.mockResolvedValue([
        mockKeywordEntities[0],
      ]);

      // 첫 번째 호출에서는 캐시에 없음, 두 번째 호출에서는 캐시에 있음
      cacheManager.get
        .mockResolvedValueOnce(null) // 첫 번째 호출
        .mockResolvedValueOnce(true); // 두 번째 호출

      // when - 첫 번째 호출
      const result1: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId1,
          content,
          contentAuthor,
        );

      // when - 두 번째 호출 (다른 소스 ID)
      const result2: KeywordEntity[] =
        await service.getMatchingKeywordsForNotification(
          sourceType,
          sourceId2,
          content,
          contentAuthor,
        );

      // then
      expect(keywordRepository.findMatchingKeywords).toHaveBeenCalledTimes(2);
      expect(result1).toHaveLength(1); // 첫 번째 호출에서는 결과가 있음
      expect(result2).toHaveLength(0); // 두 번째 호출에서는 캐시에 있어서 결과가 없음
    });
  });
});
