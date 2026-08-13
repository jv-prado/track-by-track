import { BusinessRuleError } from '../../../../shared/kernel/errors/business-rule.error';

export class TrackNotInAlbumError extends BusinessRuleError {
  readonly code = 'TRACK_NOT_IN_ALBUM';

  constructor(trackId: string) {
    super(`A faixa "${trackId}" não pertence a este álbum.`);
  }
}
