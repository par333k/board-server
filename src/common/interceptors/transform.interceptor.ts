import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { CommonApiResponse } from '../interfaces/api-response.interface';

export interface StandardResponse<T> {
  statusCode: number;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T = any>
  implements NestInterceptor<unknown, StandardResponse<T | null>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T | null>> {
    return next.handle().pipe(
      map((response: CommonApiResponse<T> | undefined | null) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
        const statusCode = context.switchToHttp().getResponse().statusCode;

        // void 응답 처리
        if (response == null) {
          return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            statusCode,
            data: null,
          };
        }

        if (response.data !== undefined) {
          return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            statusCode,
            data: response.data,
            ...(response.meta && { meta: response.meta }),
          };
        }

        return {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          statusCode,
          data: response as unknown as T,
        };
      }),
    );
  }
}
