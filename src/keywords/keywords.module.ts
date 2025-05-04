import { Module } from '@nestjs/common';
import { KeywordEntity } from './entities/keyword.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeywordsService } from './keywords.service';
import { KeywordsRepository } from './keywords.repository';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([KeywordEntity]), RedisModule],
  providers: [KeywordsService, KeywordsRepository],
  exports: [KeywordsService, KeywordsRepository],
})
export class KeywordsModule {}
