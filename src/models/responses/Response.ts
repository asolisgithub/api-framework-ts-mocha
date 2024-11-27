import { AxiosResponse } from "axios";

export interface Response<T> {
  data: T;
  status: number;
  headers: AxiosResponse["headers"];
  responseTime: number;
}
