import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommentsRepository } from './comments.repository';
import { PostsRepository } from '../posts/posts.repository';
import { GetCommentDto } from './dto/get-comment.dto';
import { ResponseUtil } from '../common/utils/response.util';
import { CommonApiResponse } from '../common/interfaces/api-response.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CommentEntity } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly postsRepository: PostsRepository,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
  ) {}

  async findByPostId(
    postId: number,
    getCommentDto: GetCommentDto,
  ): Promise<CommonApiResponse<CommentEntity[]>> {
    const post = await this.postsRepository.findById(postId);
    if (!post) {
      throw new NotFoundException(
        `ID가 ${postId}인 게시글을 찾을 수 없습니다.`,
      );
    }

    const [comments, total] = await this.commentsRepository.findByPostId(
      postId,
      getCommentDto,
    );

    return ResponseUtil.paging(
      comments,
      total,
      getCommentDto.page,
      getCommentDto.limit,
    );
  }

  async findById(id: number): Promise<CommonApiResponse<CommentEntity>> {
    const comment = await this.commentsRepository.findById(id);

    if (!comment) {
      throw new NotFoundException(`ID가 ${id}인 댓글을 찾을 수 없습니다.`);
    }

    return ResponseUtil.success(comment);
  }

  async createComment(
    postId: number,
    createCommentDto: CreateCommentDto,
  ): Promise<CommonApiResponse<CommentEntity>> {
    const post = await this.postsRepository.findById(postId);
    if (!post) {
      throw new NotFoundException(
        `ID가 ${postId}인 게시글을 찾을 수 없습니다.`,
      );
    }

    if (createCommentDto.parent_id) {
      const parentComment = await this.commentsRepository.findById(
        createCommentDto.parent_id,
      );
      if (!parentComment) {
        throw new NotFoundException(
          `ID가 ${createCommentDto.parent_id}인 부모 댓글을 찾을 수 없습니다.`,
        );
      }

      if (parentComment.parent_id) {
        throw new BadRequestException('대댓글에는 댓글을 달 수 없습니다');
      }
    }

    const comment = await this.commentsRepository.createComment(
      postId,
      createCommentDto,
    );

    // 키워드 알림 처리를 큐에 추가
    await this.notificationsQueue.add(
      'processCommentKeywords',
      {
        commentId: comment.id,
        content: comment.content,
        author: comment.author,
        postId: comment.post_id,
      },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );

    return ResponseUtil.success(comment);
  }

  async createReply(
    parentId: number,
    createCommentDto: CreateCommentDto,
  ): Promise<CommonApiResponse<CommentEntity>> {
    const parentComment = await this.commentsRepository.findById(parentId);
    if (!parentComment) {
      throw new NotFoundException(
        `ID가 ${parentId}인 댓글을 찾을 수 없습니다.`,
      );
    }

    if (parentComment.parent_id) {
      throw new BadRequestException(
        '대댓글에는 댓글을 달 수 없습니다. (최대 2단계까지 허용)',
      );
    }

    const replyDto: CreateCommentDto = {
      ...createCommentDto,
      parent_id: parentId,
    };

    const reply = await this.commentsRepository.createComment(
      parentComment.post_id,
      replyDto,
    );

    await this.notificationsQueue.add(
      'processCommentKeywords',
      {
        commentId: reply.id,
        content: reply.content,
        author: reply.author,
        postId: reply.post_id,
      },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );

    return ResponseUtil.success(reply);
  }

  async countByPostId(
    postId: number,
  ): Promise<CommonApiResponse<{ count: number }>> {
    const count = await this.commentsRepository.countByPostId(postId);
    return ResponseUtil.success({ count });
  }
}
