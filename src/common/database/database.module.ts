import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.database.host,
        port: configService.database.port,
        username: configService.database.username,
        password: configService.database.password,
        database: configService.database.database,
        entities: ['dist/**/*.entity{.ts,.js}'],
        logging: configService.nodeEnv === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
