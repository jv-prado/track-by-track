export const AVATAR_UPLOADER = Symbol('AvatarUploader');

export interface AvatarUploader {
  /** Sobe o buffer da imagem, convertida pro storage, e retorna a URL pública final. */
  upload(userId: string, file: Buffer): Promise<string>;
}
