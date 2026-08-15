import { randomBytes } from 'crypto';

/**
 * Gera um valor no formato de ObjectId do Mongo (24 chars hex, 12 bytes) sem
 * depender do driver do Mongo — mantém o kernel livre de infra (seção 4.2 do
 * CLAUDE.md). Qualquer hex de 24 chars é aceito pelo cast do Mongoose, não
 * precisa reproduzir timestamp/counter da estrutura real do BSON ObjectId.
 */
export function newObjectId(): string {
  return randomBytes(12).toString('hex');
}
