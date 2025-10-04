import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';

export interface HttpClientOptions {
  baseURL?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

@Injectable()
export class HttpClientService {
  protected readonly logger = new Logger(HttpClientService.name);
  protected readonly axios: AxiosInstance;

  constructor(options?: HttpClientOptions) {
    this.axios = axios.create({
      baseURL: options?.baseURL,
      timeout: options?.timeoutMs ?? 8000,
      headers: options?.headers,
      validateStatus: (s) => s >= 200 && s < 300,
    });
  }

  protected parseError(e: unknown): Error {
    if (axios.isAxiosError(e)) {
      const ae = e as AxiosError<any>;
      const msg = ae.response?.data?.message || ae.message;
      return new Error(`HTTP ${ae.response?.status ?? ''} ${msg}`.trim());
    }
    return e as Error;
  }
}
