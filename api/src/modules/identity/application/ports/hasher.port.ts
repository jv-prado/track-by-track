export const HASHER = Symbol('Hasher');

export interface Hasher {
  hash(plainText: string): Promise<string>;
  verify(plainText: string, hash: string): Promise<boolean>;
}
