import { BusinessRuleError } from '../../../../shared/kernel/errors/business-rule.error';

export class InvalidScoreError extends BusinessRuleError {
  readonly code = 'INVALID_SCORE';

  constructor(value: number) {
    super(
      `Nota "${value}" inválida — precisa ser múltiplo de 0.5 entre 0 e 5.`,
    );
  }
}
