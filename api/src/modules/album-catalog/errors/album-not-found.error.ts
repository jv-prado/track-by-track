import { NotFoundError } from '../../../shared/kernel/errors/not-found.error';

export class AlbumNotFoundError extends NotFoundError {
  readonly code = 'ALBUM_NOT_FOUND';

  constructor() {
    super('Álbum não encontrado.');
  }
}
