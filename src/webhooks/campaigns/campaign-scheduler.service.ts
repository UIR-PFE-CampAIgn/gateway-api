import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { CampaignRepository } from '../../database/repositories/campaign.repository';
import { CampaignLogRepository } from '../../database/repositories/campaign-log.repository';
import { MessagesRepository } from '../../database/repositories/message.repository'; // Your existing repo
import { WhatsappWebhookService } from '../whatsapp/whatsapp.service';

@Injectable()
export class CampaignSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CampaignSchedulerService.name);
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignLogRepository: CampaignLogRepository,
    private readonly messageRepository: MessagesRepository, // Use existing messages repo
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
      console.log('Cron checking at:', new Date()); // Add this
      const campaigns = await this.campaignRepository.findScheduledCampaigns();
      console.log('Found campaigns:', campaigns.length); // Add this

      for (const campaign of campaigns) {
        this.logger.log(
          `Executing campaign: ${campaign.name} (${campaign._id})`,
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

      // ✅ Clean up recurring task if exists
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

      // ✅ Clean up recurring task on failure too
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
      `Scheduled recurring campaign ${campaignId} with cron: ${cronExpression}`,
    );
  }

  cancelScheduledCampaign(campaignId: string) {
    if (this.scheduledTasks.has(campaignId)) {
      this.scheduledTasks.get(campaignId).stop();
      this.scheduledTasks.delete(campaignId);
    }
  }
}
