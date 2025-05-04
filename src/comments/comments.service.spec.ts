import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './comments.repository';
import { PostsRepository } from '../posts/posts.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GetCommentDto } from './dto/get-comment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentEntity } from './entities/comment.entity';
import { getQueueToken } from '@nestjs/bull';
import { PostEntity } from '../posts/entities/post.entity';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentsRepository: jest.Mocked<CommentsRepository>;
  let postsRepository: jest.Mocked<PostsRepository>;

  let notificationsQueue: any;

  const mockCommentEntity: CommentEntity = {
    id: 1,
    content: '테스트 댓글',
    author: '작성자',
    post_id: 1,
    parent_id: null,
    created_at: new Date(),
    replies: [],
    post: new PostEntity(),
    parent: new CommentEntity(),
  };

  const mockCreateCommentDto: CreateCommentDto = {
    content: '테스트 댓글',
    author: '작성자',
    parent_id: undefined,
  };

  beforeEach(async () => {
    const mockCommentsRepository = {
      findByPostId: jest.fn(),
      findById: jest.fn(),
      createComment: jest.fn(),
      countByPostId: jest.fn(),
      findRepliesByParentId: jest.fn(),
    };

    const mockPostsRepository = {
      findById: jest.fn(),
    };

    const mockNotificationsQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: CommentsRepository,
          useValue: mockCommentsRepository,
        },
        {
          provide: PostsRepository,
          useValue: mockPostsRepository,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockNotificationsQueue,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    commentsRepository = module.get(CommentsRepository);
    postsRepository = module.get(PostsRepository);
    notificationsQueue = module.get(
      getQueueToken('notifications'),
    );
  });

  describe('findByPostId', () => {
    it('게시글 ID로 댓글 목록을 성공적으로 조회해야 함', async () => {
      // given
      const postId = 1;
      const getCommentDto: GetCommentDto = { page: 1, limit: 10 };
      const comments = [mockCommentEntity];
      const total = 1;

      postsRepository.findById.mockResolvedValue({
        id: postId,
        title: '테스트 게시글',
      } as PostEntity);
      commentsRepository.findByPostId.mockResolvedValue([comments, total]);

      // when
      const result = await service.findByPostId(postId, getCommentDto);

      // then
      expect(postsRepository.findById).toHaveBeenCalledWith(postId);
      expect(commentsRepository.findByPostId).toHaveBeenCalledWith(
        postId,
        getCommentDto,
      );
      expect(result.data).toEqual(comments);
      expect(result?.meta?.total).toBe(total);
    });

    it('존재하지 않는 게시글의 댓글을 조회할 경우 NotFoundException을 발생시켜야 함', async () => {
      // given
      const postId = 999;
      const getCommentDto: GetCommentDto = { page: 1, limit: 10 };

      postsRepository.findById.mockResolvedValue(null);

      // when, then
      await expect(service.findByPostId(postId, getCommentDto)).rejects.toThrow(
        new NotFoundException(`ID가 ${postId}인 게시글을 찾을 수 없습니다.`),
      );
      expect(postsRepository.findById).toHaveBeenCalledWith(postId);
      expect(commentsRepository.findByPostId).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('ID로 댓글을 성공적으로 조회해야 함', async () => {
      // given
      const commentId = 1;
      commentsRepository.findById.mockResolvedValue(mockCommentEntity);

      // when
      const result = await service.findById(commentId);

      // then
      expect(commentsRepository.findById).toHaveBeenCalledWith(commentId);
      expect(result.data).toEqual(mockCommentEntity);
    });

    it('존재하지 않는 댓글을 조회할 경우 NotFoundException을 발생시켜야 함', async () => {
      // given
      const commentId = 999;
      commentsRepository.findById.mockResolvedValue(null);

      // when, then
      await expect(service.findById(commentId)).rejects.toThrow(
        new NotFoundException(`ID가 ${commentId}인 댓글을 찾을 수 없습니다.`),
      );
      expect(commentsRepository.findById).toHaveBeenCalledWith(commentId);
    });
  });

  describe('createComment', () => {
    it('게시글에 댓글을 성공적으로 생성해야 함', async () => {
      // given
      const postId = 1;
      postsRepository.findById.mockResolvedValue({
        id: postId,
        title: '테스트 게시글',
      } as PostEntity);
      commentsRepository.createComment.mockResolvedValue(mockCommentEntity);

      // when
      const result = await service.createComment(postId, mockCreateCommentDto);

      // then
      expect(postsRepository.findById).toHaveBeenCalledWith(postId);
      expect(commentsRepository.createComment).toHaveBeenCalledWith(
        postId,
        mockCreateCommentDto,
      );
      expect(notificationsQueue.add).toHaveBeenCalledWith(
        'processCommentKeywords',
        {
          commentId: mockCommentEntity.id,
          content: mockCommentEntity.content,
          author: mockCommentEntity.author,
          postId: mockCommentEntity.post_id,
        },
        {
          attempts: 3,
          removeOnComplete: true,
        },
      );
      expect(result.data).toEqual(mockCommentEntity);
    });

    it('존재하지 않는 게시글에 댓글을 생성할 경우 NotFoundException을 발생시켜야 함', async () => {
      // given
      const postId = 999;
      postsRepository.findById.mockResolvedValue(null);

      // when, then
      await expect(
        service.createComment(postId, mockCreateCommentDto),
      ).rejects.toThrow(
        new NotFoundException(`ID가 ${postId}인 게시글을 찾을 수 없습니다.`),
      );
      expect(postsRepository.findById).toHaveBeenCalledWith(postId);
      expect(commentsRepository.createComment).not.toHaveBeenCalled();
    });

    it('존재하지 않는 부모 댓글 ID로 댓글을 생성할 경우 NotFoundException을 발생시켜야 함', async () => {
      // given
      const postId = 1;
      const parentId = 999;
      const createDtoWithParent = {
        ...mockCreateCommentDto,
        parent_id: parentId,
      };

      postsRepository.findById.mockResolvedValue({
        id: postId,
        title: '테스트 게시글',
      } as PostEntity);
      commentsRepository.findById.mockResolvedValue(null);

      // when, then
      await expect(
        service.createComment(postId, createDtoWithParent),
      ).rejects.toThrow(
        new NotFoundException(
          `ID가 ${parentId}인 부모 댓글을 찾을 수 없습니다.`,
        ),
      );
      expect(postsRepository.findById).toHaveBeenCalledWith(postId);
      expect(commentsRepository.findById).toHaveBeenCalledWith(parentId);
      expect(commentsRepository.createComment).not.toHaveBeenCalled();
    });

    it('이미 부모가 있는 댓글에 댓글을 달려고 할 경우 BadRequestException을 발생시켜야 함', async () => {
      // given
      const postId = 1;
      const parentId = 2;
      const createDtoWithParent = {
        ...mockCreateCommentDto,
        parent_id: parentId,
      };

      const parentComment = {
        ...mockCommentEntity,
        id: parentId,
        parent_id: 3, // 이미 부모가 있는 댓글
      };

      postsRepository.findById.mockResolvedValue({
        id: postId,
        title: '테스트 게시글',
      } as PostEntity);
      commentsRepository.findById.mockResolvedValue(parentComment);

      // when, then
      await expect(
        service.createComment(postId, createDtoWithParent),
      ).rejects.toThrow(
        new BadRequestException('대댓글에는 댓글을 달 수 없습니다'),
      );
      expect(postsRepository.findById).toHaveBeenCalledWith(postId);
      expect(commentsRepository.findById).toHaveBeenCalledWith(parentId);
      expect(commentsRepository.createComment).not.toHaveBeenCalled();
    });
  });

  describe('createReply', () => {
    it('댓글에 대댓글을 성공적으로 생성해야 함', async () => {
      // given
      const parentId = 1;
      const postId = 10;
      const parentComment = {
        ...mockCommentEntity,
        id: parentId,
        post_id: postId,
        parent_id: null,
      };

      const replyEntity = {
        ...mockCommentEntity,
        id: 2,
        parent_id: parentId,
        post_id: postId,
      };

      commentsRepository.findById.mockResolvedValue(parentComment);
      commentsRepository.createComment.mockResolvedValue(replyEntity);

      // when
      const result = await service.createReply(parentId, mockCreateCommentDto);

      // then
      expect(commentsRepository.findById).toHaveBeenCalledWith(parentId);
      expect(commentsRepository.createComment).toHaveBeenCalledWith(postId, {
        ...mockCreateCommentDto,
        parent_id: parentId,
      });
      expect(notificationsQueue.add).toHaveBeenCalledWith(
        'processCommentKeywords',
        {
          commentId: replyEntity.id,
          content: replyEntity.content,
          author: replyEntity.author,
          postId: replyEntity.post_id,
        },
        {
          attempts: 3,
          removeOnComplete: true,
        },
      );
      expect(result.data).toEqual(replyEntity);
    });

    it('존재하지 않는 댓글에 대댓글을 생성할 경우 NotFoundException을 발생시켜야 함', async () => {
      // given
      const parentId = 999;
      commentsRepository.findById.mockResolvedValue(null);

      // when, then
      await expect(
        service.createReply(parentId, mockCreateCommentDto),
      ).rejects.toThrow(
        new NotFoundException(`ID가 ${parentId}인 댓글을 찾을 수 없습니다.`),
      );
      expect(commentsRepository.findById).toHaveBeenCalledWith(parentId);
      expect(commentsRepository.createComment).not.toHaveBeenCalled();
    });

    it('이미 대댓글인 댓글에 대댓글을 달려고 할 경우 BadRequestException을 발생시켜야 함', async () => {
      // given
      const parentId = 2;
      const parentComment = {
        ...mockCommentEntity,
        id: parentId,
        parent_id: 1, // 이미 대댓글임
      };

      commentsRepository.findById.mockResolvedValue(parentComment);

      // when, then
      await expect(
        service.createReply(parentId, mockCreateCommentDto),
      ).rejects.toThrow(
        new BadRequestException(
          '대댓글에는 댓글을 달 수 없습니다. (최대 2단계까지 허용)',
        ),
      );
      expect(commentsRepository.findById).toHaveBeenCalledWith(parentId);
      expect(commentsRepository.createComment).not.toHaveBeenCalled();
    });
  });

  describe('countByPostId', () => {
    it('게시글 ID로 댓글 수를 성공적으로 조회해야 함', async () => {
      // given
      const postId = 1;
      const count = 10;
      commentsRepository.countByPostId.mockResolvedValue(count);

      // when
      const result = await service.countByPostId(postId);

      // then
      expect(commentsRepository.countByPostId).toHaveBeenCalledWith(postId);
      expect(result.data).toEqual({ count });
    });

    it('댓글이 없는 게시글의 댓글 수 조회 시 0을 반환해야 함', async () => {
      // given
      const postId = 1;
      commentsRepository.countByPostId.mockResolvedValue(0);

      // when
      const result = await service.countByPostId(postId);

      // then
      expect(commentsRepository.countByPostId).toHaveBeenCalledWith(postId);
      expect(result.data).toEqual({ count: 0 });
    });
  });
});
