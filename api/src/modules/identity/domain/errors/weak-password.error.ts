import { BusinessRuleError } from '../../../../shared/kernel/errors/business-rule.error';

export class WeakPasswordError extends BusinessRuleError {
  readonly code = 'WEAK_PASSWORD';

  constructor() {
    super('A senha precisa ter no mínimo 8 caracteres.');
  }
}
