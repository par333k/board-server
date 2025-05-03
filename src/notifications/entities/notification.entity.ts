import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  recipient: string;

  @Column({
    type: 'enum',
    enum: ['post', 'comment'],
  })
  source_type: 'post' | 'comment';

  @Column()
  source_id: number;

  @Column({ length: 100 })
  keyword: string;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
