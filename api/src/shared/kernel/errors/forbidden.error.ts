import { DomainError } from './domain-error';

export abstract class ForbiddenError extends DomainError {
  readonly httpStatus = 403;
}
