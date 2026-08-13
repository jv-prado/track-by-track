import { randomUUID } from 'node:crypto';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import {
  AlbumSchemaClass,
  AlbumDocument,
} from '../src/modules/album-catalog/album.schema';
import { createTestApp, type TestApp, httpServer } from './test-app';

const ALBUM_ID = 'e2e-comments-album';

describe('Comments (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
    const albumModel = testApp.app.get<Model<AlbumDocument>>(
      getModelToken(AlbumSchemaClass.name),
    );
    await albumModel.create({
      _id: randomUUID(),
      spotifyId: ALBUM_ID,
      name: 'Álbum de Comentários',
      artist: 'Banda E2E',
      tracks: [
        {
          spotifyId: 't1',
          name: 'Faixa 1',
          durationMs: 100_000,
          trackNumber: 1,
        },
      ],
      cachedAt: new Date(),
    });
  });

  afterAll(async () => {
    await testApp.close();
  });

  const server = () => httpServer(testApp);

  async function registerAndLogin(email: string, displayName: string) {
    await request(server())
      .post('/v1/auth/register')
      .send({ email, password: 'senha12345', displayName })
      .expect(201);
    const loginRes = await request(server())
      .post('/v1/auth/login')
      .send({ email, password: 'senha12345' })
      .expect(200);
    return loginRes.body.accessToken as string;
  }

  it('cria, lista, edita (dono) e recusa edição/remoção de quem não é dono', async () => {
    const ownerToken = await registerAndLogin(
      'comment-owner@e2e.app',
      'Dono da Review',
    );
    const otherToken = await registerAndLogin(
      'comment-other@e2e.app',
      'Outro Usuário',
    );

    const rankingRes = await request(server())
      .post('/v1/rankings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ albumId: ALBUM_ID })
      .expect(201);
    const rankingId = rankingRes.body.id as string;

    const createRes = await request(server())
      .post(`/v1/rankings/${rankingId}/comments`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ text: 'Primeiro comentário' })
      .expect(201);
    expect(createRes.body).toMatchObject({
      rankingId,
      authorDisplayName: 'Outro Usuário',
      text: 'Primeiro comentário',
      editedAt: null,
    });
    const commentId = createRes.body.id as string;

    await request(server())
      .post(`/v1/rankings/${rankingId}/comments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ text: 'Resposta do dono' })
      .expect(201);

    const listRes = await request(server())
      .get(`/v1/rankings/${rankingId}/comments?page=1&perPage=10`)
      .expect(200);
    expect(listRes.body.data).toHaveLength(2);
    expect(listRes.body.data[0].text).toBe('Resposta do dono'); // mais recente primeiro

    // não-dono não pode editar nem remover o comentário de outra pessoa
    await request(server())
      .patch(`/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ text: 'tentando editar' })
      .expect(403);
    await request(server())
      .delete(`/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);

    const editRes = await request(server())
      .patch(`/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ text: 'Comentário editado' })
      .expect(200);
    expect(editRes.body.text).toBe('Comentário editado');
    expect(editRes.body.editedAt).not.toBeNull();

    await request(server())
      .delete(`/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(204);

    const listAfterDeleteRes = await request(server())
      .get(`/v1/rankings/${rankingId}/comments?page=1&perPage=10`)
      .expect(200);
    expect(listAfterDeleteRes.body.data).toHaveLength(1);
  });

  it('comentário exige autenticação; listagem é pública', async () => {
    const token = await registerAndLogin(
      'comment-auth@e2e.app',
      'Precisa Logar',
    );
    const rankingRes = await request(server())
      .post('/v1/rankings')
      .set('Authorization', `Bearer ${token}`)
      .send({ albumId: ALBUM_ID })
      .expect(201);
    const rankingId = rankingRes.body.id as string;

    await request(server())
      .post(`/v1/rankings/${rankingId}/comments`)
      .send({ text: 'sem token' })
      .expect(401);

    await request(server())
      .get(`/v1/rankings/${rankingId}/comments?page=1&perPage=10`)
      .expect(200);
  });
});
