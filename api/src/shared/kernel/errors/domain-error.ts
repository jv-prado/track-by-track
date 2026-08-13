import { HttpStatus } from '@nestjs/common';

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: HttpStatus;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
