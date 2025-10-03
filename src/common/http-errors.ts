import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

type Details = Record<string, unknown> | undefined;

const payload = (message: string, error: string, details?: Details) => ({
  error,
  message,
  ...(details ? { details } : {}),
});

export const badRequest = (message: string, details?: Details) =>
  new BadRequestException(payload(message, 'Bad Request', details));

export const unauthorized = (message: string, details?: Details) =>
  new UnauthorizedException(payload(message, 'Unauthorized', details));

export const forbidden = (message: string, details?: Details) =>
  new ForbiddenException(payload(message, 'Forbidden', details));

export const notFound = (message: string, details?: Details) =>
  new NotFoundException(payload(message, 'Not Found', details));

export const conflict = (message: string, details?: Details) =>
  new ConflictException(payload(message, 'Conflict', details));

export const unprocessable = (message: string, details?: Details) =>
  new UnprocessableEntityException(
    payload(message, 'Unprocessable Entity', details),
  );

export const internal = (message: string, details?: Details) =>
  new InternalServerErrorException(
    payload(message, 'Internal Server Error', details),
  );
