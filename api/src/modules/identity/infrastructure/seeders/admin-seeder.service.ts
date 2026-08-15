import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { UserSchemaClass } from '../persistence/user.schema';

/**
 * Único mecanismo de admin do produto: sem tela de gestão de papéis, o e-mail
 * abaixo é a fonte da verdade e é promovido a 'admin' toda vez que a API sobe.
 * Idempotente — rodar de novo no próximo boot não muda nada se já estiver certo.
 */
const ADMIN_EMAIL = 'jv_prado@outlook.com';

@Injectable()
export class AdminSeederService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly userModel: Model<UserSchemaClass>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Backfill: usuários criados antes do campo `role` existir não têm o
    // default do schema aplicado retroativamente pelo Mongoose.
    await this.userModel.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } },
    );

    const result = await this.userModel.updateOne(
      { email: ADMIN_EMAIL },
      { $set: { role: 'admin' } },
    );

    if (result.matchedCount > 0) {
      this.logger.log(`Papel 'admin' garantido para ${ADMIN_EMAIL}`);
    }
  }
}
