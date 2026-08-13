import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain-error';

export abstract class ConflictError extends DomainError {
  readonly httpStatus = HttpStatus.CONFLICT;
}
