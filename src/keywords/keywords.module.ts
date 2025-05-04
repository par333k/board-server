import { Module } from '@nestjs/common';
import { KeywordEntity } from './entities/keyword.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeywordsService } from './keywords.service';
import { KeywordsRepository } from './keywords.repository';

@Module({
  imports: [TypeOrmModule.forFeature([KeywordEntity])],
  providers: [KeywordsService, KeywordsRepository],
  exports: [KeywordsService, KeywordsRepository],
})
export class KeywordsModule {}
