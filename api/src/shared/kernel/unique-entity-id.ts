import { randomUUID } from 'crypto';

export class UniqueEntityId {
  private readonly value: string;

  constructor(value?: string) {
    this.value = value ?? randomUUID();
  }

  toString(): string {
    return this.value;
  }

  equals(other?: UniqueEntityId): boolean {
    if (!other) return false;
    return other.value === this.value;
  }
}
