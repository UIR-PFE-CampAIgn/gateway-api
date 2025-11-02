import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CampaignRepository } from '../../database/repositories/campaign.repository';
import { CampaignLogRepository } from '../../database/repositories/campaign-log.repository';
import { MessageTemplateRepository } from '../../database/repositories/message-template.repository';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { LeadsRepository } from 'src/database/repositories/lead.repository';
import { ChatsRepository } from 'src/database/repositories/chat.repository';

interface CreateCampaignDto {
  template_id: string;
  name: string;
  schedule_type: 'immediate' | 'scheduled' | 'recurring';
  scheduled_at?: Date;
  cron_expression?: string;
  target_leads: ('hot' | 'warm' | 'cold')[];
  lead_data?: Record<string, any>[]; // Array of lead data for variable replacement
}

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignLogRepository: CampaignLogRepository,
    private readonly templateRepository: MessageTemplateRepository,
    private readonly schedulerService: CampaignSchedulerService,
    private readonly leadsRepo: LeadsRepository, // Add this
    private readonly chatsRepo: ChatsRepository,
  ) {}

  async create(businessId: string, dto: CreateCampaignDto) {
    // 1️⃣ Validate template exists
    const template = await this.templateRepository.findById(dto.template_id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const scheduledAtUTC = dto.scheduled_at
      ? new Date(dto.scheduled_at)
      : undefined;

    // 2️⃣ Create campaign first (without knowing final recipient count)
    const campaign = await this.campaignRepository.create({
      business_id: businessId,
      template_id: dto.template_id,
      name: dto.name,
      schedule_type: dto.schedule_type,
      scheduled_at: scheduledAtUTC,
      cron_expression: dto.cron_expression,
      target_leads: dto.target_leads,
      status: 'scheduled',
      total_recipients: 0, // Will update after validation
      sent_count: 0,
      failed_count: 0,
    });

    // 3️⃣ Find leads matching target scores **and belonging to this business**
    const targetLeads = await this.leadsRepo.findMany({
      score: { $in: dto.target_leads },
      business_id: businessId, // ✅ Only leads from the same business
    });

    // 4️⃣ Validate each lead and build campaign logs
    const validLogs = [];
    const skippedLeads = [];

    for (const lead of targetLeads) {
      const leadData =
        dto.lead_data?.find((ld) => ld.lead_id === lead._id) || {};

      try {
        // Find active chat for this lead **and the same business**
        const chat = await this.chatsRepo.findOne({
          lead_id: lead._id,
          business_id: businessId, // ✅ Filter by business
          status: 'open',
        });

        if (!chat) {
          skippedLeads.push({
            lead_id: lead._id,
            provider_user_id: lead.provider_user_id,
            reason: 'No active chat',
          });
          continue;
        }

        // Render message
        const renderedMessage = this.renderTemplate(template.content, leadData);

        // Add to valid logs
        validLogs.push({
          campaign_id: campaign._id,
          lead_id: lead.provider_user_id,
          chat_id: chat._id,
          message_content: renderedMessage,
          status: 'pending',
        });
      } catch (error) {
        this.logger.error(
          `Error processing lead ${lead._id}: ${error.message}`,
        );
        skippedLeads.push({
          lead_id: lead._id,
          provider_user_id: lead.provider_user_id,
          reason: 'Processing error',
        });
      }
    }

    // 5️⃣ Create all valid campaign logs
    if (validLogs.length > 0) {
      await this.campaignLogRepository.bulkCreate(validLogs);
    }

    // 6️⃣ Update campaign with actual valid recipient count
    await this.campaignRepository.updateById(campaign._id, {
      total_recipients: validLogs.length,
    });

    // 7️⃣ Log skipped leads
    if (skippedLeads.length > 0) {
      this.logger.warn(
        `Campaign ${campaign.name}: ${skippedLeads.length} leads skipped. Valid: ${validLogs.length}`,
      );
    }

    // 8️⃣ Execute immediately if needed
    if (dto.schedule_type === 'immediate') {
      setImmediate(() => this.schedulerService.executeCampaign(campaign._id));
    } else if (dto.schedule_type === 'recurring' && dto.cron_expression) {
      this.schedulerService.scheduleRecurringCampaign(
        campaign._id,
        dto.cron_expression,
      );
    }

    return {
      campaign,
      stats: {
        valid_recipients: validLogs.length,
        skipped_leads: skippedLeads.length,
        skipped_details: skippedLeads,
      },
    };
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value || '');
    }
    return rendered;
  }

  async findAll(businessId: string) {
    return this.campaignRepository.findByBusiness(businessId);
  }

  async findOne(id: string, businessId: string) {
    const campaign = await this.campaignRepository.findById(id);
    if (!campaign || campaign.business_id !== businessId) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async getLogs(campaignId: string, businessId: string) {
    const campaign = await this.findOne(campaignId, businessId);
    return this.campaignLogRepository.findByCampaign(campaign._id);
  }

  async cancel(id: string, businessId: string) {
    const campaign = await this.findOne(id, businessId);

    if (campaign.status === 'completed') {
      throw new Error('Cannot cancel completed campaign');
    }

    this.schedulerService.cancelScheduledCampaign(id);
    await this.campaignRepository.updateById(id, { status: 'failed' });

    return { message: 'Campaign cancelled' };
  }
}
