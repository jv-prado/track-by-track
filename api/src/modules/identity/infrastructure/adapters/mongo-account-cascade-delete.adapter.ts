import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AccountCascadeDelete } from '../../application/ports/account-cascade-delete.port';

@Injectable()
export class MongoAccountCascadeDeleteAdapter implements AccountCascadeDelete {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async deleteAllForUser(userId: string): Promise<void> {
    await Promise.all([
      this.connection.collection('rankings').deleteMany({ userId }),
      this.connection.collection('comments').deleteMany({ authorId: userId }),
    ]);
  }
}
