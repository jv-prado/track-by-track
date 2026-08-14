import { DomainError } from './domain-error';

export abstract class ConflictError extends DomainError {
  readonly httpStatus = 409;
}
