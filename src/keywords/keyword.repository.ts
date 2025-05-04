import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { KeywordEntity } from './entities/keyword.entity';
import { Repository } from 'typeorm';

@Injectable()
export class KeywordRepository {
  constructor(
    @InjectRepository(KeywordEntity)
    private readonly repository: Repository<KeywordEntity>,
  ) {}

  async findMatchingKeywords(content: string): Promise<KeywordEntity[]> {
    const matchingKeywords = await this.repository
      .createQueryBuilder('kn')
      .where(`MATCH(kn.keyword) AGAINST(:content IN BOOLEAN MODE)`, { content })
      .getMany();

    // 보다 정확한 매칭을 위한 후 필터링 (대소문자 구분 없이)
    return matchingKeywords.filter((k) => {
      const lowerContent = content.toLowerCase();
      const lowerKeyword = k.keyword.toLowerCase();

      // 공백이나 문장 부호로 구분된 단어로 매칭
      const words = lowerContent.split(/\s+|[.,!?]/);
      return words.some(
        (word) =>
          word === lowerKeyword ||
          lowerContent.includes(` ${lowerKeyword} `) ||
          lowerContent.startsWith(`${lowerKeyword} `) ||
          lowerContent.endsWith(` ${lowerKeyword}`),
      );
    });
  }

  async findByAuthor(author: string): Promise<KeywordEntity[]> {
    return this.repository.find({
      where: { author },
    });
  }

  async create(author: string, keyword: string): Promise<KeywordEntity> {
    const keywordNotification = this.repository.create({ author, keyword });
    return this.repository.save(keywordNotification);
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
