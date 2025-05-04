import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from './common/config/config.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GlobalExceptionFilter } from './common/filter/http-exception.filter';
import { Logger } from 'winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // API 라우트 전역 접두사
  app.setGlobalPrefix('api');

  // 전역 유효성 검사 파이프
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const logger = app.get<Logger>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);
  const exceptionFilter = app.get(GlobalExceptionFilter);
  app.useGlobalFilters(exceptionFilter);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use(helmet());
  app.enableCors();
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const config = new DocumentBuilder()
    .setTitle('게시판 API')
    .setDescription('게시판 및 키워드 알림 기능 API 문서')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.port;

  await app.listen(port);
  console.log(`애플리케이션이 http://localhost:${port}에서 실행 중입니다.`);
  console.log(`API 문서: http://localhost:${port}/api/docs`);
}

bootstrap();
