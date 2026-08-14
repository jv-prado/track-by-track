import type { z } from 'zod';
import type {
  currentUserSchema,
  loginResponseSchema,
  registerResponseSchema,
  profileResponseSchema,
} from './modules/identity/presentation/dtos/auth.responses';
import type { rankingViewSchema } from './modules/ranking/presentation/dtos/ranking.responses';
import type {
  albumReviewItemSchema,
  albumStatsSchema,
  feedItemSchema,
  lastEditedAlbumSchema,
  topAlbumItemSchema,
  userStatsSchema,
} from './modules/discovery/dtos/discovery.responses';
import type { commentViewSchema } from './modules/comments/dtos/comment.responses';
import type {
  albumDetailSchema,
  albumSummarySchema,
} from './modules/album-catalog/dtos/album.responses';
import type { GetCurrentUserOutput } from './modules/identity/application/use-cases/get-current-user/get-current-user.input';
import type { AuthenticateUserOutput } from './modules/identity/application/use-cases/authenticate-user/authenticate-user.input';
import type { RegisterUserOutput } from './modules/identity/application/use-cases/register-user/register-user.input';
import type { UpdateProfileOutput } from './modules/identity/application/use-cases/update-profile/update-profile.input';
import type { RankingView } from './modules/ranking/application/ranking-view';
import type {
  AlbumReviewItem,
  AlbumStats,
  FeedItem,
  LastEditedAlbum,
  TopAlbumItem,
  UserStats,
} from './modules/discovery/discovery.service';
import type { CommentView } from './modules/comments/comments.service';
import type {
  AlbumDetail,
  AlbumSummary,
} from './modules/album-catalog/spotify-normalizer';

/**
 * Os schemas de resposta alimentam o OpenAPI, e o OpenAPI alimenta o
 * `schema.d.ts` do frontend (seção 2.2 do CLAUDE.md). Se um schema divergir do
 * que o serviço realmente devolve, a web passa a compilar contra um contrato
 * que não existe — e o erro só apareceria em runtime. Estas asserções são de
 * tipo: quebram no `tsc`, não em tempo de execução.
 */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : { erro: 'schema divergiu do tipo do serviço'; esperado: B; schema: A };

function assertEqual<A, B>(check: Equal<A, B>): void {
  // A verificação acontece no tipo — em runtime só confirma que o argumento
  // literal `true` chegou, o que mantém o jest com uma asserção de verdade.
  expect(check).toBe(true);
}

describe('Contratos de resposta batem com o que os serviços devolvem', () => {
  it('identity', () => {
    assertEqual<z.infer<typeof currentUserSchema>, GetCurrentUserOutput>(true);
    assertEqual<
      z.infer<typeof loginResponseSchema>,
      { accessToken: string; user: AuthenticateUserOutput['user'] }
    >(true);
    assertEqual<z.infer<typeof registerResponseSchema>, RegisterUserOutput>(
      true,
    );
    assertEqual<z.infer<typeof profileResponseSchema>, UpdateProfileOutput>(
      true,
    );
  });

  it('ranking', () => {
    assertEqual<z.infer<typeof rankingViewSchema>, RankingView>(true);
  });

  it('discovery', () => {
    assertEqual<z.infer<typeof feedItemSchema>, FeedItem>(true);
    assertEqual<z.infer<typeof userStatsSchema>, UserStats>(true);
    assertEqual<z.infer<typeof topAlbumItemSchema>, TopAlbumItem>(true);
    assertEqual<z.infer<typeof lastEditedAlbumSchema>, LastEditedAlbum>(true);
    assertEqual<z.infer<typeof albumReviewItemSchema>, AlbumReviewItem>(true);
    assertEqual<z.infer<typeof albumStatsSchema>, AlbumStats>(true);
  });

  it('comments', () => {
    assertEqual<z.infer<typeof commentViewSchema>, CommentView>(true);
  });

  it('album-catalog', () => {
    assertEqual<z.infer<typeof albumSummarySchema>, AlbumSummary>(true);
    assertEqual<z.infer<typeof albumDetailSchema>, AlbumDetail>(true);
  });
});
