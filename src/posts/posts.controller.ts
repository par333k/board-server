import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { SearchPostDto } from './dto/search-post.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostEntity } from './entities/post.entity';
import { CommonApiResponse } from '../common/interfaces/api-response.interface';

@ApiTags('게시물 API')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @ApiOperation({ summary: '게시글 목록 조회' })
  @ApiQuery({ name: 'title', required: false, description: '제목 검색어' })
  @ApiQuery({ name: 'author', required: false, description: '작성자 검색어' })
  @ApiQuery({
    name: 'page',
    required: true,
    description: '페이지 번호',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: true,
    description: '페이지 당 항목 수',
    type: Number,
  })
  @Get()
  async getPostList(
    @Query() searchDto: SearchPostDto,
  ): Promise<CommonApiResponse<PostEntity[]>> {
    return this.postsService.getPostList(searchDto);
  }

  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  @Get(':id')
  async getPost(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CommonApiResponse<PostEntity>> {
    return this.postsService.getPost(id);
  }

  @ApiOperation({ summary: '게시글 작성' })
  @ApiBody({ type: CreatePostDto })
  @Post()
  async createPost(
    @Body() createPostDto: CreatePostDto,
  ): Promise<CommonApiResponse<PostEntity>> {
    return this.postsService.createPost(createPostDto);
  }

  @ApiOperation({ summary: '게시글 수정' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  @ApiBody({ type: UpdatePostDto })
  @Put(':id')
  async updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<void> {
    return this.postsService.updatePost(id, updatePostDto);
  }

  @ApiOperation({ summary: '게시글 삭제' })
  @ApiParam({ name: 'id', description: '게시글 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        password: {
          type: 'string',
          description: '게시글 비밀번호',
        },
      },
      required: ['password'],
    },
  })
  @Delete(':id')
  async removePost(
    @Param('id', ParseIntPipe) id: number,
    @Body('password') password: string,
  ): Promise<void> {
    await this.postsService.removePost(id, password);
  }
}
