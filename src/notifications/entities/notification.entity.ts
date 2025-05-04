import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('notifications')
export class NotificationEntity {
  @ApiProperty({ description: '알림 ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '알림 수신자' })
  @Column({ length: 100 })
  recipient: string;

  @ApiProperty({ description: '매칭된 키워드' })
  @Column({ length: 100 })
  keyword: string;

  @ApiProperty({ description: '읽음 여부' })
  @Column({ default: false })
  is_read: boolean;

  @ApiProperty({ description: '생성일시' })
  @CreateDateColumn()
  created_at: Date;
}
