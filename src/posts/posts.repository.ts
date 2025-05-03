import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from './entities/post.entity';
import { Repository } from 'typeorm';
import { SearchPostDto } from './dto/search-post.dto';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsRepository {
  constructor(
    @InjectRepository(PostEntity)
    private readonly repository: Repository<PostEntity>,
  ) {}

  async findAll(searchDto: SearchPostDto): Promise<[PostEntity[], number]> {
    const query = this.repository.createQueryBuilder('post');

    if (searchDto.title) {
      query.andWhere('post.title LIKE :title', {
        title: `%${searchDto.title}%`,
      });
    }

    if (searchDto.author) {
      query.andWhere('post.author LIKE :author', {
        author: `%${searchDto.author}%`,
      });
    }

    // 페이징 처리
    query
      .orderBy('post.created_at', 'DESC')
      .skip((searchDto.page - 1) * searchDto.limit)
      .take(searchDto.limit);

    return query.getManyAndCount();
  }

  async findById(id: number): Promise<PostEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdWithPassword(id: number): Promise<PostEntity | null> {
    return this.repository
      .createQueryBuilder('post')
      .where('post.id = :id', { id })
      .addSelect('post.password')
      .getOne();
  }

  async create(
    createPostDto: CreatePostDto,
    hashedPassword: string,
  ): Promise<PostEntity> {
    const post = this.repository.create({
      ...createPostDto,
      password: hashedPassword,
    });

    return this.repository.save(post);
  }

  async update(
    id: number,
    updateData: Partial<PostEntity>,
  ): Promise<PostEntity | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
