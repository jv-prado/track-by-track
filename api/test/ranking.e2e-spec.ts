import { randomUUID } from 'node:crypto';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  AlbumSchemaClass,
  AlbumDocument,
} from '../src/modules/album-catalog/album.schema';
import { createTestApp, type TestApp, httpServer } from './test-app';

const ALBUM_ID = 'e2e-album-1';
const TRACKS = [
  { spotifyId: 'e2e-t1', name: 'Faixa 1', durationMs: 180_000, trackNumber: 1 },
  { spotifyId: 'e2e-t2', name: 'Faixa 2', durationMs: 200_000, trackNumber: 2 },
];

async function registerAndLogin(
  server: App,
  email: string,
  displayName: string,
): Promise<{ accessToken: string; userId: string }> {
  const registerRes = await request(server)
    .post('/v1/auth/register')
    .send({ email, password: 'senha12345', displayName })
    .expect(201);
  const loginRes = await request(server)
    .post('/v1/auth/login')
    .send({ email, password: 'senha12345' })
    .expect(200);
  return {
    accessToken: loginRes.body.accessToken as string,
    userId: registerRes.body.id as string,
  };
}

describe('Ranking (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
    const albumModel = testApp.app.get<Model<AlbumDocument>>(
      getModelToken(AlbumSchemaClass.name),
    );
    await albumModel.create({
      _id: randomUUID(),
      spotifyId: ALBUM_ID,
      name: 'Álbum E2E',
      artist: 'Banda E2E',
      tracks: TRACKS,
      cachedAt: new Date(),
    });
  });

  afterAll(async () => {
    await testApp.close();
  });

  const server = () => httpServer(testApp);

  it('cria (idempotente), avalia faixas, salva review, reseta e remove', async () => {
    const { accessToken, userId } = await registerAndLogin(
      server(),
      'ranker@e2e.app',
      'Ranker',
    );
    const auth = (req: request.Test) =>
      req.set('Authorization', `Bearer ${accessToken}`);

    const createRes = await auth(
      request(server()).post('/v1/rankings').send({ albumId: ALBUM_ID }),
    ).expect(201);
    const rankingId = createRes.body.id as string;
    expect(createRes.body.averageScore).toBe(0);
    expect(createRes.body.progress).toEqual({
      rated: 0,
      total: 2,
      ignored: 0,
      percentage: 0,
    });

    // idempotente: repetir não cria outro (invariante do índice único userId+albumId)
    const createAgainRes = await auth(
      request(server()).post('/v1/rankings').send({ albumId: ALBUM_ID }),
    ).expect(200);
    expect(createAgainRes.body.id).toBe(rankingId);

    const rateRes = await auth(
      request(server())
        .patch(`/v1/rankings/${rankingId}/tracks/e2e-t1`)
        .send({ score: 5 }),
    ).expect(200);
    expect(rateRes.body.entries).toContainEqual(
      expect.objectContaining({ trackId: 'e2e-t1', score: 5 }),
    );

    await auth(
      request(server())
        .patch(`/v1/rankings/${rankingId}/tracks/e2e-t2`)
        .send({ score: 3 }),
    ).expect(200);

    // score fora do range 0-5 é rejeitado (validação = 422, seção 3 do CLAUDE.md)
    await auth(
      request(server())
        .patch(`/v1/rankings/${rankingId}/tracks/e2e-t1`)
        .send({ score: 9 }),
    ).expect(422);

    // faixa que não pertence ao álbum é rejeitada
    await auth(
      request(server())
        .patch(`/v1/rankings/${rankingId}/tracks/faixa-alienigena`)
        .send({ score: 1 }),
    ).expect(422);

    // ignorar faixa: some do progresso/média, e não pode mais ser avaliada
    const ignoreRes = await auth(
      request(server())
        .patch(`/v1/rankings/${rankingId}/tracks/e2e-t2/ignore`)
        .send({ ignored: true }),
    ).expect(200);
    expect(ignoreRes.body.progress).toEqual({
      rated: 1,
      total: 1,
      ignored: 1,
      percentage: 100,
    });
    expect(ignoreRes.body.averageScore).toBe(10); // só e2e-t1 (score 5) conta

    await auth(
      request(server())
        .patch(`/v1/rankings/${rankingId}/tracks/e2e-t2`)
        .send({ score: 1 }),
    ).expect(422);

    // desfazer o ignore volta a faixa pro progresso, zerada
    const unignoreRes = await auth(
      request(server())
        .patch(`/v1/rankings/${rankingId}/tracks/e2e-t2/ignore`)
        .send({ ignored: false }),
    ).expect(200);
    expect(unignoreRes.body.progress).toEqual({
      rated: 1,
      total: 2,
      ignored: 0,
      percentage: 50,
    });

    await auth(
      request(server())
        .patch(`/v1/rankings/${rankingId}/tracks/e2e-t2`)
        .send({ score: 3 }),
    ).expect(200);

    const reviewRes = await auth(
      request(server()).patch(`/v1/rankings/${rankingId}/review`).send({
        text: 'Muito bom.',
        favoriteTrackId: 'e2e-t1',
        worstTrackId: 'e2e-t2',
      }),
    ).expect(200);
    expect(reviewRes.body.review.text).toBe('Muito bom.');
    expect(reviewRes.body.progress.percentage).toBe(100);
    expect(reviewRes.body.averageScore).toBeGreaterThan(0);

    const getPublicRes = await request(server())
      .get(`/v1/rankings/users/${userId}/albums/${ALBUM_ID}`)
      .expect(200);
    expect(getPublicRes.body.id).toBe(rankingId);

    // outro usuário não pode avaliar/resetar/remover o ranking de quem não é dono
    const other = await registerAndLogin(
      server(),
      'intruso@e2e.app',
      'Intruso',
    );
    await request(server())
      .patch(`/v1/rankings/${rankingId}/tracks/e2e-t1`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ score: 1 })
      .expect(403);
    await request(server())
      .post(`/v1/rankings/${rankingId}/reset`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(403);
    await request(server())
      .delete(`/v1/rankings/${rankingId}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(403);

    const resetRes = await auth(
      request(server()).post(`/v1/rankings/${rankingId}/reset`),
    ).expect(200);
    expect(
      resetRes.body.entries.every((e: { score: number }) => e.score === 0),
    ).toBe(true);
    expect(resetRes.body.review.text).toBe('Muito bom.'); // reset zera nota, mantém review

    await auth(request(server()).delete(`/v1/rankings/${rankingId}`)).expect(
      204,
    );
    await request(server())
      .get(`/v1/rankings/users/${userId}/albums/${ALBUM_ID}`)
      .expect(404);
  });

  it('discovery: feed, top-albums, stats e reviews refletem os rankings criados', async () => {
    const userA = await registerAndLogin(
      server(),
      'discovery-a@e2e.app',
      'Discovery A',
    );
    const userB = await registerAndLogin(
      server(),
      'discovery-b@e2e.app',
      'Discovery B',
    );

    for (const user of [userA, userB]) {
      const auth = (req: request.Test) =>
        req.set('Authorization', `Bearer ${user.accessToken}`);
      const createRes = await auth(
        request(server()).post('/v1/rankings').send({ albumId: ALBUM_ID }),
      ).expect(201);
      const rankingId = createRes.body.id as string;
      // avalia as duas faixas do álbum — completedAt só é setado quando o
      // ranking inteiro tem nota, e feed/top-albums/stats/reviews só contam
      // ranking completo.
      await auth(
        request(server())
          .patch(`/v1/rankings/${rankingId}/tracks/e2e-t1`)
          .send({ score: 4 }),
      ).expect(200);
      await auth(
        request(server())
          .patch(`/v1/rankings/${rankingId}/tracks/e2e-t2`)
          .send({ score: 3 }),
      ).expect(200);
      await auth(
        request(server())
          .patch(`/v1/rankings/${rankingId}/review`)
          .send({
            text: `Review de ${user.userId}`,
            favoriteTrackId: 'e2e-t1',
          }),
      ).expect(200);
    }

    const feedRes = await request(server())
      .get('/v1/discovery/feed?page=1&perPage=10')
      .expect(200);
    expect(feedRes.body.data.length).toBeGreaterThanOrEqual(2);

    const topAlbumsRes = await request(server())
      .get('/v1/discovery/top-albums?page=1&perPage=10')
      .expect(200);
    expect(topAlbumsRes.body.data).toContainEqual(
      expect.objectContaining({ albumId: ALBUM_ID }),
    );

    const statsRes = await request(server())
      .get(`/v1/discovery/albums/${ALBUM_ID}/stats`)
      .expect(200);
    expect(statsRes.body.ratingsCount).toBeGreaterThanOrEqual(2);
    expect(statsRes.body.topFavoriteTracks[0]).toMatchObject({
      trackId: 'e2e-t1',
    });

    const reviewsRes = await request(server())
      .get(`/v1/discovery/albums/${ALBUM_ID}/reviews?page=1&perPage=10`)
      .expect(200);
    expect(reviewsRes.body.data.length).toBeGreaterThanOrEqual(2);
  });
});
