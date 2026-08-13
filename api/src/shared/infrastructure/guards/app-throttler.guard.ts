import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Testes e2e criam muitos usuários/logins na mesma janela de 1min — sem esse
 * bypass, os próprios testes tomariam 429 do limite pensado pra tráfego real.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') return true;
    return super.canActivate(context);
  }
}
