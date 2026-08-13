export const ACCOUNT_CASCADE_DELETE = Symbol('AccountCascadeDelete');

/**
 * Apaga dados de outros contextos que pertencem a este usuário (rankings,
 * comentários). Acesso direto às coleções (mesmo padrão do DiscoveryService)
 * pra não criar dependência de módulo Identity -> Ranking/Comments.
 */
export interface AccountCascadeDelete {
  deleteAllForUser(userId: string): Promise<void>;
}
