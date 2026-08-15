export interface UploadAvatarInput {
  userId: string;
  file: Buffer;
}

export interface UploadAvatarOutput {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
}
