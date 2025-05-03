import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentEntity } from './entities/comment.entity';
import { Repository } from 'typeorm';
import { GetCommentDto } from './dto/get-comment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsRepository {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly repository: Repository<CommentEntity>,
  ) {}

  async findByPostId(
    postId: number,
    getCommentsDto: GetCommentDto,
  ): Promise<[CommentEntity[], number]> {
    const query = this.repository
      .createQueryBuilder('comment')
      .where('comment.post_id = :postId', { postId })
      .leftJoinAndSelect('comment.replies', 'replies')
      .orderBy('comment.created_at', 'DESC')
      .addOrderBy('replies.created_at', 'ASC')
      .skip((getCommentsDto.page - 1) * getCommentsDto.limit)
      .take(getCommentsDto.limit);

    return query.getManyAndCount();
  }

  async findById(id: number): Promise<CommentEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['replies'],
    });
  }

  async createComment(
    postId: number,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentEntity> {
    const comment = this.repository.create({
      ...createCommentDto,
      post_id: postId,
    });

    return this.repository.save(comment);
  }

  async findRepliesByParentId(parentId: number): Promise<CommentEntity[]> {
    return this.repository.find({
      where: { parent_id: parentId },
      order: { created_at: 'ASC' },
    });
  }

  async countByPostId(postId: number): Promise<number> {
    return this.repository.count({
      where: { post_id: postId },
    });
  }
}
