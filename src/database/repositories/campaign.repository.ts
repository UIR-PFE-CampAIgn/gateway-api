import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Campaign } from '../schemas/campaign.schema';

@Injectable()
export class CampaignRepository extends BaseRepository<Campaign> {
  constructor(@InjectModel('Campaign') model: Model<Campaign>) {
    super(model);
  }

  async find(query: any) {
    return this.model.find(query).exec();
  }
  async findScheduledCampaigns() {
    const nowUTC = new Date();
    const oneMinuteAgo = new Date(nowUTC.getTime() - 60000);

    return this.model
      .find({
        schedule_type: 'scheduled',
        status: 'scheduled',
        scheduled_at: {
          $gte: oneMinuteAgo,
          $lte: nowUTC,
        },
      })
      .exec();
  }

  async findByBusiness(
    businessId: string,
    session?: ClientSession,
  ): Promise<Campaign[]> {
    return this.model
      .find({ business_id: businessId }, null, { session })
      .sort({ created_at: -1 })
      .exec();
  }

  async findByStatus(
    businessId: string,
    status: string,
    session?: ClientSession,
  ): Promise<Campaign[]> {
    return this.model
      .find({ business_id: businessId, status }, null, { session })
      .sort({ created_at: -1 })
      .exec();
  }

  async updateStats(
    campaignId: string,
    sent: number,
    failed: number,
    session?: ClientSession,
  ): Promise<Campaign> {
    return this.updateById(
      campaignId,
      {
        $inc: { sent_count: sent, failed_count: failed },
      },
      session,
    );
  }

  async updateStatus(
    campaignId: string,
    status: string,
    session?: ClientSession,
  ): Promise<Campaign> {
    return this.updateById(campaignId, { status }, session);
  }

  // ✅ Add method to get campaigns by target scores
  async findByTargetScores(
    scores: ('hot' | 'warm' | 'cold')[],
    session?: ClientSession,
  ): Promise<Campaign[]> {
    return this.model
      .find({ target_leads: { $in: scores } }, null, { session })
      .sort({ created_at: -1 })
      .exec();
  }
  async count(filter: any = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
