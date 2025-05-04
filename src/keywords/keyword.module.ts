import { Module } from '@nestjs/common';
import { KeywordEntity } from './entities/keyword.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeywordService } from './keyword.service';
import { KeywordRepository } from './keyword.repository';

@Module({
  imports: [TypeOrmModule.forFeature([KeywordEntity])],
  providers: [KeywordService, KeywordRepository],
  exports: [KeywordService, KeywordRepository],
})
export class KeywordModule {}
