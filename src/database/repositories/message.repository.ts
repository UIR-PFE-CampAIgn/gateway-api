import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Message } from '../schemas/message.schema';

@Injectable()
export class MessagesRepository extends BaseRepository<Message> {
  constructor(@InjectModel('Message') model: Model<Message>) {
    super(model);
  }

  findByChat(chatId: string, limit = 50, session?: ClientSession) {
    return this.findMany(
      { chat_id: chatId },
      {
        sort: { created_at: -1 },
        limit,
        session,
      },
    );
  }
}
