export const NOTIFICATION_SENDER = Symbol('NotificationSender');

/**
 * Port de notificação, no mesmo espírito do `cache-invalidator.port.ts`: um
 * método por evento de negócio, não um `send(payload)` genérico. Quem comenta
 * sabe que comentou — não sabe que existe uma coleção `notifications`.
 *
 * O adapter de hoje grava no Mongo; trocar por push depois não deve mexer em
 * nenhum emissor (mesma promessa do `EmailSenderPort`).
 *
 * Contrato de falha: **nenhum método pode derrubar a ação que o originou**.
 * Comentar precisa funcionar mesmo com a notificação quebrada — o adapter
 * engole e loga.
 */
export interface NotificationSender {
  commentOnRanking(input: {
    rankingOwnerId: string;
    actorId: string;
    rankingId: string;
    albumId: string;
  }): Promise<void>;

  newFollower(input: { followeeId: string; actorId: string }): Promise<void>;
}
