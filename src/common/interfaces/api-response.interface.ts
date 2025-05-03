export interface CommonApiResponse<T> {
  data: T;
  meta?: {
    [key: string]: any;
  };
}
