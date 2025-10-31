import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { CampaignRepository } from '../../database/repositories/campaign.repository';
import { CampaignLogRepository } from '../../database/repositories/campaign-log.repository';
import { MessagesRepository } from '../../database/repositories/message.repository';
import { WhatsappWebhookService } from '../whatsapp/whatsapp.service';

@Injectable()
export class CampaignSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CampaignSchedulerService.name);
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignLogRepository: CampaignLogRepository,
    private readonly messageRepository: MessagesRepository,
    private readonly whatsappService: WhatsappWebhookService,
  ) {}

  onModuleInit() {
    cron.schedule('* * * * *', () => {
      this.checkScheduledCampaigns();
    });
    this.logger.log('Campaign scheduler initialized');
  }

  private async checkScheduledCampaigns() {
    try {
      const nowUTC = new Date();
      this.logger.log(`Cron checking at UTC: ${nowUTC.toISOString()}`);

      // Find campaigns that should run now
      // Look for campaigns scheduled in the last minute
      const oneMinuteAgo = new Date(nowUTC.getTime() - 60000);

      const campaigns = await this.campaignRepository.find({
        schedule_type: 'scheduled',
        status: 'scheduled',
        scheduled_at: {
          $gte: oneMinuteAgo,
          $lte: nowUTC,
        },
      });

      this.logger.log(`Found ${campaigns.length} campaigns to execute`);

      for (const campaign of campaigns) {
        this.logger.log(
          `Executing campaign: ${campaign.name} (${campaign._id}) scheduled for ${campaign.scheduled_at}`,
        );
        await this.executeCampaign(campaign._id);
      }
    } catch (error) {
      this.logger.error('Error checking scheduled campaigns:', error);
    }
  }

  async executeCampaign(campaignId: string) {
    try {
      const campaign = await this.campaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      await this.campaignRepository.updateById(campaignId, {
        status: 'running',
      });

      const logs = await this.campaignLogRepository.findPendingLogs(campaignId);

      let sentCount = 0;
      let failedCount = 0;

      for (const log of logs) {
        try {
          const renderedMessage = log.message_content;

          await this.whatsappService.sendMessage({
            to: log.lead_id,
            message: renderedMessage,
          });

          const messageRecord = await this.messageRepository.create({
            chat_id: log.chat_id,
            provider_message_id: log.lead_id,
            direction: 'outbound',
            text: renderedMessage,
            campaign_id: campaignId,
          });

          await this.campaignLogRepository.updateById(log._id, {
            status: 'sent',
            message_id: messageRecord._id,
          });

          sentCount++;
        } catch (error) {
          await this.campaignLogRepository.markAsFailed(
            log._id,
            error.message || 'Failed to send',
          );
          failedCount++;
          this.logger.error(`Failed to send to ${log.lead_id}:`, error);
        }

        await this.delay(1000);
      }

      await this.campaignRepository.updateStats(
        campaignId,
        sentCount,
        failedCount,
      );
      await this.campaignRepository.updateById(campaignId, {
        status: 'completed',
      });

      if (this.scheduledTasks.has(campaignId)) {
        this.scheduledTasks.get(campaignId).stop();
        this.scheduledTasks.delete(campaignId);
        this.logger.log(`Stopped recurring task for campaign ${campaignId}`);
      }

      this.logger.log(
        `Campaign ${campaign.name} completed. Sent: ${sentCount}, Failed: ${failedCount}`,
      );
    } catch (error) {
      this.logger.error(`Error executing campaign ${campaignId}:`, error);
      await this.campaignRepository.updateById(campaignId, {
        status: 'failed',
      });

      if (this.scheduledTasks.has(campaignId)) {
        this.scheduledTasks.get(campaignId).stop();
        this.scheduledTasks.delete(campaignId);
        this.logger.log(
          `Stopped recurring task for failed campaign ${campaignId}`,
        );
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  scheduleRecurringCampaign(campaignId: string, cronExpression: string) {
    if (this.scheduledTasks.has(campaignId)) {
      this.scheduledTasks.get(campaignId).stop();
    }

    const task = cron.schedule(cronExpression, async () => {
      this.logger.log(`Executing recurring campaign: ${campaignId}`);
      await this.executeCampaign(campaignId);
    });

    this.scheduledTasks.set(campaignId, task);
    this.logger.log(
      `Scheduled recurring campaign ${campaignId} with cron: ${cronExpression} (UTC)`,
    );
  }

  cancelScheduledCampaign(campaignId: string) {
    if (this.scheduledTasks.has(campaignId)) {
      this.scheduledTasks.get(campaignId).stop();
      this.scheduledTasks.delete(campaignId);
    }
  }
}
