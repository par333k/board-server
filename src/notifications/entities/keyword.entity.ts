import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('keywords')
export class Keyword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  author: string;

  @Column({ length: 100 })
  keyword: string;
}
