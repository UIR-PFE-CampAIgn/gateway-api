import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse() as any;
      const message = res?.message ?? exception.message;
      const error = res?.error ?? HttpStatus[status] ?? 'Error';

      response.status(status).json({
        statusCode: status,
        error,
        message,
        ...(res?.details ? { details: res.details } : {}),
        path: request.originalUrl ?? request.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Unknown error
    this.logger.error('Unhandled error', (exception as any)?.stack || String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      path: request.originalUrl ?? request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

