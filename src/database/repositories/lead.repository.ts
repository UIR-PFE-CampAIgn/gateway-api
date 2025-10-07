import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Lead } from '../schemas/lead.schema';

@Injectable()
export class LeadsRepository extends BaseRepository<Lead> {
  constructor(@InjectModel('Lead') model: Model<Lead>) {
    super(model);
  }

  findByProviderId(
    provider: string,
    providerUserId: string,
    session?: ClientSession,
  ) {
    return this.findOne(
      { provider, provider_user_id: providerUserId },
      session,
    );
  }

  // ✅ Add this method
  async findAll(session?: ClientSession): Promise<Lead[]> {
    return this.model.find({}, null, { session }).exec();
  }

  // ✅ Add search method
  async search(
    filters: {
      search?: string;
      provider?: string;
    },
    limit: number = 100,
    session?: ClientSession,
  ): Promise<Lead[]> {
    const query: any = {};

    if (filters.provider) {
      query.provider = filters.provider;
    }

    if (filters.search) {
      query.$or = [
        { display_name: { $regex: filters.search, $options: 'i' } },
        { provider_user_id: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return this.model
      .find(query, null, { session })
      .limit(limit)
      .sort({ created_at: -1 })
      .exec();
  }
}
