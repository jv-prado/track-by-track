import { Model } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationSchemaClass } from './notification.schema';
import { NotificationNotFoundError } from './errors/notification-not-found.error';
import type {
  PublicUserProfile,
  UserDirectoryService,
} from '../identity/application/services/user-directory.service';

/**
 * Dublê totalmente desacoplado do schema real (injetado via `as unknown as
 * Model<NotificationSchemaClass>`) — mantém tudo em string porque é isso que
 * `NotificationsService` de fato manipula; o schema real grava `ObjectId`
 * nativo (ver seção 4.6 do CLAUDE.md), cast do driver Mongo irrelevante aqui.
 */
interface NotificationRecord {
  _id: string;
  userId: string;
  type: string;
  actorId: string;
  actorDisplayName: string;
  actorAvatarUrl?: string;
  rankingId?: string;
  albumId?: string;
  readAt: Date | null;
  createdAt: Date;
}

class InMemoryNotificationModel {
  readonly docs: NotificationRecord[] = [];
  /** Liga a falha de escrita pra provar que notificar não derruba a ação. */
  failOnCreate = false;

  create(doc: NotificationRecord) {
    if (this.failOnCreate) return Promise.reject(new Error('mongo caiu'));
    this.docs.push(doc);
    return Promise.resolve(doc);
  }

  find(filter: Partial<NotificationRecord>) {
    const results = this.match(filter);
    const chain = {
      sort: () => chain,
      skip: () => chain,
      limit: () => chain,
      lean: () => ({ exec: () => Promise.resolve(results) }),
    };
    return chain;
  }

  countDocuments(filter: Partial<NotificationRecord>) {
    return { exec: () => Promise.resolve(this.match(filter).length) };
  }

  updateOne(
    filter: { _id: string; userId: string },
    update: { $set: { readAt: Date } },
  ) {
    const doc = this.docs.find(
      (d) => d._id === filter._id && d.userId === filter.userId,
    );
    if (doc) doc.readAt = update.$set.readAt;
    return { exec: () => Promise.resolve({ matchedCount: doc ? 1 : 0 }) };
  }

  updateMany(
    filter: { userId: string; readAt: null },
    update: { $set: { readAt: Date } },
  ) {
    for (const doc of this.match(filter)) doc.readAt = update.$set.readAt;
    return { exec: () => Promise.resolve({ matchedCount: 0 }) };
  }

  private match(filter: Partial<NotificationRecord>): NotificationRecord[] {
    return this.docs.filter((doc) =>
      Object.entries(filter).every(
        ([key, value]) => doc[key as keyof NotificationRecord] === value,
      ),
    );
  }
}

class FakeUserDirectory {
  getPublicProfile(userId: string): Promise<PublicUserProfile | null> {
    return Promise.resolve({
      id: userId,
      displayName: userId.toUpperCase(),
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  }
}

function setup() {
  const model = new InMemoryNotificationModel();
  const service = new NotificationsService(
    model as unknown as Model<NotificationSchemaClass>,
    new FakeUserDirectory() as unknown as UserDirectoryService,
  );
  return { service, model };
}

describe('NotificationsService', () => {
  it('comentário de terceiro notifica o dono do ranking', async () => {
    const { service, model } = setup();

    await service.commentOnRanking({
      rankingOwnerId: 'ana',
      actorId: 'bruno',
      rankingId: 'r1',
      albumId: 'a1',
    });

    expect(model.docs).toHaveLength(1);
    expect(model.docs[0]).toMatchObject({
      userId: 'ana',
      type: 'comment',
      actorId: 'bruno',
      actorDisplayName: 'BRUNO',
      rankingId: 'r1',
      readAt: null,
    });
  });

  it('comentário na própria review não gera notificação', async () => {
    const { service, model } = setup();

    await service.commentOnRanking({
      rankingOwnerId: 'ana',
      actorId: 'ana',
      rankingId: 'r1',
      albumId: 'a1',
    });

    expect(model.docs).toHaveLength(0);
  });

  it('falha ao gravar não derruba quem emitiu', async () => {
    const { service, model } = setup();
    model.failOnCreate = true;

    // Contrato do port: comentar precisa funcionar mesmo com a coleção quebrada.
    await expect(
      service.newFollower({ followeeId: 'ana', actorId: 'bruno' }),
    ).resolves.toBeUndefined();
  });

  it('lista e conta só o que é do destinatário', async () => {
    const { service } = setup();
    await service.newFollower({ followeeId: 'ana', actorId: 'bruno' });
    await service.newFollower({ followeeId: 'carla', actorId: 'bruno' });

    const page = await service.list('ana', 1, 20);

    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.type).toBe('follow');
    await expect(service.unreadCount('ana')).resolves.toBe(1);
    await expect(service.unreadCount('carla')).resolves.toBe(1);
  });

  it('não deixa marcar como lida notificação de outro usuário', async () => {
    const { service, model } = setup();
    await service.newFollower({ followeeId: 'ana', actorId: 'bruno' });
    const id = model.docs[0]!._id;

    await expect(service.markRead(id, 'carla')).rejects.toThrow(
      NotificationNotFoundError,
    );
    expect(model.docs[0]?.readAt).toBeNull();

    await service.markRead(id, 'ana');
    expect(model.docs[0]?.readAt).not.toBeNull();
  });

  it('markAllRead zera o contador do dono', async () => {
    const { service } = setup();
    await service.newFollower({ followeeId: 'ana', actorId: 'bruno' });
    await service.newFollower({ followeeId: 'ana', actorId: 'carla' });

    await service.markAllRead('ana');

    await expect(service.unreadCount('ana')).resolves.toBe(0);
  });
});
