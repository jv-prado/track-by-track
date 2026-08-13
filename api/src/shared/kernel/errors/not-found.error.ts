import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain-error';

export abstract class NotFoundError extends DomainError {
  readonly httpStatus = HttpStatus.NOT_FOUND;
}
