import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('keywords')
export class KeywordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  author: string;

  @Column({ length: 100 })
  keyword: string;
}
