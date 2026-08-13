import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import type { ZodError } from 'zod';
import { DomainError } from '../../kernel/errors/domain-error';
import { BusinessRuleError } from '../../kernel/errors/business-rule.error';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: { field: string; message: string }[];
  timestamp: string;
  path: string;
}

const HTTP_STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
};

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.toErrorBody(exception, request.path);
    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }
    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown, path: string): ErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof DomainError) {
      return {
        statusCode: exception.httpStatus,
        code: exception.code,
        message: exception.message,
        details:
          exception instanceof BusinessRuleError
            ? exception.details
            : undefined,
        timestamp,
        path,
      };
    }

    // Sem isto o cliente recebe só `400 "Validation failed"` e nem o campo que quebrou —
    // a seção 3 do CLAUDE.md manda 422 com `details`.
    if (exception instanceof ZodValidationException) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'VALIDATION_FAILED',
        message: 'Dados inválidos.',
        details: (exception.getZodError() as ZodError).issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
        timestamp,
        path,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ??
            exception.message);
      return {
        statusCode: status,
        code: HTTP_STATUS_CODES[status] ?? 'HTTP_ERROR',
        message: Array.isArray(message) ? message.join('; ') : message,
        details:
          status === 400 && typeof payload === 'object' && payload !== null
            ? this.extractValidationDetails(payload as Record<string, unknown>)
            : undefined,
        timestamp,
        path,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Erro interno inesperado.',
      timestamp,
      path,
    };
  }

  private extractValidationDetails(
    payload: Record<string, unknown>,
  ): { field: string; message: string }[] | undefined {
    const message = payload.message;
    if (!Array.isArray(message)) return undefined;
    return message.map((entry) => ({
      field: 'unknown',
      message: String(entry),
    }));
  }
}
