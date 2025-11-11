import { NotFoundException } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignRepository } from '../../database/repositories/campaign.repository';
import { CampaignLogRepository } from '../../database/repositories/campaign-log.repository';
import { MessageTemplateRepository } from '../../database/repositories/message-template.repository';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { LeadsRepository } from '../../database/repositories/lead.repository';
import { ChatsRepository } from '../../database/repositories/chat.repository';

describe('CampaignService', () => {
  let campaignService: CampaignService;
  let campaignRepository: jest.Mocked<CampaignRepository>;
  let campaignLogRepository: jest.Mocked<CampaignLogRepository>;
  let templateRepository: jest.Mocked<MessageTemplateRepository>;
  let schedulerService: jest.Mocked<CampaignSchedulerService>;
  let leadsRepository: jest.Mocked<LeadsRepository>;
  let chatsRepository: jest.Mocked<ChatsRepository>;

  beforeEach(() => {
    campaignRepository = {
      create: jest.fn(),
      updateById: jest.fn(),
      findByBusiness: jest.fn(),
      findById: jest.fn(),
      findScheduledCampaigns: jest.fn(),
      find: jest.fn(),
      findByStatus: jest.fn(),
      updateStats: jest.fn(),
      updateStatus: jest.fn(),
      findByTargetScores: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<CampaignRepository>;

    campaignLogRepository = {
      bulkCreate: jest.fn(),
      findByCampaign: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<CampaignLogRepository>;

    templateRepository = {
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<MessageTemplateRepository>;

    schedulerService = {
      executeCampaign: jest.fn(),
      scheduleRecurringCampaign: jest.fn(),
      cancelScheduledCampaign: jest.fn(),
    } as unknown as jest.Mocked<CampaignSchedulerService>;

    leadsRepository = {
      findMany: jest.fn(),
    } as unknown as jest.Mocked<LeadsRepository>;

    chatsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ChatsRepository>;

    campaignService = new CampaignService(
      campaignRepository,
      campaignLogRepository,
      templateRepository,
      schedulerService,
      leadsRepository,
      chatsRepository,
    );
  });

  const invokeRenderTemplate = (template: string, data: Record<string, any>) =>
    (campaignService as any).renderTemplate(template, data);

  describe('renderTemplate', () => {
    it('replaces placeholders with supplied values', () => {
      const output = invokeRenderTemplate('Hello {{name}}, your order ready.', {
        display_name: 'Alice',
      });

      expect(output).toBe('Hello Alice, your order ready.');
    });

    it('keeps placeholders when no replacement is provided', () => {
      const output = invokeRenderTemplate('Hi {{name}} {{lastName}}', {
        display_name: 'Bob',
      });

      expect(output).toBe('Hi Bob');
    });

    it('converts falsy values to empty strings', () => {
      const output = invokeRenderTemplate('Score: {{score}}.', { score: 0 });

      expect(output).toBe('Score: 0.');
    });
  });

  describe('create', () => {
    it('creates logs for leads with chats and schedules immediate execution', async () => {
      const businessId = 'biz-1';
      const dto = {
        template_id: 'tpl-1',
        name: 'Promo',
        schedule_type: 'immediate' as const,
        target_leads: ['hot' as const],
        lead_data: [{ lead_id: 'lead-1', name: 'Alice' }],
      };

      templateRepository.findById.mockResolvedValue({
        content: 'Hello {{name}}',
      } as any);

      const campaign = {
        _id: 'camp-1',
        name: 'Promo',
        business_id: businessId,
      };
      campaignRepository.create.mockResolvedValue(campaign as any);

      leadsRepository.findMany.mockResolvedValue([
        {
          _id: 'lead-1',
          provider_user_id: 'user-1',
          provider: '',
          display_name: 'Alice',
          business_id: '',
        },
        {
          _id: 'lead-2',
          provider_user_id: 'user-2',
          display_name: 'Jake',
          provider: '',
          business_id: '',
        },
      ]);

      chatsRepository.findOne
        .mockResolvedValueOnce({ _id: 'chat-1' } as any)
        .mockResolvedValueOnce(null);

      campaignLogRepository.bulkCreate.mockResolvedValue(undefined as any);
      campaignRepository.updateById.mockResolvedValue(undefined as any);

      const setImmediateSpy = jest
        .spyOn(global, 'setImmediate')
        .mockImplementation(((fn: (...args: any[]) => void) => {
          fn();
          return 0 as any;
        }) as any);

      const result = await campaignService.create(businessId, dto);

      expect(templateRepository.findById).toHaveBeenCalledWith('tpl-1');
      expect(campaignRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: businessId,
          template_id: 'tpl-1',
          schedule_type: 'immediate',
          total_recipients: 0,
        }),
      );
      expect(leadsRepository.findMany).toHaveBeenCalledWith({
        score: { $in: ['hot'] },
        business_id: businessId,
      });
      expect(chatsRepository.findOne).toHaveBeenNthCalledWith(1, {
        lead_id: 'lead-1',
        status: 'open',
      });
      expect(campaignLogRepository.bulkCreate).toHaveBeenCalledWith([
        {
          campaign_id: 'camp-1',
          lead_id: 'user-1',
          chat_id: 'chat-1',
          message_content: 'Hello Alice',
          status: 'pending',
        },
      ]);
      expect(campaignRepository.updateById).toHaveBeenCalledWith('camp-1', {
        total_recipients: 1,
      });
      expect(result.stats).toEqual({
        valid_recipients: 1,
        skipped_leads: 1,
        skipped_details: [
          {
            lead_id: 'lead-2',
            provider_user_id: 'user-2',
            reason: 'No active chat',
          },
        ],
      });
      expect(schedulerService.executeCampaign).toHaveBeenCalledWith('camp-1');
      expect(setImmediateSpy).toHaveBeenCalled();

      setImmediateSpy.mockRestore();
    });

    it('throws when template is not found', async () => {
      templateRepository.findById.mockResolvedValue(null);

      await expect(
        campaignService.create('biz', {
          template_id: 'missing',
          name: 'Test',
          schedule_type: 'immediate',
          target_leads: ['hot'],
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('returns campaign when business matches', async () => {
      const campaign = {
        _id: 'camp-1',
        business_id: 'biz-1',
      };
      campaignRepository.findById.mockResolvedValue(campaign as any);

      const result = await campaignService.findOne('camp-1', 'biz-1');
      expect(result).toBe(campaign);
    });

    it('throws when campaign is missing or belongs to another business', async () => {
      campaignRepository.findById.mockResolvedValue({
        _id: 'camp-1',
        business_id: 'owner',
      } as any);

      await expect(
        campaignService.findOne('camp-1', 'other'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('marks campaign as failed when cancellable', async () => {
      campaignRepository.findById.mockResolvedValue({
        _id: 'camp-1',
        business_id: 'biz-1',
        status: 'scheduled',
      } as any);

      const response = await campaignService.cancel('camp-1', 'biz-1');

      expect(schedulerService.cancelScheduledCampaign).toHaveBeenCalledWith(
        'camp-1',
      );
      expect(campaignRepository.updateById).toHaveBeenCalledWith('camp-1', {
        status: 'failed',
      });
      expect(response).toEqual({ message: 'Campaign cancelled' });
    });

    it('throws when campaign already completed', async () => {
      campaignRepository.findById.mockResolvedValue({
        _id: 'camp-1',
        business_id: 'biz-1',
        status: 'completed',
      } as any);

      await expect(campaignService.cancel('camp-1', 'biz-1')).rejects.toThrow(
        'Cannot cancel completed campaign',
      );
    });
  });
});
