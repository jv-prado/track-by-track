export interface FeedCursor {
  /** Valor do campo de ordenação do feed (hoje `updatedAt` — ver FEED_SORT). */
  sortAt: Date;
  id: string;
}

/**
 * Cursor opaco: `base64url({sortAt ISO}|{id})`. Opaco de propósito — o cliente
 * devolve o que recebeu e não depende do formato, então trocar o critério de
 * ordenação depois não quebra ninguém (foi trocado de `createdAt` pra
 * `updatedAt` sem precisar versionar o endpoint).
 */
export function encodeFeedCursor(cursor: FeedCursor): string {
  return Buffer.from(
    `${cursor.sortAt.toISOString()}|${cursor.id}`,
    'utf8',
  ).toString('base64url');
}

/** Cursor inválido/adulterado devolve null — a chamada trata como primeira página. */
export function decodeFeedCursor(raw: string): FeedCursor | null {
  const decoded = Buffer.from(raw, 'base64url').toString('utf8');
  const separator = decoded.indexOf('|');
  if (separator <= 0) return null;

  const sortAt = new Date(decoded.slice(0, separator));
  const id = decoded.slice(separator + 1);
  if (Number.isNaN(sortAt.getTime()) || id.length === 0) return null;

  return { sortAt, id };
}
