import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PostsRepository } from './posts.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SearchPostDto } from './dto/search-post.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostEntity } from './entities/post.entity';
import { DataSource, QueryRunner } from 'typeorm';
import { getQueueToken } from '@nestjs/bull';
import * as bcrypt from 'bcrypt';
import { KEYWORD_SOURCE_TYPE, SOURCE_STATUS } from '../common/enum/shared.enum';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation(() => Promise.resolve('hashed_password')),
  compare: jest.fn(),
}));

describe('PostsService', () => {
  let service: PostsService;
  let postsRepository: jest.Mocked<PostsRepository>;
  let notificationRepository: jest.Mocked<NotificationsRepository>;
  let notificationsQueue: jest.Mocked<any>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;

  const mockPostEntity: PostEntity = {
    id: 1,
    title: '테스트 제목',
    content: '테스트 내용',
    author: '작성자',
    password: 'hashed_password',
    created_at: new Date(),
    updated_at: new Date(),
    comments: [],
  };

  beforeEach(async () => {
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

    const postsRepositoryMock = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIdWithPassword: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const notificationsRepositoryMock = {
      updateSourceStatus: jest.fn(),
    };

    // 큐 모킹
    const notificationsQueueMock = {
      add: jest.fn(),
    };

    // 데이터소스 모킹
    const dataSourceMock = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PostsRepository,
          useValue: postsRepositoryMock,
        },
        {
          provide: NotificationsRepository,
          useValue: notificationsRepositoryMock,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: notificationsQueueMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    postsRepository = module.get(PostsRepository);
    notificationRepository = module.get(NotificationsRepository);
    notificationsQueue = module.get(getQueueToken('notifications'));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPostList', () => {
    it('게시글 목록을 성공적으로, 페이징 처리하여 반환해야 함', async () => {
      // given
      const searchDto: SearchPostDto = {
        page: 1,
        limit: 10,
        title: '테스트',
        author: '작성자',
      };

      const posts: PostEntity[] = [mockPostEntity];
      const total: number = 1;

      postsRepository.findAll.mockResolvedValue([posts, total]);

      // when
      const result = await service.getPostList(searchDto);

      // then
      expect(postsRepository.findAll).toHaveBeenCalledWith(searchDto);
      expect(result.data).toEqual(posts);
      expect(result.meta?.total).toBe(total);
      expect(result.meta?.page).toBe(searchDto.page);
      expect(result.meta?.limit).toBe(searchDto.limit);
    });

    it('검색 결과가 없을 때 빈 배열을 반환해야 함', async () => {
      // given
      const searchDto: SearchPostDto = {
        page: 1,
        limit: 10,
      };

      const posts: PostEntity[] = [];
      const total: number = 0;

      postsRepository.findAll.mockResolvedValue([posts, total]);

      // when
      const result = await service.getPostList(searchDto);

      // then
      expect(postsRepository.findAll).toHaveBeenCalledWith(searchDto);
      expect(result.data).toEqual([]);
      expect(result.meta?.total).toBe(0);
    });
  });

  describe('getPost', () => {
    it('ID로 게시글을 성공적으로 조회해야 함', async () => {
      // given
      const postId: number = 1;
      postsRepository.findById.mockResolvedValue(mockPostEntity);

      // when
      const result = await service.getPost(postId);

      // then
      expect(postsRepository.findById).toHaveBeenCalledWith(postId);
      expect(result.data).toEqual(mockPostEntity);
    });

    it('존재하지 않는 게시글 ID 조회 시 NotFoundException 발생해야 함', async () => {
      // given
      const postId: number = 999;
      postsRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(service.getPost(postId)).rejects.toThrow(
        new NotFoundException(`ID가 ${postId}인 게시글을 찾을 수 없습니다.`),
      );
      expect(postsRepository.findById).toHaveBeenCalledWith(postId);
    });
  });

  describe('createPost', () => {
    it('새 게시글을 성공적으로 생성하고, 알림 큐에 추가해야 함', async () => {
      // given
      const createPostDto: CreatePostDto = {
        title: '새 게시글',
        content: '새 내용',
        author: '새 작성자',
        password: 'password123',
      };

      postsRepository.create.mockResolvedValue({
        ...mockPostEntity,
        title: createPostDto.title,
        content: createPostDto.content,
        author: createPostDto.author,
      });

      notificationsQueue.add.mockResolvedValue(undefined);

      // when
      const result = await service.createPost(createPostDto);

      // then
      expect(bcrypt.hash).toHaveBeenCalledWith(createPostDto.password, 10);
      expect(postsRepository.create).toHaveBeenCalledWith(
        createPostDto,
        'hashed_password',
      );

      // 알림 큐 호출 확인
      expect(notificationsQueue.add).toHaveBeenCalledWith(
        'processPostKeywords',
        {
          id: mockPostEntity.id,
          title: createPostDto.title,
          content: createPostDto.content,
          author: createPostDto.author,
        },
      );

      expect(result.data.title).toBe(createPostDto.title);
      expect(result.data.content).toBe(createPostDto.content);
      expect(result.data.author).toBe(createPostDto.author);
    });
  });

  describe('updatePost', () => {
    it('게시글을 성공적으로 수정해야 함', async () => {
      // given
      const postId: number = 1;
      const updatePostDto: UpdatePostDto = {
        title: '수정된 제목',
        content: '수정된 내용',
        password: 'correct_password',
      };

      // 비밀번호 확인 모킹
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const postWithPassword: PostEntity = {
        ...mockPostEntity,
        password: 'hashed_password',
      };

      postsRepository.findByIdWithPassword.mockResolvedValue(postWithPassword);
      postsRepository.update.mockResolvedValue(undefined);
      notificationRepository.updateSourceStatus.mockResolvedValue(undefined);

      // when
      await service.updatePost(postId, updatePostDto);

      // then
      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();

      expect(postsRepository.findByIdWithPassword).toHaveBeenCalledWith(
        postId,
        queryRunner,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        updatePostDto.password,
        postWithPassword.password,
      );

      // 업데이트 호출 확인
      expect(postsRepository.update).toHaveBeenCalledWith(
        postId,
        {
          title: updatePostDto.title,
          content: updatePostDto.content,
        },
        queryRunner,
      );

      // 알림 상태 업데이트 확인
      expect(notificationRepository.updateSourceStatus).toHaveBeenCalledWith(
        KEYWORD_SOURCE_TYPE.POST,
        postId,
        SOURCE_STATUS.MODIFIED,
        expect.any(Date),
        queryRunner,
      );

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('제목만 수정할 경우 제목만 업데이트해야 함', async () => {
      // given
      const postId: number = 1;
      const updatePostDto: UpdatePostDto = {
        title: '수정된 제목',
        password: 'correct_password',
      };

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const postWithPassword: PostEntity = {
        ...mockPostEntity,
        password: 'hashed_password',
      };

      postsRepository.findByIdWithPassword.mockResolvedValue(postWithPassword);
      postsRepository.update.mockResolvedValue(undefined);
      notificationRepository.updateSourceStatus.mockResolvedValue(undefined);

      // when
      await service.updatePost(postId, updatePostDto);

      // then
      expect(postsRepository.update).toHaveBeenCalledWith(
        postId,
        {
          title: updatePostDto.title,
        },
        queryRunner,
      );
    });

    it('내용만 수정할 경우 내용만 업데이트해야 함', async () => {
      // given
      const postId: number = 1;
      const updatePostDto: UpdatePostDto = {
        content: '수정된 내용',
        password: 'correct_password',
      };

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const postWithPassword: PostEntity = {
        ...mockPostEntity,
        password: 'hashed_password',
      };

      postsRepository.findByIdWithPassword.mockResolvedValue(postWithPassword);
      postsRepository.update.mockResolvedValue(undefined);
      notificationRepository.updateSourceStatus.mockResolvedValue(undefined);

      // when
      await service.updatePost(postId, updatePostDto);

      // then
      expect(postsRepository.update).toHaveBeenCalledWith(
        postId,
        {
          content: updatePostDto.content,
        },
        queryRunner,
      );
    });

    it('존재하지 않는 게시글 수정 시 NotFoundException 발생해야 함', async () => {
      // given
      const postId: number = 999;
      const updatePostDto: UpdatePostDto = {
        title: '수정된 제목',
        content: '수정된 내용',
        password: 'password123',
      };

      postsRepository.findByIdWithPassword.mockResolvedValue(null);

      // when & then
      await expect(service.updatePost(postId, updatePostDto)).rejects.toThrow(
        new NotFoundException(`ID가 ${postId}인 게시글을 찾을 수 없습니다.`),
      );

      expect(postsRepository.findByIdWithPassword).toHaveBeenCalledWith(
        postId,
        queryRunner,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('잘못된 비밀번호로 수정 시도 시 BadRequestException 발생해야 함', async () => {
      // given
      const postId: number = 1;
      const updatePostDto: UpdatePostDto = {
        title: '수정된 제목',
        content: '수정된 내용',
        password: 'wrong_password',
      };

      // 비밀번호 불일치 모킹
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const postWithPassword: PostEntity = {
        ...mockPostEntity,
        password: 'hashed_password',
      };

      postsRepository.findByIdWithPassword.mockResolvedValue(postWithPassword);

      // when & then
      await expect(service.updatePost(postId, updatePostDto)).rejects.toThrow(
        new BadRequestException('비밀번호가 일치하지 않습니다.'),
      );

      expect(postsRepository.findByIdWithPassword).toHaveBeenCalledWith(
        postId,
        queryRunner,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        updatePostDto.password,
        postWithPassword.password,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('업데이트 중 오류 발생 시 트랜잭션 롤백해야 함', async () => {
      // given
      const postId: number = 1;
      const updatePostDto: UpdatePostDto = {
        title: '수정된 제목',
        content: '수정된 내용',
        password: 'correct_password',
      };

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const postWithPassword: PostEntity = {
        ...mockPostEntity,
        password: 'hashed_password',
      };

      postsRepository.findByIdWithPassword.mockResolvedValue(postWithPassword);

      // 업데이트 에러 모킹
      const updateError = new Error('업데이트 실패');
      postsRepository.update.mockRejectedValue(updateError);

      // when & then
      await expect(service.updatePost(postId, updatePostDto)).rejects.toThrow(
        updateError,
      );

      expect(postsRepository.findByIdWithPassword).toHaveBeenCalledWith(
        postId,
        queryRunner,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        updatePostDto.password,
        postWithPassword.password,
      );
      expect(postsRepository.update).toHaveBeenCalledWith(
        postId,
        {
          title: updatePostDto.title,
          content: updatePostDto.content,
        },
        queryRunner,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('removePost', () => {
    it('게시글을 성공적으로 삭제해야 함', async () => {
      // given
      const postId: number = 1;
      const password: string = 'correct_password';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const postWithPassword: PostEntity = {
        ...mockPostEntity,
        password: 'hashed_password',
      };

      postsRepository.findByIdWithPassword.mockResolvedValue(postWithPassword);
      postsRepository.remove.mockResolvedValue(undefined);

      // when
      await service.removePost(postId, password);

      // then
      expect(postsRepository.findByIdWithPassword).toHaveBeenCalledWith(postId);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        password,
        postWithPassword.password,
      );
      expect(postsRepository.remove).toHaveBeenCalledWith(postId);
    });

    it('존재하지 않는 게시글 삭제 시 NotFoundException 발생해야 함', async () => {
      // given
      const postId: number = 999;
      const password: string = 'password123';

      postsRepository.findByIdWithPassword.mockResolvedValue(null);

      // when & then
      await expect(service.removePost(postId, password)).rejects.toThrow(
        new NotFoundException(`ID가 ${postId}인 게시글을 찾을 수 없습니다.`),
      );

      expect(postsRepository.findByIdWithPassword).toHaveBeenCalledWith(postId);
      expect(postsRepository.remove).not.toHaveBeenCalled();
    });

    it('잘못된 비밀번호로 삭제 시도 시 BadRequestException 발생해야 함', async () => {
      // given
      const postId: number = 1;
      const password: string = 'wrong_password';

      // 비밀번호 불일치 모킹
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const postWithPassword: PostEntity = {
        ...mockPostEntity,
        password: 'hashed_password',
      };

      postsRepository.findByIdWithPassword.mockResolvedValue(postWithPassword);

      // when & then
      await expect(service.removePost(postId, password)).rejects.toThrow(
        new BadRequestException('비밀번호가 일치하지 않습니다.'),
      );

      expect(postsRepository.findByIdWithPassword).toHaveBeenCalledWith(postId);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        password,
        postWithPassword.password,
      );
      expect(postsRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('엣지 케이스', () => {
    it('첫 페이지 (page=1) 확인', async () => {
      // given
      const searchDto: SearchPostDto = {
        page: 1,
        limit: 10,
      };

      const posts: PostEntity[] = [mockPostEntity];
      const total: number = 1;

      postsRepository.findAll.mockResolvedValue([posts, total]);

      // when
      const result = await service.getPostList(searchDto);

      // then
      expect(result.meta?.page).toBe(1);
      expect(result.meta?.totalPages).toBe(1);
    });

    it('다음 페이지가 있는 경우 (totalPage > page) 확인', async () => {
      // given
      const searchDto: SearchPostDto = {
        page: 1,
        limit: 10,
      };

      // 11개의 게시글 (1페이지 + 1개 추가)
      const posts: PostEntity[] = Array(10).fill(mockPostEntity);
      const total: number = 11;

      postsRepository.findAll.mockResolvedValue([posts, total]);

      // when
      const result = await service.getPostList(searchDto);

      // then
      expect(result.meta?.total).toBe(total);
      expect(result.meta?.totalPages).toBe(2);
    });

    it('비밀번호만 있는 상태에서 아무 수정 내용 없이 업데이트 시도 시 정상 처리되어야 함', async () => {
      // given
      const postId: number = 1;
      const updatePostDto: UpdatePostDto = {
        password: 'correct_password',
      };

      // 비밀번호 확인 모킹
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const postWithPassword: PostEntity = {
        ...mockPostEntity,
        password: 'hashed_password',
      };

      postsRepository.findByIdWithPassword.mockResolvedValue(postWithPassword);
      postsRepository.update.mockResolvedValue(undefined);
      notificationRepository.updateSourceStatus.mockResolvedValue(undefined);

      // when
      await service.updatePost(postId, updatePostDto);

      // then
      expect(postsRepository.update).toHaveBeenCalledWith(
        postId,
        {},
        queryRunner,
      );

      expect(notificationRepository.updateSourceStatus).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('특수문자가 포함된 제목과 내용 처리', async () => {
      // given
      const titleWithSpecialChars = '특수문자! @#$%^&*()';
      const contentWithSpecialChars = '<script>alert("XSS")</script>';

      const createPostDto: CreatePostDto = {
        title: titleWithSpecialChars,
        content: contentWithSpecialChars,
        author: '작성자',
        password: 'password123',
      };

      const specialCharPost: PostEntity = {
        ...mockPostEntity,
        title: titleWithSpecialChars,
        content: contentWithSpecialChars,
      };

      postsRepository.create.mockResolvedValue(specialCharPost);

      // when
      const result = await service.createPost(createPostDto);

      // then
      expect(postsRepository.create).toHaveBeenCalledWith(
        createPostDto,
        'hashed_password',
      );
      expect(result.data.title).toBe(titleWithSpecialChars);
      expect(result.data.content).toBe(contentWithSpecialChars);
    });
  });
});
