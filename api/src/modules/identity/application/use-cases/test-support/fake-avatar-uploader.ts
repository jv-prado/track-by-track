import type { AvatarUploader } from '../../ports/avatar-uploader.port';

export class FakeAvatarUploader implements AvatarUploader {
  uploadedFor: string[] = [];

  upload(userId: string): Promise<string> {
    this.uploadedFor.push(userId);
    return Promise.resolve(`https://res.cloudinary.com/fake/${userId}.webp`);
  }
}
