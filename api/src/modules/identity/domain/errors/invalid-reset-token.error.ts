import { BusinessRuleError } from '../../../../shared/kernel/errors/business-rule.error';

export class InvalidResetTokenError extends BusinessRuleError {
  readonly code = 'INVALID_RESET_TOKEN';

  constructor() {
    super('Link de redefinição de senha inválido ou expirado.');
  }
}
