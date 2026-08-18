import { FeedbacksService } from './feedbacks.service';
import {
  Feedback,
  FeedbackStatus,
} from '../domain/entities/feedback.aggregate';
import {
  FeedbackRepository,
  FeedbackSearchResult,
} from '../domain/repositories/feedback.repository';
import { FeedbackNotFoundError } from '../domain/errors/feedback-not-found.error';
import { FeedbackForbiddenError } from '../domain/errors/feedback-forbidden.error';
import type {
  PublicUserProfile,
  UserDirectoryService,
} from '../../identity/application/services/user-directory.service';

class InMemoryFeedbackRepository implements FeedbackRepository {
  readonly items = new Map<string, Feedback>();

  save(feedback: Feedback): Promise<void> {
    this.items.set(feedback.id.toString(), feedback);
    return Promise.resolve();
  }

  findById(id: string): Promise<Feedback | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findByUser(
    userId: string,
    limit: number,
    offset: number,
    status?: FeedbackStatus,
  ): Promise<FeedbackSearchResult> {
    const all = Array.from(this.items.values())
      .filter((f) => f.userId === userId && (!status || f.status === status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return Promise.resolve({
      items: all.slice(offset, offset + limit),
      total: all.length,
    });
  }

  findAll(
    limit: number,
    offset: number,
    status?: FeedbackStatus,
  ): Promise<FeedbackSearchResult> {
    const all = Array.from(this.items.values())
      .filter((f) => !status || f.status === status)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return Promise.resolve({
      items: all.slice(offset, offset + limit),
      total: all.length,
    });
  }

  countUnanswered(): Promise<number> {
    return Promise.resolve(
      Array.from(this.items.values()).filter((f) => f.status === 'open').length,
    );
  }
}

class FakeUserDirectory {
  private readonly roles = new Map<string, 'user' | 'admin'>([
    ['user-1', 'user'],
    ['user-2', 'user'],
    ['admin-1', 'admin'],
  ]);

  getPublicProfile(userId: string): Promise<PublicUserProfile | null> {
    return Promise.resolve({
      id: userId,
      displayName: userId.toUpperCase(),
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  }

  getUserRole(userId: string) {
    return Promise.resolve(this.roles.get(userId) ?? 'user');
  }

  isUserAdmin(userId: string): Promise<boolean> {
    return Promise.resolve(this.roles.get(userId) === 'admin');
  }
}

function setup() {
  const repo = new InMemoryFeedbackRepository();
  const userDirectory =
    new FakeUserDirectory() as unknown as UserDirectoryService;
  const service = new FeedbacksService(repo, userDirectory);
  return { service, repo };
}

describe('FeedbacksService', () => {
  it('usuário consegue criar feedback com status open', async () => {
    const { service } = setup();

    const result = await service.create(
      'user-1',
      'Problema com ranking',
      'Não salva minhas notas.',
    );

    expect(result.id).toBeDefined();
    expect(result.userId).toBe('user-1');
    expect(result.subject).toBe('Problema com ranking');
    expect(result.status).toBe('open');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.message).toBe('Não salva minhas notas.');
    expect(result.messages[0]!.isAdmin).toBe(false);
  });

  it('usuário comum lista apenas os próprios feedbacks', async () => {
    const { service } = setup();

    await service.create('user-1', 'Feedback 1', 'Msg 1');
    await service.create('user-1', 'Feedback 2', 'Msg 2');
    await service.create('user-2', 'Feedback de outro', 'Msg 3');

    const page = await service.list('user-1', 1, 10);
    expect(page.data).toHaveLength(2);
    expect(page.meta.total).toBe(2);
    expect(page.data.every((item) => item.userId === 'user-1')).toBe(true);
  });

  it('admin consegue listar feedbacks de todos os usuários', async () => {
    const { service } = setup();

    await service.create('user-1', 'Feedback 1', 'Msg 1');
    await service.create('user-2', 'Feedback 2', 'Msg 2');

    const page = await service.list('admin-1', 1, 10);
    expect(page.data).toHaveLength(2);
    expect(page.meta.total).toBe(2);
  });

  it('usuário não consegue acessar feedback de outro usuário', async () => {
    const { service } = setup();

    const created = await service.create('user-1', 'Assunto', 'Mensagem');

    await expect(service.getById(created.id, 'user-2')).rejects.toThrow(
      FeedbackForbiddenError,
    );
  });

  it('admin consegue acessar feedback de qualquer usuário', async () => {
    const { service } = setup();

    const created = await service.create('user-1', 'Assunto', 'Mensagem');

    const detail = await service.getById(created.id, 'admin-1');
    expect(detail.id).toBe(created.id);
    expect(detail.userId).toBe('user-1');
  });

  it('usuário responde o próprio feedback e status fica open', async () => {
    const { service } = setup();

    const created = await service.create(
      'user-1',
      'Assunto',
      'Mensagem inicial',
    );
    await service.addMessage(created.id, 'admin-1', 'Resposta do admin');

    const updated = await service.addMessage(
      created.id,
      'user-1',
      'Obrigado pelo retorno!',
    );

    expect(updated.status).toBe('open');
    expect(updated.messages).toHaveLength(3);
  });

  it('usuário não consegue responder feedback de outro usuário', async () => {
    const { service } = setup();

    const created = await service.create(
      'user-1',
      'Assunto',
      'Mensagem inicial',
    );

    await expect(
      service.addMessage(created.id, 'user-2', 'Tentativa indevida'),
    ).rejects.toThrow(FeedbackForbiddenError);
  });

  it('admin consegue responder qualquer feedback e status muda para answered', async () => {
    const { service } = setup();

    const created = await service.create(
      'user-1',
      'Assunto',
      'Mensagem inicial',
    );

    const updated = await service.addMessage(
      created.id,
      'admin-1',
      'Estamos analisando seu caso.',
    );

    expect(updated.status).toBe('answered');
    expect(updated.messages[1]!.isAdmin).toBe(true);
    expect(updated.messages[1]!.adminId).toBe('admin-1');
  });

  it('admin consegue alterar status manualmente', async () => {
    const { service } = setup();

    const created = await service.create('user-1', 'Assunto', 'Mensagem');

    const updated = await service.updateStatus(created.id, 'admin-1', 'closed');
    expect(updated.status).toBe('closed');
  });

  it('usuário normal é impedido de alterar status', async () => {
    const { service } = setup();

    const created = await service.create('user-1', 'Assunto', 'Mensagem');

    await expect(
      service.updateStatus(created.id, 'user-1', 'closed'),
    ).rejects.toThrow(FeedbackForbiddenError);
  });

  it('admin obtém a contagem de feedbacks que precisam de resposta', async () => {
    const { service } = setup();

    const f1 = await service.create('user-1', 'F1', 'Msg 1');
    await service.create('user-2', 'F2', 'Msg 2');

    let count = await service.getUnansweredCount('admin-1');
    expect(count.count).toBe(2);

    await service.addMessage(f1.id, 'admin-1', 'Respondendo');

    count = await service.getUnansweredCount('admin-1');
    expect(count.count).toBe(1);

    const userCount = await service.getUnansweredCount('user-1');
    expect(userCount.count).toBe(0);
  });

  it('lança erro ao buscar feedback inexistente', async () => {
    const { service } = setup();

    await expect(service.getById('non-existing-id', 'user-1')).rejects.toThrow(
      FeedbackNotFoundError,
    );
  });
});
