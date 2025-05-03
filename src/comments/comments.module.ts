import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsModule } from '../posts/posts.module';
import { BullModule } from '@nestjs/bull';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './comments.repository';
import { CommentEntity } from './entities/comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommentEntity]),
    PostsModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsRepository],
  exports: [CommentsService, CommentsRepository],
})
export class CommentsModule {}
