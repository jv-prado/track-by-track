declare global {
  namespace Express {
    interface Request {
      /** Payload do access token JWT, anexado pelo JwtAuthGuard (ver identity/infrastructure/guards). */
      user?: { sub: string; email: string };
    }
  }
}

export {};
