import { AccessTokenPayload, TokenSigner } from '../../ports/token-signer.port';

export class FakeTokenSigner implements TokenSigner {
  signAccessToken(payload: AccessTokenPayload): string {
    return JSON.stringify(payload);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return JSON.parse(token) as AccessTokenPayload;
  }
}
