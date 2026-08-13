import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain-error';

export abstract class BusinessRuleError extends DomainError {
  readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
  readonly details?: { field: string; message: string }[];
}
