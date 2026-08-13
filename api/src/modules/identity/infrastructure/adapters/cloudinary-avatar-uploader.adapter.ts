import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type { AvatarUploader } from '../../application/ports/avatar-uploader.port';

export interface CloudinaryCredentialsConfig {
  get(
    key:
      'CLOUDINARY_CLOUD_NAME' | 'CLOUDINARY_API_KEY' | 'CLOUDINARY_API_SECRET',
  ): string;
}

/** Um asset por usuário — reenviar sobrescreve o anterior, sem lixo acumulando na conta. */
const AVATAR_FOLDER = 'trackbytrack/avatars';

@Injectable()
export class CloudinaryAvatarUploaderAdapter implements AvatarUploader {
  private configured = false;

  constructor(
    @Inject(ConfigService)
    private readonly config: CloudinaryCredentialsConfig,
  ) {}

  async upload(userId: string, file: Buffer): Promise<string> {
    this.ensureConfigured();

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: AVATAR_FOLDER,
          public_id: userId,
          overwrite: true,
          format: 'webp',
          // recorte quadrado focado em rosto + qualidade automática, sempre webp na saída.
          transformation: [
            { width: 512, height: 512, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'webp' },
          ],
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(
              new Error(
                error?.message ?? 'Falha ao enviar avatar pro Cloudinary.',
              ),
            );
            return;
          }
          resolve(uploadResult);
        },
      );
      Readable.from(file).pipe(uploadStream);
    });

    return result.secure_url;
  }

  private ensureConfigured(): void {
    if (this.configured) return;
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
    this.configured = true;
  }
}
