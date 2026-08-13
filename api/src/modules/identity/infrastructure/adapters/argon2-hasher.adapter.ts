import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { Hasher } from '../../application/ports/hasher.port';

@Injectable()
export class Argon2HasherAdapter implements Hasher {
  async hash(plainText: string): Promise<string> {
    return hash(plainText);
  }

  async verify(plainText: string, passwordHash: string): Promise<boolean> {
    return verify(passwordHash, plainText);
  }
}
