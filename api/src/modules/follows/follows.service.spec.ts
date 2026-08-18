import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { FollowsService } from './follows.service';
import { FollowSchemaClass } from './follow.schema';
import { CannotFollowSelfError } from './errors/cannot-follow-self.error';
import { UserToFollowNotFoundError } from './errors/user-to-follow-not-found.error';
import type {
  PublicUserProfile,
  UserDirectoryService,
} from '../identity/application/services/user-directory.service';
import { FakeNotificationSender } from '../../shared/application/ports/fake-notification-sender';

/**
 * Reproduz o índice único `(followerId, followeeId)` do schema — sem isso o
 * teste de "seguir duas vezes" passaria aqui e criaria duplicata em produção.
 *
 * Dublê totalmente desacoplado do schema real (injetado via `as unknown as
 * Model<FollowSchemaClass>`) — mantém tudo em string porque é isso que
 * `FollowsService` de fato manipula; o schema real grava `ObjectId` nativo
 * (ver seção 4.6 do CLAUDE.md), mas essa conversão é cast do driver Mongo,
 * irrelevante pra este teste unitário.
 */
interface FollowRecord {
  _id: string;
  followerId: string;
  followeeId: string;
  createdAt: Date;
}

class InMemoryFollowModel {
  readonly docs: FollowRecord[] = [];

  updateOne(filter: { followerId: string; followeeId: string }) {
    const exists = this.docs.some(
      (doc) =>
        doc.followerId === filter.followerId &&
        doc.followeeId === filter.followeeId,
    );
    if (!exists) {
      this.docs.push({
        _id: randomUUID(),
        followerId: filter.followerId,
        followeeId: filter.followeeId,
        createdAt: new Date(),
      });
    }
    return { exec: () => Promise.resolve({ upsertedCount: exists ? 0 : 1 }) };
  }

  deleteOne(filter: { followerId: string; followeeId: string }) {
    const index = this.docs.findIndex(
      (doc) =>
        doc.followerId === filter.followerId &&
        doc.followeeId === filter.followeeId,
    );
    if (index >= 0) this.docs.splice(index, 1);
    return { exec: () => Promise.resolve() };
  }

  countDocuments(filter: Partial<FollowRecord>) {
    return { exec: () => Promise.resolve(this.match(filter).length) };
  }

  exists(filter: Partial<FollowRecord>) {
    const found = this.match(filter)[0];
    return Promise.resolve(found ? { _id: found._id } : null);
  }

  find(filter: Partial<FollowRecord>) {
    const results = this.match(filter);
    const chain = {
      sort: () => chain,
      skip: () => chain,
      limit: () => chain,
      lean: () => ({ exec: () => Promise.resolve(results) }),
      exec: () => Promise.resolve(results),
    };
    return chain;
  }

  private match(filter: Partial<FollowRecord>): FollowRecord[] {
    return this.docs.filter((doc) =>
      Object.entries(filter).every(
        ([key, value]) => doc[key as keyof FollowRecord] === value,
      ),
    );
  }
}

class FakeUserDirectory {
  known = new Set<string>(['ana', 'bruno', 'carla']);

  getPublicProfile(userId: string): Promise<PublicUserProfile | null> {
    if (!this.known.has(userId)) return Promise.resolve(null);
    return Promise.resolve({
      id: userId,
      displayName: userId.toUpperCase(),
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  }
}

function setup() {
  const model = new InMemoryFollowModel();
  const directory = new FakeUserDirectory();
  const notifications = new FakeNotificationSender();
  const service = new FollowsService(
    model as unknown as Model<FollowSchemaClass>,
    directory as unknown as UserDirectoryService,
    notifications,
  );
  return { service, model, directory, notifications };
}

describe('FollowsService', () => {
  it('seguir cria o vínculo e conta dos dois lados', async () => {
    const { service } = setup();

    const created = await service.follow('ana', 'bruno');

    expect(created).toBe(true);
    await expect(service.stats('bruno', 'ana')).resolves.toEqual({
      followers: 1,
      following: 0,
      isFollowing: true,
    });
    await expect(service.stats('ana')).resolves.toEqual({
      followers: 0,
      following: 1,
      isFollowing: false,
    });
  });

  it('seguir duas vezes não duplica nem notifica de novo', async () => {
    const { service, model, notifications } = setup();

    await service.follow('ana', 'bruno');
    const second = await service.follow('ana', 'bruno');

    expect(second).toBe(false);
    expect(model.docs).toHaveLength(1);
    // Duplo clique no botão "seguir" não pode virar duas notificações.
    expect(notifications.followers).toEqual([
      { followeeId: 'bruno', actorId: 'ana' },
    ]);
  });

  it('não deixa seguir a si mesmo', async () => {
    const { service } = setup();

    await expect(service.follow('ana', 'ana')).rejects.toThrow(
      CannotFollowSelfError,
    );
  });

  it('seguir usuário inexistente é 404', async () => {
    const { service } = setup();

    await expect(service.follow('ana', 'fantasma')).rejects.toThrow(
      UserToFollowNotFoundError,
    );
  });

  it('deixar de seguir quem não se segue não é erro', async () => {
    const { service, model } = setup();

    await expect(service.unfollow('ana', 'bruno')).resolves.toBeUndefined();
    expect(model.docs).toHaveLength(0);
  });

  it('followeeIds devolve exatamente quem o usuário segue', async () => {
    const { service } = setup();
    await service.follow('ana', 'bruno');
    await service.follow('ana', 'carla');
    await service.follow('bruno', 'carla');

    await expect(service.followeeIds('ana')).resolves.toEqual([
      'bruno',
      'carla',
    ]);
  });

  it('listagem omite usuário que deixou de existir', async () => {
    const { service, directory } = setup();
    await service.follow('ana', 'bruno');
    directory.known.delete('bruno');

    const page = await service.listFollowing('ana', 1, 20);

    expect(page.data).toEqual([]);
    // O total vem da coleção de follows, não dos perfis resolvidos.
    expect(page.meta.total).toBe(1);
  });
});
