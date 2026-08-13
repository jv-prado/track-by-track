import { BusinessRuleError } from '../../../../shared/kernel/errors/business-rule.error';

export class TrackIgnoredError extends BusinessRuleError {
  readonly code = 'TRACK_IGNORED';

  constructor(trackId: string) {
    super(`A faixa "${trackId}" está marcada como ignorada.`);
  }
}
