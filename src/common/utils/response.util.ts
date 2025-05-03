import { CommonApiResponse } from '../interfaces/api-response.interface';

export class ResponseUtil {
  /**
   * 데이터를 표준 응답 형식으로 변환
   */
  static success<T>(data: T, meta?: any): CommonApiResponse<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
      data,
      ...(meta && { meta: meta as { [key: string]: unknown } }),
    };
  }

  /**
   * 페이징된 응답을 위한 헬퍼 메서드
   */
  static paging<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): CommonApiResponse<T[]> {
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * void 응답을 위한 메서드
   */
  static empty(): CommonApiResponse<null> {
    return {
      data: null,
    };
  }
}
