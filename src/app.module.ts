import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts/posts.module';
import { FiltersModule } from './common/filter/filters.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ConfigModule } from './common/config/config.module';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './common/health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [
    PostsModule,
    FiltersModule,
    DatabaseModule,
    HealthModule,
    ConfigModule,
    LoggerModule,
    CommentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        helmet(), // 보안 헤더 설정
        rateLimit({
          windowMs: 60 * 1000, // ms
          limit: 100,
          message: {
            error: 'Too many request, try again later',
          },
        }),
      )
      .forRoutes('*');
  }
}
