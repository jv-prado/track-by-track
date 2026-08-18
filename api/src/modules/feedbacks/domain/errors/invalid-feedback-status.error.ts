import { BusinessRuleError } from '../../../../shared/kernel/errors/business-rule.error';

export class InvalidFeedbackStatusError extends BusinessRuleError {
  readonly code = 'INVALID_FEEDBACK_STATUS';

  constructor(status: string) {
    super(
      `Status inválido: ${status}. Os status permitidos são: open, answered, closed.`,
    );
  }
}
