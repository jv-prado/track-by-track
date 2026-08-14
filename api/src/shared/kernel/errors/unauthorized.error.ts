import { DomainError } from './domain-error';

export abstract class UnauthorizedError extends DomainError {
  readonly httpStatus = 401;
}
