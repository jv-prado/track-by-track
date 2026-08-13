import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain-error';

export abstract class ForbiddenError extends DomainError {
  readonly httpStatus = HttpStatus.FORBIDDEN;
}
