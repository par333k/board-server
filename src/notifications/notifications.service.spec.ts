import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { KeywordsService } from '../keywords/keywords.service';
import { DataSource, QueryRunner } from 'typeorm';
import { KEYWORD_SOURCE_TYPE, SOURCE_STATUS } from '../common/enum/shared.enum';
import { NotificationEntity } from './entities/notification.entity';
import { KeywordEntity } from '../keywords/entities/keyword.entity';
import { PostNotificationEntity } from './entities/post-notification.entity';
import { CommentNotificationEntity } from './entities/comment-notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: jest.Mocked<NotificationsRepository>;
  let keywordService: jest.Mocked<KeywordsService>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;

  beforeEach(async () => {
    // 쿼리 러너 모킹
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        getRepository: jest.fn(),
      },
    } as unknown as jest.Mocked<QueryRunner>;

    // 모의 객체 생성
    const notificationRepositoryMock = {
      createNotification: jest.fn(),
      createPostNotificationLink: jest.fn(),
      createCommentNotificationLink: jest.fn(),
    };

    const keywordServiceMock = {
      getMatchingKeywordsForNotification: jest.fn(),
      markNotificationSent: jest.fn(),
    };

    const dataSourceMock = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsRepository,
          useValue: notificationRepositoryMock,
        },
        {
          provide: KeywordsService,
          useValue: keywordServiceMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get(NotificationsRepository);
    keywordService = module.get(KeywordsService);
    dataSource = module.get(DataSource);

    // Mock console.log to prevent actual logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processContentKeywords', () => {
    it('매칭되는 키워드가 없을 때 트랜잭션을 시작하지 않아야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '테스트 내용';
      const author: string = '작성자';

      // 매칭되는 키워드가 없는 경우
      keywordService.getMatchingKeywordsForNotification.mockResolvedValue([]);

      // when
      await service.processContentKeywords(
        sourceType,
        sourceId,
        content,
        author,
      );

      // then
      expect(
        keywordService.getMatchingKeywordsForNotification,
      ).toHaveBeenCalledWith(sourceType, sourceId, content, author);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
      expect(notificationRepository.createNotification).not.toHaveBeenCalled();
    });

    it('게시글 알림을 성공적으로 처리해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '테스트 내용';
      const author: string = '작성자';

      // 매칭되는 키워드 준비
      const pendingKeywords: KeywordEntity[] = [
        {
          id: 1,
          author: '사용자1',
          keyword: '테스트',
        },
        {
          id: 2,
          author: '사용자2',
          keyword: '내용',
        },
      ];

      // 생성될 알림 엔티티
      const mockNotification1: NotificationEntity = {
        id: 1,
        recipient: '사용자1',
        keyword: '테스트',
        is_read: false,
        created_at: new Date(),
        source_status: SOURCE_STATUS.ACTIVE,
        source_updated_at: null,
      };

      const mockNotification2: NotificationEntity = {
        id: 2,
        recipient: '사용자2',
        keyword: '내용',
        is_read: false,
        created_at: new Date(),
        source_status: SOURCE_STATUS.ACTIVE,
        source_updated_at: null,
      };

      // 모킹 설정
      keywordService.getMatchingKeywordsForNotification.mockResolvedValue(
        pendingKeywords,
      );
      notificationRepository.createNotification
        .mockResolvedValueOnce(mockNotification1)
        .mockResolvedValueOnce(mockNotification2);
      notificationRepository.createPostNotificationLink.mockResolvedValue(
        new PostNotificationEntity(),
      );
      keywordService.markNotificationSent.mockResolvedValue(undefined);

      // when
      await service.processContentKeywords(
        sourceType,
        sourceId,
        content,
        author,
      );

      // then
      expect(
        keywordService.getMatchingKeywordsForNotification,
      ).toHaveBeenCalledWith(sourceType, sourceId, content, author);
      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();

      // 두 개의 알림이 생성되었는지 확인
      expect(notificationRepository.createNotification).toHaveBeenCalledTimes(
        2,
      );
      expect(notificationRepository.createNotification).toHaveBeenNthCalledWith(
        1,
        '사용자1',
        '테스트',
        queryRunner,
      );
      expect(notificationRepository.createNotification).toHaveBeenNthCalledWith(
        2,
        '사용자2',
        '내용',
        queryRunner,
      );

      // POST 타입 링크 생성 확인
      expect(
        notificationRepository.createPostNotificationLink,
      ).toHaveBeenCalledTimes(2);
      expect(
        notificationRepository.createPostNotificationLink,
      ).toHaveBeenNthCalledWith(1, mockNotification1.id, sourceId, queryRunner);
      expect(
        notificationRepository.createPostNotificationLink,
      ).toHaveBeenNthCalledWith(2, mockNotification2.id, sourceId, queryRunner);

      // 댓글 링크 생성은 호출되지 않아야 함
      expect(
        notificationRepository.createCommentNotificationLink,
      ).not.toHaveBeenCalled();

      // 알림 발송 마킹 확인
      expect(keywordService.markNotificationSent).toHaveBeenCalledTimes(2);
      expect(keywordService.markNotificationSent).toHaveBeenNthCalledWith(
        1,
        sourceType,
        sourceId,
        '사용자1',
        '테스트',
      );
      expect(keywordService.markNotificationSent).toHaveBeenNthCalledWith(
        2,
        sourceType,
        sourceId,
        '사용자2',
        '내용',
      );

      // 트랜잭션 커밋 및 릴리즈 확인
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('댓글 알림을 성공적으로 처리해야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.COMMENT;
      const sourceId: number = 1;
      const content: string = '테스트 댓글 내용';
      const author: string = '댓글작성자';

      // 매칭되는 키워드 준비
      const pendingKeywords: KeywordEntity[] = [
        {
          id: 1,
          author: '사용자1',
          keyword: '테스트',
        },
      ];

      // 생성될 알림 엔티티
      const mockNotification: NotificationEntity = {
        id: 1,
        recipient: '사용자1',
        keyword: '테스트',
        is_read: false,
        created_at: new Date(),
        source_status: SOURCE_STATUS.ACTIVE,
        source_updated_at: null,
      };

      // 모킹 설정
      keywordService.getMatchingKeywordsForNotification.mockResolvedValue(
        pendingKeywords,
      );
      notificationRepository.createNotification.mockResolvedValue(
        mockNotification,
      );
      notificationRepository.createCommentNotificationLink.mockResolvedValue(
        new CommentNotificationEntity(),
      );
      keywordService.markNotificationSent.mockResolvedValue(undefined);

      // when
      await service.processContentKeywords(
        sourceType,
        sourceId,
        content,
        author,
      );

      // then
      expect(
        keywordService.getMatchingKeywordsForNotification,
      ).toHaveBeenCalledWith(sourceType, sourceId, content, author);

      // 알림이 생성되었는지 확인
      expect(notificationRepository.createNotification).toHaveBeenCalledWith(
        '사용자1',
        '테스트',
        queryRunner,
      );

      // 댓글 타입 링크 생성 확인
      expect(
        notificationRepository.createCommentNotificationLink,
      ).toHaveBeenCalledWith(mockNotification.id, sourceId, queryRunner);

      // 게시글 링크 생성은 호출되지 않아야 함
      expect(
        notificationRepository.createPostNotificationLink,
      ).not.toHaveBeenCalled();

      // 알림 발송 마킹 확인
      expect(keywordService.markNotificationSent).toHaveBeenCalledWith(
        sourceType,
        sourceId,
        '사용자1',
        '테스트',
      );

      // 트랜잭션 커밋 및 릴리즈 확인
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('다수의 키워드에 대해 모든 알림이 정상적으로 처리되어야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '여러 키워드가 포함된 테스트 내용';
      const author: string = '작성자';

      // 매칭되는 키워드 5개 준비
      const pendingKeywords: KeywordEntity[] = Array.from(
        { length: 5 },
        (_, i) => ({
          id: i + 1,
          author: `사용자${i + 1}`,
          keyword: `키워드${i + 1}`,
        }),
      );

      // 모킹 설정
      keywordService.getMatchingKeywordsForNotification.mockResolvedValue(
        pendingKeywords,
      );

      // 알림 엔티티 생성 모킹
      notificationRepository.createNotification.mockImplementation(
        (recipient: string, keyword: string) =>
          Promise.resolve({
            id: parseInt(recipient.replace('사용자', '')),
            recipient,
            keyword,
            is_read: false,
            created_at: new Date(),
          } as NotificationEntity),
      );

      notificationRepository.createPostNotificationLink.mockResolvedValue(
        new PostNotificationEntity(),
      );
      keywordService.markNotificationSent.mockResolvedValue(undefined);

      // when
      await service.processContentKeywords(
        sourceType,
        sourceId,
        content,
        author,
      );

      // then
      // 5개의 알림이 생성되었는지 확인
      expect(notificationRepository.createNotification).toHaveBeenCalledTimes(
        5,
      );
      expect(
        notificationRepository.createPostNotificationLink,
      ).toHaveBeenCalledTimes(5);
      expect(keywordService.markNotificationSent).toHaveBeenCalledTimes(5);

      // 트랜잭션이 커밋되고 릴리즈되었는지 확인
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('엣지 케이스: 빈 내용에 대해서도 정상적으로 처리되어야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '';
      const author: string = '작성자';

      // 빈 내용에 대해 매칭되는 키워드가 없음
      keywordService.getMatchingKeywordsForNotification.mockResolvedValue([]);

      // when
      await service.processContentKeywords(
        sourceType,
        sourceId,
        content,
        author,
      );

      // then
      expect(
        keywordService.getMatchingKeywordsForNotification,
      ).toHaveBeenCalledWith(sourceType, sourceId, content, author);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('엣지 케이스: 특수문자만 포함된 내용에 대해서도 정상적으로 처리되어야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '!@#$%^&*()';
      const author: string = '작성자';

      // 특수문자만 있는 내용에 대해 매칭되는 키워드가 없음
      keywordService.getMatchingKeywordsForNotification.mockResolvedValue([]);

      // when
      await service.processContentKeywords(
        sourceType,
        sourceId,
        content,
        author,
      );

      // then
      expect(
        keywordService.getMatchingKeywordsForNotification,
      ).toHaveBeenCalledWith(sourceType, sourceId, content, author);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('엣지 케이스: 매우 긴 내용에 대해서도 정상적으로 처리되어야 함', async () => {
      // given
      const sourceType: KEYWORD_SOURCE_TYPE = KEYWORD_SOURCE_TYPE.POST;
      const sourceId: number = 1;
      const content: string = '매우 긴 내용'.repeat(1000); // 매우 긴 문자열
      const author: string = '작성자';

      // 매우 긴 내용에 대해 매칭되는 키워드 1개
      const pendingKeywords: KeywordEntity[] = [
        {
          id: 1,
          author: '사용자1',
          keyword: '긴 내용',
        },
      ];

      // 생성될 알림 엔티티
      const mockNotification: NotificationEntity = {
        id: 1,
        recipient: '사용자1',
        keyword: '긴 내용',
        is_read: false,
        created_at: new Date(),
        source_status: SOURCE_STATUS.ACTIVE,
        source_updated_at: null,
      };

      // 모킹 설정
      keywordService.getMatchingKeywordsForNotification.mockResolvedValue(
        pendingKeywords,
      );
      notificationRepository.createNotification.mockResolvedValue(
        mockNotification,
      );
      notificationRepository.createPostNotificationLink.mockResolvedValue(
        new PostNotificationEntity(),
      );
      keywordService.markNotificationSent.mockResolvedValue(undefined);

      // when
      await service.processContentKeywords(
        sourceType,
        sourceId,
        content,
        author,
      );

      // then
      expect(
        keywordService.getMatchingKeywordsForNotification,
      ).toHaveBeenCalledWith(sourceType, sourceId, content, author);
      expect(notificationRepository.createNotification).toHaveBeenCalledWith(
        '사용자1',
        '긴 내용',
        expect.anything(),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('엣지 케이스: 영문과 한글이 혼합된 내용에 대해서도 정상적으로 처리되어야 함', async () => {
      // given
      const sourceId: number = 1;
      const content: string = 'This is 한글 and English 혼합 content';
      const author: string = '작성자';

      // 혼합된 내용에 대해 매칭되는 키워드 1개
      const pendingKeywords: KeywordEntity[] = [
        {
          id: 1,
          author: '사용자1',
          keyword: '한글',
        },
      ];

      // 생성될 알림 엔티티
      const mockNotification: NotificationEntity = {
        id: 1,
        recipient: '사용자1',
        keyword: '한글',
        is_read: false,
        created_at: new Date(),
        source_status: SOURCE_STATUS.ACTIVE,
        source_updated_at: null,
      };

      // 모킹 설정
      keywordService.getMatchingKeywordsForNotification.mockResolvedValue(
        pendingKeywords,
      );
      notificationRepository.createNotification.mockResolvedValue(
        mockNotification,
      );
      notificationRepository.createCommentNotificationLink.mockResolvedValue(
        new CommentNotificationEntity(),
      );
      keywordService.markNotificationSent.mockResolvedValue(undefined);

      // when
      await service.processContentKeywords(
        KEYWORD_SOURCE_TYPE.COMMENT,
        sourceId,
        content,
        author,
      );

      // then
      expect(
        keywordService.getMatchingKeywordsForNotification,
      ).toHaveBeenCalledWith(
        KEYWORD_SOURCE_TYPE.COMMENT,
        sourceId,
        content,
        author,
      );
      expect(notificationRepository.createNotification).toHaveBeenCalledWith(
        '사용자1',
        '한글',
        expect.anything(),
      );
      expect(
        notificationRepository.createCommentNotificationLink,
      ).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
