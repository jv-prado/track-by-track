import { ValueObject } from '../../../../shared/kernel/value-object';
import { InvalidEmailError } from '../errors/invalid-email.error';

interface EmailProps {
  value: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(rawEmail: string): Email {
    const normalized = rawEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      throw new InvalidEmailError(rawEmail);
    }
    return new Email({ value: normalized });
  }
}
