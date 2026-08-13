/**
 * Sem API do YouTube — link de busca no YouTube Music, sem chave, sem quota.
 * "Feature bônus": abre resultado de busca, não vídeo exato. Ver CLAUDE.md seção Album Catalog.
 */
export function buildYoutubeMusicSearchUrl(artist: string, albumName: string): string {
  const query = encodeURIComponent(`${artist} ${albumName}`);
  return `https://music.youtube.com/search?q=${query}`;
}
