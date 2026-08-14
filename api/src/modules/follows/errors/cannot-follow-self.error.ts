import { BusinessRuleError } from '../../../shared/kernel/errors/business-rule.error';

export class CannotFollowSelfError extends BusinessRuleError {
  readonly code = 'CANNOT_FOLLOW_SELF';

  constructor() {
    super('Você não pode seguir a si mesmo.');
  }
}
