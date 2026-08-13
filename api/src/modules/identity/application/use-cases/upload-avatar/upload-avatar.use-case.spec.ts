import { FakeCacheInvalidator } from '../../../../../shared/application/ports/fake-cache-invalidator';
import { UploadAvatarUseCase } from './upload-avatar.use-case';
import { RegisterUserUseCase } from '../register-user/register-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { FakeAvatarUploader } from '../test-support/fake-avatar-uploader';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error';

describe('UploadAvatarUseCase', () => {
  it('sobe o arquivo e salva a URL retornada no usuário', async () => {
    const users = new InMemoryUserRepository();
    const avatarUploader = new FakeAvatarUploader();
    const registered = await new RegisterUserUseCase(
      users,
      new FakeHasher(),
    ).execute({
      email: 'ana@example.com',
      password: 'senha1234',
      displayName: 'Ana',
    });

    const output = await new UploadAvatarUseCase(
      users,
      avatarUploader,
      new FakeCacheInvalidator(),
    ).execute({
      userId: registered.id,
      file: Buffer.from('fake-image-bytes'),
    });

    expect(output.avatarUrl).toBe(
      `https://res.cloudinary.com/fake/${registered.id}.webp`,
    );
    expect(avatarUploader.uploadedFor).toEqual([registered.id]);
    const persisted = await users.findById(registered.id);
    expect(persisted?.avatarUrl).toBe(output.avatarUrl);
  });

  it('lança UserNotFoundError para usuário inexistente', async () => {
    const users = new InMemoryUserRepository();

    await expect(
      new UploadAvatarUseCase(
        users,
        new FakeAvatarUploader(),
        new FakeCacheInvalidator(),
      ).execute({
        userId: 'id-que-nao-existe',
        file: Buffer.from('fake-image-bytes'),
      }),
    ).rejects.toThrow(UserNotFoundError);
  });
});
