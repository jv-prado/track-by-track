import { Hasher } from '../../ports/hasher.port';

/** Fake determinístico — nunca use em produção, só em teste. */
export class FakeHasher implements Hasher {
  hash(plainText: string): Promise<string> {
    return Promise.resolve(`hashed:${plainText}`);
  }

  verify(plainText: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plainText}`);
  }
}
