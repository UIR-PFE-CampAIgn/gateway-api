import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Chat } from '../schemas/chat.schema';

@Injectable()
export class ChatsRepository extends BaseRepository<Chat> {
  constructor(@InjectModel('Chat') model: Model<Chat>) {
    super(model);
  }

  async incrementMessageCount(
    id: string,
    isInbound: boolean,
    session?: ClientSession,
  ) {
    const update: any = { $inc: { message_count: 1 } };
    if (isInbound)
      update.$set = { ...(update.$set || {}), last_inbound_at: new Date() };
    else update.$set = { ...(update.$set || {}), last_outbound_at: new Date() };
    return this.updateById(id, update, session);
  }
  async count(filter: any = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
