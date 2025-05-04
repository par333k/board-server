import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostsRepository } from './posts.repository';
import { SearchPostDto } from './dto/search-post.dto';
import { PostEntity } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import * as bcrypt from 'bcrypt';
import { UpdatePostDto } from './dto/update-post.dto';
import { ResponseUtil } from '../common/utils/response.util';
import { CommonApiResponse } from '../common/interfaces/api-response.interface';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { DataSource } from 'typeorm';
import { KEYWORD_SOURCE_TYPE, SOURCE_STATUS } from '../common/enum/shared.enum';

@Injectable()
export class PostsService {
  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly notificationRepository: NotificationsRepository,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  async getPostList(
    searchDto: SearchPostDto,
  ): Promise<CommonApiResponse<PostEntity[]>> {
    const [posts, total] = await this.postsRepository.findAll(searchDto);

    return ResponseUtil.paging(posts, total, searchDto.page, searchDto.limit);
  }

  async getPost(id: number): Promise<CommonApiResponse<PostEntity>> {
    const post = await this.postsRepository.findById(id);

    if (!post) {
      throw new NotFoundException(`ID가 ${id}인 게시글을 찾을 수 없습니다.`);
    }

    return ResponseUtil.success(post);
  }

  async createPost(
    createPostDto: CreatePostDto,
  ): Promise<CommonApiResponse<PostEntity>> {
    const hashedPassword = await bcrypt.hash(createPostDto.password, 10);

    const post = await this.postsRepository.create(
      createPostDto,
      hashedPassword,
    );

    await this.notificationsQueue.add('processPostKeywords', {
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.author,
    });

    return ResponseUtil.success(post);
  }

  async updatePost(id: number, updatePostDto: UpdatePostDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const post = await this.postsRepository.findByIdWithPassword(
        id,
        queryRunner,
      );

      if (!post) {
        throw new NotFoundException(`ID가 ${id}인 게시글을 찾을 수 없습니다.`);
      }

      const isPasswordValid = await bcrypt.compare(
        updatePostDto.password,
        post.password,
      );

      if (!isPasswordValid) {
        throw new BadRequestException('비밀번호가 일치하지 않습니다.');
      }

      const updateData: Partial<PostEntity> = {};
      if (updatePostDto.title) updateData.title = updatePostDto.title;
      if (updatePostDto.content) updateData.content = updatePostDto.content;

      await this.postsRepository.update(id, updateData, queryRunner);
      await this.notificationRepository.updateSourceStatus(
        KEYWORD_SOURCE_TYPE.POST,
        id,
        SOURCE_STATUS.MODIFIED,
        new Date(),
        queryRunner,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 실제 프로덕션 환경에서는 soft delete 형식으로 처리해야함
  // soft deleted에 따르는 알람 관리 복잡성 때문에 cascade 및 hard delete로 처리.
  async removePost(id: number, password: string): Promise<void> {
    const post = await this.postsRepository.findByIdWithPassword(id);

    if (!post) {
      throw new NotFoundException(`ID가 ${id}인 게시글을 찾을 수 없습니다.`);
    }

    const isPasswordValid = await bcrypt.compare(password, post.password);

    if (!isPasswordValid) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }

    await this.postsRepository.remove(id);
  }
}
