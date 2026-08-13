/**
 * Sem API do Apple Music — link de busca, sem chave, sem quota.
 * Country-less URL redireciona pro storefront do usuário automaticamente.
 */
export function buildAppleMusicSearchUrl(artist: string, albumName: string): string {
  const term = encodeURIComponent(`${artist} ${albumName}`);
  return `https://music.apple.com/search?term=${term}`;
}
