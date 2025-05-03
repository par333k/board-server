import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { GetCommentDto } from './dto/get-comment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comments')
@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiOperation({ summary: '게시글에 대한 댓글 목록 조회' })
  @ApiParam({ name: 'postId', description: '게시글 ID' })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '페이지 당 항목 수',
  })
  @ApiQuery({
    name: 'rootOnly',
    required: false,
    description: '최상위 댓글만 조회',
  })
  @Get()
  async findAll(
    @Param('postId', ParseIntPipe) postId: number,
    @Query() getCommentDto: GetCommentDto,
  ) {
    return this.commentsService.findByPostId(postId, getCommentDto);
  }

  @ApiOperation({ summary: '댓글 상세 조회' })
  @ApiParam({ name: 'postId', description: '게시글 ID' })
  @ApiParam({ name: 'id', description: '댓글 ID' })
  @Get(':id')
  async findOne(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.commentsService.findById(id);
  }

  @ApiOperation({ summary: '게시글에 댓글 작성' })
  @ApiParam({ name: 'postId', description: '게시글 ID' })
  @ApiBody({ type: CreateCommentDto })
  @Post()
  async create(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(postId, createCommentDto);
  }

  @ApiOperation({ summary: '게시글 내 댓글 개수 조회' })
  @ApiParam({ name: 'postId', description: '게시글 ID' })
  @Get('count')
  async count(@Param('postId', ParseIntPipe) postId: number) {
    return this.commentsService.countByPostId(postId);
  }

  @ApiOperation({ summary: '댓글에 대댓글 작성' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiBody({ type: CreateCommentDto })
  @Post('/:commentId/replies')
  async createReply(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.createReply(commentId, createCommentDto);
  }
}
