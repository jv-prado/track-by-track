import { DomainError } from './domain-error';

export abstract class BusinessRuleError extends DomainError {
  readonly httpStatus = 422;
  readonly details?: { field: string; message: string }[];
}
