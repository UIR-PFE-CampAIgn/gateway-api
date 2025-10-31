import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { MessageTemplate } from '../schemas/message-template.schema';

@Injectable()
export class MessageTemplateRepository extends BaseRepository<MessageTemplate> {
  constructor(@InjectModel('MessageTemplate') model: Model<MessageTemplate>) {
    super(model);
  }

  async findByBusiness(
    businessId: string,
    session?: ClientSession,
  ): Promise<MessageTemplate[]> {
    return this.model
      .find({ business_id: businessId, is_active: true }, null, { session })
      .sort({ created_at: -1 })
      .exec();
  }

  async findByCategory(
    businessId: string,
    category: string,
    session?: ClientSession,
  ): Promise<MessageTemplate[]> {
    return this.model
      .find({ business_id: businessId, category, is_active: true }, null, {
        session,
      })
      .sort({ created_at: -1 })
      .exec();
  }
  async findByTemplateKey(
    businessId: string,
    templateKey: string,
    session?: ClientSession,
  ): Promise<MessageTemplate | null> {
    return this.model
      .findOne(
        { business_id: businessId, template_key: templateKey, is_active: true },
        null,
        { session },
      )
      .exec();
  }

  async searchTemplates(
    businessId: string,
    searchTerm: string,
    session?: ClientSession,
  ): Promise<MessageTemplate[]> {
    return this.model
      .find(
        {
          business_id: businessId,
          is_active: true,
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { content: { $regex: searchTerm, $options: 'i' } },
          ],
        },
        null,
        { session },
      )
      .sort({ created_at: -1 })
      .exec();
  }

  async incrementUsage(
    id: string,
    session?: ClientSession,
  ): Promise<MessageTemplate> {
    return this.updateById(
      id,
      {
        $inc: { usage_count: 1 },
        $set: { last_used_at: new Date() },
      },
      session,
    );
  }

  async softDelete(
    id: string,
    session?: ClientSession,
  ): Promise<MessageTemplate> {
    return this.updateById(id, { is_active: false }, session);
  }
}
