import { BusinessRuleError } from '../../../../shared/kernel/errors/business-rule.error';

export class InvalidEmailError extends BusinessRuleError {
  readonly code = 'INVALID_EMAIL';

  constructor(rawEmail: string) {
    super(`"${rawEmail}" não é um e-mail válido.`);
  }
}
