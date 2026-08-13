import request from 'supertest';
import {
  EMAIL_SENDER,
  type EmailSender,
} from '../src/modules/identity/application/ports/email-sender.port';
import { createTestApp, type TestApp, httpServer } from './test-app';

class CapturingEmailSender implements EmailSender {
  public sentResetUrls: string[] = [];

  sendPasswordResetEmail(_to: string, resetUrl: string): Promise<void> {
    this.sentResetUrls.push(resetUrl);
    return Promise.resolve();
  }
}

function extractToken(resetUrl: string): string {
  return new URL(resetUrl).searchParams.get('token')!;
}

describe('Auth (e2e)', () => {
  let testApp: TestApp;
  let emailSender: CapturingEmailSender;

  beforeAll(async () => {
    emailSender = new CapturingEmailSender();
    testApp = await createTestApp((builder) => {
      builder.overrideProvider(EMAIL_SENDER).useValue(emailSender);
    });
  });

  afterAll(async () => {
    await testApp.close();
  });

  const server = () => httpServer(testApp);

  it('rejeita registro com senha curta', async () => {
    // 422 é o contrato: violação de validação, com `details` por campo (CLAUDE.md §3).
    // O DomainExceptionFilter traduz ZodError para 422 — 400 fica para body malformado.
    await request(server())
      .post('/v1/auth/register')
      .send({ email: 'curto@e2e.app', password: '123', displayName: 'Curto' })
      .expect(422);
  });

  it('registra, loga, acessa /me, dá refresh e faz logout', async () => {
    const email = 'fluxo@e2e.app';
    const password = 'senha12345';

    const registerRes = await request(server())
      .post('/v1/auth/register')
      .send({ email, password, displayName: 'Fluxo Completo' })
      .expect(201);
    expect(registerRes.body).toMatchObject({
      email,
      displayName: 'Fluxo Completo',
    });
    expect(registerRes.body.passwordHash).toBeUndefined();

    await request(server())
      .post('/v1/auth/register')
      .send({ email, password, displayName: 'Duplicado' })
      .expect(409);

    const loginRes = await request(server())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const accessToken = loginRes.body.accessToken as string;
    const refreshCookie = loginRes.headers['set-cookie']![0] as string;
    expect(accessToken).toEqual(expect.any(String));
    expect(refreshCookie).toContain('refreshToken=');

    await request(server())
      .post('/v1/auth/login')
      .send({ email, password: 'senhaerrada' })
      .expect(401);

    const meRes = await request(server())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meRes.body.email).toBe(email);

    await request(server()).get('/v1/auth/me').expect(401);

    const refreshRes = await request(server())
      .post('/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);
    const newAccessToken = refreshRes.body.accessToken as string;
    expect(newAccessToken).toEqual(expect.any(String));
    const rotatedCookie = refreshRes.headers['set-cookie']![0] as string;

    // reuso do refresh token antigo (já rotacionado) revoga a família inteira
    await request(server())
      .post('/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
    await request(server())
      .post('/v1/auth/refresh')
      .set('Cookie', rotatedCookie)
      .expect(401);

    const loginRes2 = await request(server())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const cookie2 = loginRes2.headers['set-cookie']![0] as string;
    await request(server())
      .post('/v1/auth/logout')
      .set('Cookie', cookie2)
      .expect(200);
    await request(server())
      .post('/v1/auth/refresh')
      .set('Cookie', cookie2)
      .expect(401);
  });

  it('atualiza displayName via PATCH /auth/me', async () => {
    const email = 'perfil@e2e.app';
    const password = 'senha12345';
    await request(server())
      .post('/v1/auth/register')
      .send({ email, password, displayName: 'Nome Original' })
      .expect(201);
    const { body } = await request(server())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const updateRes = await request(server())
      .patch('/v1/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .send({ displayName: 'Nome Novo' })
      .expect(200);
    expect(updateRes.body.displayName).toBe('Nome Novo');
  });

  it('reset de senha: solicitar (mensagem genérica) + confirmar com token real', async () => {
    const email = 'reset@e2e.app';
    const oldPassword = 'senha12345';
    const newPassword = 'novaSenha999';
    await request(server())
      .post('/v1/auth/register')
      .send({ email, password: oldPassword, displayName: 'Reset User' })
      .expect(201);

    const resNonExisting = await request(server())
      .post('/v1/auth/password-reset/request')
      .send({ email: 'nao-existe@e2e.app' })
      .expect(200);
    const resExisting = await request(server())
      .post('/v1/auth/password-reset/request')
      .send({ email })
      .expect(200);
    // mesma mensagem genérica nos dois casos — nunca revela se o e-mail existe
    expect(resNonExisting.body.message).toBe(resExisting.body.message);

    const rawToken = extractToken(emailSender.sentResetUrls.at(-1)!);
    await request(server())
      .post('/v1/auth/password-reset/confirm')
      .send({ token: 'token-invalido', newPassword })
      .expect(422);
    await request(server())
      .post('/v1/auth/password-reset/confirm')
      .send({ token: rawToken, newPassword })
      .expect(200);

    await request(server())
      .post('/v1/auth/login')
      .send({ email, password: oldPassword })
      .expect(401);
    await request(server())
      .post('/v1/auth/login')
      .send({ email, password: newPassword })
      .expect(200);

    // token de reset é de uso único
    await request(server())
      .post('/v1/auth/password-reset/confirm')
      .send({ token: rawToken, newPassword: 'outraSenha000' })
      .expect(422);
  });

  it('exclui a conta (senha errada -> 401; senha certa -> apaga e revoga sessão)', async () => {
    const email = 'exclusao@e2e.app';
    const password = 'senha12345';
    await request(server())
      .post('/v1/auth/register')
      .send({ email, password, displayName: 'Vai Sair' })
      .expect(201);
    const { body, headers } = await request(server())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const cookie = headers['set-cookie']![0] as string;

    await request(server())
      .delete('/v1/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .send({ password: 'senhaerrada' })
      .expect(401);

    await request(server())
      .delete('/v1/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .send({ password })
      .expect(204);

    await request(server())
      .post('/v1/auth/refresh')
      .set('Cookie', cookie)
      .expect(401);
    await request(server())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(401);
  });
});
