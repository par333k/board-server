import { Module } from '@nestjs/common';
import { KeywordEntity } from './entities/keyword.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeywordsService } from './keywords.service';
import { KeywordsRepository } from './keywords.repository';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [TypeOrmModule.forFeature([KeywordEntity]), CacheModule],
  providers: [KeywordsService, KeywordsRepository],
  exports: [KeywordsService, KeywordsRepository],
})
export class KeywordsModule {}
