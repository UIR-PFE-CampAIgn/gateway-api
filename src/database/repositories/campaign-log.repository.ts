import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { CampaignLog } from '../schemas/campaign-log.schema';

@Injectable()
export class CampaignLogRepository extends BaseRepository<CampaignLog> {
  constructor(@InjectModel('CampaignLog') model: Model<CampaignLog>) {
    super(model);
  }

  async findByCampaign(
    campaignId: string,
    session?: ClientSession,
  ): Promise<CampaignLog[]> {
    return this.model
      .find({ campaign_id: campaignId }, null, { session })
      .sort({ created_at: -1 })
      .exec();
  }

  async findPendingLogs(
    campaignId: string,
    session?: ClientSession,
  ): Promise<CampaignLog[]> {
    return this.model
      .find({ campaign_id: campaignId, status: 'pending' }, null, { session })
      .exec();
  }

  async findByLead(
    leadId: string,
    session?: ClientSession,
  ): Promise<CampaignLog[]> {
    return this.model
      .find({ lead_id: leadId }, null, { session })
      .sort({ created_at: -1 })
      .exec();
  }

  async markAsSent(
    logId: string,
    messageId: string,
    session?: ClientSession,
  ): Promise<CampaignLog> {
    return this.updateById(
      logId,
      {
        status: 'sent',
        message_id: messageId,
      },
      session,
    );
  }

  async markAsFailed(
    logId: string,
    errorMessage: string,
    session?: ClientSession,
  ): Promise<CampaignLog> {
    return this.updateById(
      logId,
      { status: 'failed', error_message: errorMessage },
      session,
    );
  }

  async getStats(campaignId: string, session?: ClientSession) {
    const logs = await this.findByCampaign(campaignId, session);

    return {
      total: logs.length,
      sent: logs.filter((l) => l.status === 'sent').length,
      failed: logs.filter((l) => l.status === 'failed').length,
      pending: logs.filter((l) => l.status === 'pending').length,
    };
  }

  async bulkCreate(
    logs: Partial<CampaignLog>[],
    session?: ClientSession,
  ): Promise<CampaignLog[]> {
    return this.model.insertMany(logs, { session });
  }
}
