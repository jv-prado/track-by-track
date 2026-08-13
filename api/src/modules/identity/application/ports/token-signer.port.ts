export const TOKEN_SIGNER = Symbol('TokenSigner');

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface TokenSigner {
  signAccessToken(payload: AccessTokenPayload): string;
  verifyAccessToken(token: string): AccessTokenPayload;
}
