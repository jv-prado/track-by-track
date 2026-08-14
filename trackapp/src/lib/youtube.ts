// Porta 1:1 de src/shared/lib/youtube.ts (web).
export function buildYoutubeMusicSearchUrl(artist: string, albumName: string): string {
  const query = encodeURIComponent(`${artist} ${albumName}`);
  return `https://music.youtube.com/search?q=${query}`;
}
