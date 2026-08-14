// Porta 1:1 de src/shared/lib/appleMusic.ts (web).
export function buildAppleMusicSearchUrl(artist: string, albumName: string): string {
  const term = encodeURIComponent(`${artist} ${albumName}`);
  return `https://music.apple.com/search?term=${term}`;
}
