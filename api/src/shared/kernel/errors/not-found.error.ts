import { DomainError } from './domain-error';

export abstract class NotFoundError extends DomainError {
  readonly httpStatus = 404;
}
