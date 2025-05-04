import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SOURCE_STATUS } from '../../common/enum/shared.enum';

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

  @ApiProperty({ description: '소스 컨텐츠 상태' })
  @Column({
    type: 'enum',
    enum: SOURCE_STATUS,
    default: 'active',
  })
  source_status: SOURCE_STATUS;

  @ApiProperty({ description: '소스 컨텐츠 마지막 수정 시간' })
  @Column({ type: 'timestamp', nullable: true })
  source_updated_at: Date | null;

  @ApiProperty({ description: '생성일시' })
  @CreateDateColumn()
  created_at: Date;
}
