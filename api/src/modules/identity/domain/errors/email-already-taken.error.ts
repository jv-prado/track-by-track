import { ConflictError } from '../../../../shared/kernel/errors/conflict.error';

export class EmailAlreadyTakenError extends ConflictError {
  readonly code = 'USER_EMAIL_ALREADY_TAKEN';

  constructor(email: string) {
    super(`O e-mail "${email}" já está em uso.`);
  }
}
