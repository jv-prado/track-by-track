import type { NotificationSender } from './notification-sender.port';

/** Registra em vez de gravar — deixa o teste afirmar quem foi (ou não) notificado. */
export class FakeNotificationSender implements NotificationSender {
  comments: {
    rankingOwnerId: string;
    actorId: string;
    rankingId: string;
    albumId: string;
  }[] = [];
  followers: { followeeId: string; actorId: string }[] = [];

  commentOnRanking(input: {
    rankingOwnerId: string;
    actorId: string;
    rankingId: string;
    albumId: string;
  }): Promise<void> {
    this.comments.push(input);
    return Promise.resolve();
  }

  newFollower(input: { followeeId: string; actorId: string }): Promise<void> {
    this.followers.push(input);
    return Promise.resolve();
  }
}
