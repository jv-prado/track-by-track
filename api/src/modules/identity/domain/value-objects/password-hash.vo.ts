import { ValueObject } from '../../../../shared/kernel/value-object';

interface PasswordHashProps {
  value: string;
}

/**
 * Envelope do hash já calculado (argon2id via HasherPort, fora do domínio).
 * A regra de senha fraca (mínimo de caracteres) é validada sobre o texto puro
 * no use case, antes do hash existir — não pertence a este VO.
 */
export class PasswordHash extends ValueObject<PasswordHashProps> {
  private constructor(props: PasswordHashProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static fromHash(hash: string): PasswordHash {
    if (!hash) {
      throw new Error('PasswordHash não pode ser vazio.');
    }
    return new PasswordHash({ value: hash });
  }
}
