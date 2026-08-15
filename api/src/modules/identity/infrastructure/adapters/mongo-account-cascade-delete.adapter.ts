import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { AccountCascadeDelete } from '../../application/ports/account-cascade-delete.port';

@Injectable()
export class MongoAccountCascadeDeleteAdapter implements AccountCascadeDelete {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async deleteAllForUser(userId: string): Promise<void> {
    // Driver cru: sem o cast do Mongoose, `userId` (string) não bate contra o
    // `userId`/`authorId` ObjectId gravado no banco.
    const objectId = new Types.ObjectId(userId);
    await Promise.all([
      this.connection.collection('rankings').deleteMany({ userId: objectId }),
      this.connection.collection('comments').deleteMany({ authorId: objectId }),
    ]);
  }
}
