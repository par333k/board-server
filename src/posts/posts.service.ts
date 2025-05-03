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

@Injectable()
export class PostsService {
  constructor(private readonly postsRepository: PostsRepository) {}

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
    return ResponseUtil.success(post);
  }

  async updatePost(id: number, updatePostDto: UpdatePostDto): Promise<void> {
    const post = await this.postsRepository.findByIdWithPassword(id);

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

    if (updatePostDto.title) {
      updateData.title = updatePostDto.title;
    }

    if (updatePostDto.content) {
      updateData.content = updatePostDto.content;
    }

    await this.postsRepository.update(id, updateData);
  }

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
