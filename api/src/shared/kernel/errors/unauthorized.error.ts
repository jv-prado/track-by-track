import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain-error';

export abstract class UnauthorizedError extends DomainError {
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
}
