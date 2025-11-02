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
      businessId: string; // ✅ Add businessId to filters
      search?: string;
      provider?: string;
      score?: 'hot' | 'warm' | 'cold';
    },
    limit: number = 100,
  ) {
    const query: any = {
      business_id: filters.businessId, // ✅ Filter by businessId
    };

    // Add search filter
    if (filters.search) {
      query.$or = [
        { display_name: { $regex: filters.search, $options: 'i' } },
        { provider_user_id: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Add provider filter
    if (filters.provider) {
      query.provider = filters.provider;
    }

    // Add score filter
    if (filters.score) {
      query.score = filters.score;
    }

    return await this.model
      .find(query)
      .limit(limit)
      .sort({ created_at: -1 })
      .exec();
  }

  // ✅ Add method to find leads by scores
  async findByScores(
    scores: ('hot' | 'warm' | 'cold')[],
    session?: ClientSession,
  ): Promise<Lead[]> {
    return this.model
      .find({ 
        score: { $in: scores, $exists: true } 
      }, null, { session })
      .sort({ created_at: -1 })
      .exec();
  }

  // ✅ Add method to update lead score
  async updateScore(
    leadId: string,
    score: 'hot' | 'warm' | 'cold',
    session?: ClientSession,
  ): Promise<Lead> {
    return this.updateById(leadId, { score }, session);
  }

  async count(filter: any = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
