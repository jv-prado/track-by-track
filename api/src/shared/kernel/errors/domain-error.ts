/**
 * `httpStatus` é `number` puro de propósito: o kernel é domínio e não pode
 * depender de Nest (regra 4.3 do CLAUDE.md). Quem conhece `HttpStatus` é o
 * `DomainExceptionFilter`, na borda HTTP.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
