import { Module } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

@Module({
  providers: [GlobalExceptionFilter],
  exports: [GlobalExceptionFilter],
})
export class FiltersModule {}
