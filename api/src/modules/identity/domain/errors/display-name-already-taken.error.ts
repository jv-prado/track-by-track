import { ConflictError } from '../../../../shared/kernel/errors/conflict.error';

export class DisplayNameAlreadyTakenError extends ConflictError {
  readonly code = 'USER_DISPLAY_NAME_ALREADY_TAKEN';

  constructor(displayName: string) {
    super(`O nome de exibição "${displayName}" já está em uso.`);
  }
}
