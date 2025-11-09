import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UsersRepository } from '../database/repositories/user.repository';
import { BusinessesRepository } from '../database/repositories/business.repository';
import { BusinessSocialMediaRepository } from '../database/repositories/business-social-media.repository';
import { LeadsRepository } from '../database/repositories/lead.repository';
import { ChatsRepository } from '../database/repositories/chat.repository';
import { MessagesRepository } from '../database/repositories/message.repository';
import { CampaignRepository } from '../database/repositories/campaign.repository';
import { MessageTemplateRepository } from '../database/repositories/message-template.repository';
import { Campaign } from '../database/schemas/campaign.schema';
import { MessageTemplate } from '../database/schemas/message-template.schema';

type LeadScore = 'hot' | 'warm' | 'cold';

interface LeadSeedData {
  _id?: string;
  provider: string;
  provider_user_id: string;
  business_id: string;
  display_name: string;
  score: LeadScore;
}

interface LeadConversationSeed {
  lead: LeadSeedData;
  entryChannel: string;
  interests: string[];
  urgency: 'low' | 'medium' | 'high';
  funnelStage: 'discovery' | 'evaluation' | 'purchase';
}

interface ConversationMessageSeed {
  direction: 'inbound' | 'outbound';
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  emphasis?: 'offer' | 'support' | 'follow-up';
  campaign?: Campaign;
}

@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersRepo: UsersRepository,
    private readonly businessesRepo: BusinessesRepository,
    private readonly bsmRepo: BusinessSocialMediaRepository,
    private readonly leadsRepo: LeadsRepository,
    private readonly chatsRepo: ChatsRepository,
    private readonly messagesRepo: MessagesRepository,
    private readonly campaignRepo: CampaignRepository,
    private readonly messageTemplateRepo: MessageTemplateRepository,
  ) {}

  async run(): Promise<void> {
    const userId =
      this.config.get<string>('SEED_USER_ID') ||
      '00000000-0000-4000-8000-000000000001';
    const userEmail =
      this.config.get<string>('SEED_USER_EMAIL') || 'owner@example.com';
    const userName =
      this.config.get<string>('SEED_USER_FULLNAME') || 'Owner User';

    const businessName =
      this.config.get<string>('SEED_BUSINESS_NAME') || 'My Test Business';
    const businessId =
      this.config.get<string>('SEED_BUSINESS_ID') ||
      '78f982f7-70f8-4001-a1b4-b20bfbfcfd15';

    // Twilio WhatsApp receiving number in E.164, e.g. +14150000000
    const whatsappNumber =
      this.config.get<string>('SEED_WHATSAPP_PAGE_ID') || '+14150000000';
    const webhookUrl =
      this.config.get<string>('SEED_WEBHOOK_URL') ||
      'http://localhost:3000/webhooks/whatsapp';
    const businessSocialMediaId =
      this.config.get<string>('SEED_BUSINESS_SOCIAL_MEDIA_ID') ||
      '49bce1d6-1865-4fcf-a482-28cc1221eed9';
    const anchorLeadId =
      this.config.get<string>('SEED_PRIMARY_LEAD_ID') ||
      '55763dc3-eafc-4205-91e5-581c08754d80';

    this.logger.log('Seeding user...');
    const user = await this.usersRepo.upsert(
      { user_id: userId } as any,
      { user_id: userId, email: userEmail, fullname: userName } as any,
    );
    this.logger.log(`User ready: _id=${user._id} user_id=${user.user_id}`);

    this.logger.log('Seeding business...');
    const business = await this.businessesRepo.upsert(
      { _id: businessId } as any,
      {
        _id: businessId,
        name: businessName,
        user_id: user.user_id,
        is_active: true,
        industry: 'Nightlife & Events',
        timezone: 'Africa/Casablanca',
      } as any,
    );
    this.logger.log(
      `Business ready: _id=${business._id} name=${business.name}`,
    );

    this.logger.log('Seeding BusinessSocialMedia mapping (WHATSAPP)...');
    const bsm = await this.bsmRepo.upsert(
      {
        _id: businessSocialMediaId,
      } as any,
      {
        _id: businessSocialMediaId,
        business_id: business._id,
        platform: 'WHATSAPP',
        page_id: whatsappNumber,
        page_name: `${business.name} WhatsApp`,
        webhook_url: webhookUrl,
        is_verified: false,
        is_active: true,
        sync_frequency_minutes: 30,
      } as any,
    );
    this.logger.log(
      `BSM ready: _id=${bsm._id} platform=${bsm.platform} page_id=${bsm.page_id}`,
    );

    const templates = await this.seedMessageTemplates(business._id);
    const campaigns = await this.seedCampaigns(business._id, templates);
    await this.seedLeadsChatsAndMessages(
      business._id,
      bsm._id,
      anchorLeadId,
      campaigns,
    );

    this.logger.log('Seeding done.');
  }

  private async seedMessageTemplates(
    businessId: string,
  ): Promise<MessageTemplate[]> {
    const fullTemplateSeeds: Array<{
      template_key: string;
      name: string;
      content: string;
      category: MessageTemplate['category'];
      language: string;
      variables: string[];
      usage_count: number;
      is_active: boolean;
    }> = [
      {
        template_key: 'VIP_TABLES_PUSH',
        name: 'VIP Tables Launch',
        content:
          'Hey {{lead_name}}, VIP tables for {{occasion}} on {{event_date}} just opened. Want me to lock one?',
        category: 'promotional',
        language: 'EN',
        variables: ['lead_name', 'occasion', 'event_date'],
        usage_count: 18,
        is_active: true,
      },
      {
        template_key: 'FOLLOW_UP_REMINDER',
        name: 'Follow-up Reminder',
        content:
          'Hi {{lead_name}}, just checking in on the {{offer_name}} we discussed. Need me to hold it a bit longer?',
        category: 'follow-up',
        language: 'EN',
        variables: ['lead_name', 'offer_name'],
        usage_count: 33,
        is_active: true,
      },
      {
        template_key: 'LAST_MINUTE_DEAL',
        name: 'Last Minute Deal',
        content:
          '{{lead_name}}, a last-minute spot opened for {{occasion}} tonight. Reply YES in the next 15 minutes to secure it.',
        category: 'promotional',
        language: 'EN',
        variables: ['lead_name', 'occasion'],
        usage_count: 9,
        is_active: true,
      },
      {
        template_key: 'POST_EVENT_CHECKIN',
        name: 'Post Event Check-in',
        content:
          'Hope {{occasion}} went great, {{lead_name}}! Want me to pencil you in for the next drop or share the new menu first?',
        category: 'general',
        language: 'EN',
        variables: ['lead_name', 'occasion'],
        usage_count: 14,
        is_active: true,
      },
      {
        template_key: 'PAYMENT_LINK',
        name: 'Payment Link + Menu',
        content:
          'Here is the secure link for {{occasion}} on {{event_date}}. Menu + upgrades inside: {{payment_link}}',
        category: 'transactional',
        language: 'EN',
        variables: ['occasion', 'event_date', 'payment_link'],
        usage_count: 21,
        is_active: true,
      },
    ];

    const templates: MessageTemplate[] = [];

    for (const seed of fullTemplateSeeds) {
      const template = (await this.messageTemplateRepo.upsert(
        {
          business_id: businessId,
          template_key: seed.template_key,
        } as any,
        {
          business_id: businessId,
          ...seed,
        } as any,
      )) as MessageTemplate;
      templates.push(template);
    }

    this.logger.log(`Seeded ${templates.length} message templates.`);
    return templates;
  }

  private async seedCampaigns(
    businessId: string,
    templates: MessageTemplate[],
  ): Promise<Campaign[]> {
    const templateMap = new Map(
      templates
        .filter((tpl) => tpl.template_key)
        .map((tpl) => [tpl.template_key as string, tpl]),
    );

    const now = new Date();
    const campaignSeeds = [
      {
        name: 'High Roller VIP Conversion',
        templateKey: 'VIP_TABLES_PUSH',
        scheduleType: 'immediate' as const,
        status: 'running' as const,
        targetLeads: ['hot', 'warm'] as LeadScore[],
        totalRecipients: 220,
        sentCount: 198,
        failedCount: 6,
      },
      {
        name: 'Abandoned Inquiry Follow-up',
        templateKey: 'FOLLOW_UP_REMINDER',
        scheduleType: 'scheduled' as const,
        scheduledAt: new Date(now.getTime() + 30 * 60 * 1000),
        status: 'scheduled' as const,
        targetLeads: ['warm', 'cold'] as LeadScore[],
        totalRecipients: 140,
        sentCount: 0,
        failedCount: 0,
      },
      {
        name: 'Last Minute Friday Push',
        templateKey: 'LAST_MINUTE_DEAL',
        scheduleType: 'immediate' as const,
        status: 'running' as const,
        targetLeads: ['hot'] as LeadScore[],
        totalRecipients: 95,
        sentCount: 83,
        failedCount: 4,
      },
      {
        name: 'Weekly Menu Drip',
        templateKey: 'POST_EVENT_CHECKIN',
        scheduleType: 'recurring' as const,
        cronExpression: '0 10 * * 4',
        status: 'running' as const,
        targetLeads: ['warm', 'cold'] as LeadScore[],
        totalRecipients: 310,
        sentCount: 1240,
        failedCount: 37,
      },
      {
        name: 'Payment + Menu Automation',
        templateKey: 'PAYMENT_LINK',
        scheduleType: 'immediate' as const,
        status: 'completed' as const,
        targetLeads: ['hot'] as LeadScore[],
        totalRecipients: 68,
        sentCount: 68,
        failedCount: 0,
      },
    ];

    const campaigns: Campaign[] = [];

    for (const seed of campaignSeeds) {
      const template = templateMap.get(seed.templateKey);
      if (!template) {
        this.logger.warn(
          `Missing template ${seed.templateKey} for campaign ${seed.name}`,
        );
        continue;
      }

      const campaign = (await this.campaignRepo.upsert(
        {
          business_id: businessId,
          name: seed.name,
        } as any,
        {
          business_id: businessId,
          template_id: template._id,
          name: seed.name,
          schedule_type: seed.scheduleType,
          scheduled_at: seed.scheduledAt,
          cron_expression: seed.cronExpression,
          target_leads: seed.targetLeads,
          status: seed.status,
          total_recipients: seed.totalRecipients,
          sent_count: seed.sentCount,
          failed_count: seed.failedCount,
        } as any,
      )) as Campaign;

      campaigns.push(campaign);
    }

    this.logger.log(`Seeded ${campaigns.length} campaigns.`);
    return campaigns;
  }

  private async seedLeadsChatsAndMessages(
    businessId: string,
    businessSocialMediaId: string,
    anchorLeadId: string,
    campaigns: Campaign[],
  ): Promise<void> {
    const leadSeeds = this.buildLeadSeeds(businessId, anchorLeadId);
    const campaignBuckets = this.splitCampaignsByScore(campaigns);

    let totalMessages = 0;

    for (const seed of leadSeeds) {
      const lead = await this.leadsRepo.upsert(
        {
          provider: seed.lead.provider,
          provider_user_id: seed.lead.provider_user_id,
        } as any,
        seed.lead as any,
      );

      let chat = await this.chatsRepo.findOne({
        lead_id: (lead as any)._id,
        business_social_media_id: businessSocialMediaId,
        status: 'open',
      } as any);

      if (!chat) {
        chat = await this.chatsRepo.create({
          lead_id: (lead as any)._id,
          business_social_media_id: businessSocialMediaId,
          status: 'open',
          message_count: 0,
          last_inbound_at: new Date(),
          last_outbound_at: new Date(),
        } as any);
      }

      const messagesCreated = await this.seedMessagesForChat(
        chat,
        seed,
        campaigns,
        campaignBuckets,
      );
      totalMessages += messagesCreated;
    }

    this.logger.log(
      `Seeded ${leadSeeds.length} leads/chats with ${totalMessages} total messages.`,
    );
  }

  private buildLeadSeeds(
    businessId: string,
    anchorLeadId: string,
  ): LeadConversationSeed[] {
    const leadProfiles: Array<{
      name: string;
      score: LeadScore;
      entryChannel: string;
      interests: string[];
      urgency: 'low' | 'medium' | 'high';
      funnelStage: 'discovery' | 'evaluation' | 'purchase';
    }> = [
      {
        name: 'Amina Haddad',
        score: 'hot',
        entryChannel: 'Meta Ads',
        interests: ['VIP terrace', 'birthday package'],
        urgency: 'high',
        funnelStage: 'purchase',
      },
      {
        name: 'Youssef Zara',
        score: 'warm',
        entryChannel: 'Instagram DM',
        interests: ['sunset session', 'cocktail masterclass'],
        urgency: 'medium',
        funnelStage: 'evaluation',
      },
      {
        name: 'Nada Elarbi',
        score: 'hot',
        entryChannel: 'Referral',
        interests: ['corporate mixer', 'DJ takeover'],
        urgency: 'high',
        funnelStage: 'purchase',
      },
      {
        name: 'Mohamed Rami',
        score: 'cold',
        entryChannel: 'Organic Search',
        interests: ['afterwork apero'],
        urgency: 'low',
        funnelStage: 'discovery',
      },
      {
        name: 'Sara El Idrissi',
        score: 'warm',
        entryChannel: 'WhatsApp Widget',
        interests: ['engagement party'],
        urgency: 'medium',
        funnelStage: 'evaluation',
      },
      {
        name: 'Omar Mouline',
        score: 'hot',
        entryChannel: 'Meta Retargeting',
        interests: ['corporate offsite'],
        urgency: 'high',
        funnelStage: 'purchase',
      },
      {
        name: 'Leila Bennis',
        score: 'warm',
        entryChannel: 'TikTok Lead',
        interests: ['rooftop brunch'],
        urgency: 'medium',
        funnelStage: 'evaluation',
      },
      {
        name: 'Said Raji',
        score: 'cold',
        entryChannel: 'Trade Show QR',
        interests: ['expo afterparty'],
        urgency: 'low',
        funnelStage: 'discovery',
      },
      {
        name: 'Kenza Taibi',
        score: 'hot',
        entryChannel: 'WhatsApp Referral',
        interests: ['fashion week'],
        urgency: 'high',
        funnelStage: 'purchase',
      },
      {
        name: 'Yassine Bakkali',
        score: 'warm',
        entryChannel: 'Email Capture',
        interests: ['sunrise yoga', 'smoothie bar'],
        urgency: 'medium',
        funnelStage: 'evaluation',
      },
      {
        name: 'Nadia Lachheb',
        score: 'hot',
        entryChannel: 'Landing Page Chatbot',
        interests: ['VIP tasting'],
        urgency: 'high',
        funnelStage: 'purchase',
      },
      {
        name: 'Hicham Chentouf',
        score: 'warm',
        entryChannel: 'Walk-in QR',
        interests: ['live band night'],
        urgency: 'medium',
        funnelStage: 'evaluation',
      },
      {
        name: 'Salma Amrani',
        score: 'cold',
        entryChannel: 'Newsletter',
        interests: ['mixology class'],
        urgency: 'low',
        funnelStage: 'discovery',
      },
      {
        name: 'Anas Hakam',
        score: 'warm',
        entryChannel: 'Partner Collab',
        interests: ['product launch'],
        urgency: 'medium',
        funnelStage: 'evaluation',
      },
      {
        name: 'Soukaina Badaoui',
        score: 'hot',
        entryChannel: 'Instagram Story',
        interests: ['henna night'],
        urgency: 'high',
        funnelStage: 'purchase',
      },
      {
        name: 'Tarik Essafi',
        score: 'warm',
        entryChannel: 'LinkedIn Lead Gen',
        interests: ['team building brunch'],
        urgency: 'medium',
        funnelStage: 'evaluation',
      },
      {
        name: 'Ikram Lahrichi',
        score: 'cold',
        entryChannel: 'Tripadvisor',
        interests: ['tourist sunset pack'],
        urgency: 'low',
        funnelStage: 'discovery',
      },
      {
        name: 'Hamza Edderraz',
        score: 'hot',
        entryChannel: 'TikTok Retargeting',
        interests: ['pop-up takeover'],
        urgency: 'high',
        funnelStage: 'purchase',
      },
      {
        name: 'Farah Slimani',
        score: 'warm',
        entryChannel: 'Facebook Group',
        interests: ['wellness morning'],
        urgency: 'medium',
        funnelStage: 'evaluation',
      },
      {
        name: 'Reda Bourbia',
        score: 'hot',
        entryChannel: 'High Roller Concierge',
        interests: ['full venue buyout'],
        urgency: 'high',
        funnelStage: 'purchase',
      },
      {
        name: 'Meryem Khatib',
        score: 'warm',
        entryChannel: 'Instagram Live',
        interests: ['chef table'],
        urgency: 'medium',
        funnelStage: 'evaluation',
      },
      {
        name: 'Ziad Ennaoui',
        score: 'cold',
        entryChannel: 'Website Popup',
        interests: ['afterwork networking'],
        urgency: 'low',
        funnelStage: 'discovery',
      },
      {
        name: 'Aya Mechbal',
        score: 'warm',
        entryChannel: 'Partner Hotel',
        interests: ['sunset cocktail hour'],
        urgency: 'medium',
        funnelStage: 'evaluation',
      },
      {
        name: 'Rim Khallouki',
        score: 'hot',
        entryChannel: 'Influencer Drop',
        interests: ['album release'],
        urgency: 'high',
        funnelStage: 'purchase',
      },
    ];

    return leadProfiles.map((profile, index) => {
      const providerUserId = `whatsapp:+2126${(400000 + index)
        .toString()
        .padStart(6, '0')}`;

      const lead: LeadSeedData = {
        provider: 'whatsapp',
        provider_user_id: providerUserId,
        business_id: businessId,
        display_name: profile.name,
        score: profile.score,
      };

      if (index === 0 && anchorLeadId) {
        lead._id = anchorLeadId;
      }

      return {
        lead,
        entryChannel: profile.entryChannel,
        interests: profile.interests,
        urgency: profile.urgency,
        funnelStage: profile.funnelStage,
      };
    });
  }

  private async seedMessagesForChat(
    chat: any,
    seed: LeadConversationSeed,
    campaigns: Campaign[],
    campaignBuckets: Record<LeadScore, Campaign[]>,
  ): Promise<number> {
    const desiredMessagesPerChat = 16;
    const existingCount = chat?.message_count ?? 0;
    const missing = desiredMessagesPerChat - existingCount;

    if (missing <= 0) {
      return 0;
    }

    const script = this.buildConversationScript(
      seed,
      campaigns,
      campaignBuckets,
      desiredMessagesPerChat + 4,
    );

    const seedsToUse: ConversationMessageSeed[] = [];
    while (seedsToUse.length < missing) {
      seedsToUse.push(...script);
    }

    let created = 0;

    for (let i = 0; i < missing; i++) {
      const messageSeed = seedsToUse[i];
      const selectedCampaign =
        messageSeed.direction === 'outbound'
          ? (messageSeed.campaign ??
            this.pickCampaignForScore(
              seed.lead.score,
              campaignBuckets,
              i,
              campaigns,
            ))
          : undefined;

      await this.messagesRepo.create({
        chat_id: chat._id,
        direction: messageSeed.direction,
        msg_type: 'text',
        text: messageSeed.text,
        payload: {
          seeded: true,
          entry_channel: seed.entryChannel,
          interests: seed.interests,
          funnel_stage: seed.funnelStage,
          urgency: seed.urgency,
          sentiment: messageSeed.sentiment,
          emphasis: messageSeed.emphasis,
          campaign_name: selectedCampaign?.name,
          campaign_status: selectedCampaign?.status,
        },
        provider_message_id: `SEED-${randomUUID()}`,
        ai_reply: messageSeed.direction === 'outbound',
        campaign_id: selectedCampaign?._id,
      } as any);

      await this.chatsRepo.incrementMessageCount(
        chat._id,
        messageSeed.direction === 'inbound',
      );

      created++;
    }

    return created;
  }

  private buildConversationScript(
    seed: LeadConversationSeed,
    campaigns: Campaign[],
    campaignBuckets: Record<LeadScore, Campaign[]>,
    targetLength: number,
  ): ConversationMessageSeed[] {
    const name = seed.lead.display_name || 'there';
    const primaryInterest = seed.interests[0] || 'experience';
    const secondaryInterest = seed.interests[1] || primaryInterest;

    const primaryCampaign = this.pickCampaignForScore(
      seed.lead.score,
      campaignBuckets,
      0,
      campaigns,
    );
    const nurtureCampaign = this.pickCampaignForScore(
      seed.lead.score,
      campaignBuckets,
      1,
      campaigns,
    );

    const script: ConversationMessageSeed[] = [
      {
        direction: 'inbound',
        text: `Hi team, ${name} here. I spotted your ${primaryInterest} via ${seed.entryChannel}. Is it still available?`,
        sentiment: 'positive',
        emphasis: 'support',
      },
      {
        direction: 'outbound',
        text: `Hey ${name}! Yes, we still have ${primaryInterest} slots and can hold one while you confirm details.`,
        sentiment: 'positive',
        emphasis: 'offer',
        campaign: primaryCampaign,
      },
      {
        direction: 'inbound',
        text: `Great! Could you remind me what the upgrade includes? Thinking about ${secondaryInterest}.`,
        sentiment: 'neutral',
        emphasis: 'support',
      },
      {
        direction: 'outbound',
        text: `Upgrade covers bespoke decor, welcome drinks, and concierge for ${secondaryInterest}. Works for groups up to 18 guests.`,
        sentiment: 'positive',
        emphasis: 'offer',
      },
      {
        direction: 'inbound',
        text: `What would deposit + balance look like if we lock it today?`,
        sentiment: 'neutral',
        emphasis: 'support',
      },
      {
        direction: 'outbound',
        text: `50% deposit secures the spot and the rest is due on arrival. I can send the payment link once you confirm.`,
        sentiment: 'positive',
        emphasis: 'offer',
        campaign: nurtureCampaign,
      },
      {
        direction: 'inbound',
        text: `Please also share the latest menu so I can circulate with the team.`,
        sentiment: 'neutral',
        emphasis: 'support',
      },
      {
        direction: 'outbound',
        text: `Sending the chef's menu + bottle list now. Let me know if you want the plant-based add-ons too.`,
        sentiment: 'positive',
        emphasis: 'support',
      },
      {
        direction: 'inbound',
        text: `We like the premium option. Does the DJ slot align with our timing around 23:30?`,
        sentiment: 'positive',
        emphasis: 'support',
      },
      {
        direction: 'outbound',
        text: `Yes, I reserved the 23:30 set for you so the flow stays tight. Need final headcount by tomorrow noon.`,
        sentiment: 'positive',
        emphasis: 'follow-up',
      },
    ];

    if (seed.urgency !== 'low') {
      script.push(
        {
          direction: 'inbound',
          text: `Timeline is ${seed.urgency} on our side. Can you hold pricing for the next few hours?`,
          sentiment: 'positive',
          emphasis: 'support',
        },
        {
          direction: 'outbound',
          text: `Absolutely — I'll freeze the quote until 6pm and nudge you before it expires.`,
          sentiment: 'positive',
          emphasis: 'follow-up',
          campaign: primaryCampaign,
        },
      );
    }

    if (seed.funnelStage === 'discovery') {
      script.push(
        {
          direction: 'outbound',
          text: `Quick heads up: we host discovery tastings every Thursday if you want to experience it before booking.`,
          sentiment: 'positive',
          emphasis: 'offer',
          campaign: nurtureCampaign,
        },
        {
          direction: 'inbound',
          text: `Nice, send me the RSVP link. I’ll bring a colleague.`,
          sentiment: 'positive',
          emphasis: 'support',
        },
      );
    } else if (seed.funnelStage === 'evaluation') {
      script.push(
        {
          direction: 'outbound',
          text: `Sharing two client decks that mirror your ${primaryInterest} flow so you can see setups.`,
          sentiment: 'positive',
          emphasis: 'support',
        },
        {
          direction: 'inbound',
          text: `Received them — looks aligned with what we need.`,
          sentiment: 'positive',
          emphasis: 'support',
        },
      );
    } else {
      script.push(
        {
          direction: 'outbound',
          text: `Everything is penciled in. Want me to send the payment + contract in one message?`,
          sentiment: 'positive',
          emphasis: 'offer',
          campaign: nurtureCampaign,
        },
        {
          direction: 'inbound',
          text: `Yes please, we’re ready to sign.`,
          sentiment: 'positive',
          emphasis: 'support',
        },
      );
    }

    script.push(
      {
        direction: 'outbound',
        text: `Reminder: once payment lands I'll trigger staffing + decor so nothing slips.`,
        sentiment: 'positive',
        emphasis: 'follow-up',
      },
      {
        direction: 'inbound',
        text: `Working on it now. Drop me the confirmation template?`,
        sentiment: 'neutral',
        emphasis: 'support',
      },
      {
        direction: 'outbound',
        text: `Confirmation template + invoice are attached here. Ping me if finance needs a PO reference.`,
        sentiment: 'positive',
        emphasis: 'support',
      },
    );

    while (script.length < targetLength) {
      const followUpIndex = script.length - 10;
      script.push(
        {
          direction: 'outbound',
          text: `Just checking in ${name}, update #${followUpIndex}: want me to keep ${primaryInterest} on hold?`,
          sentiment: 'neutral',
          emphasis: 'follow-up',
          campaign: primaryCampaign,
        },
        {
          direction: 'inbound',
          text: `Thanks for the reminder. I appreciate how on top of this you are.`,
          sentiment: 'positive',
          emphasis: 'support',
        },
      );
    }

    return script.slice(0, targetLength);
  }

  private splitCampaignsByScore(
    campaigns: Campaign[],
  ): Record<LeadScore, Campaign[]> {
    return campaigns.reduce(
      (acc, campaign) => {
        for (const score of campaign.target_leads as LeadScore[]) {
          acc[score].push(campaign);
        }
        return acc;
      },
      { hot: [], warm: [], cold: [] } as Record<LeadScore, Campaign[]>,
    );
  }

  private pickCampaignForScore(
    score: LeadScore | undefined,
    buckets: Record<LeadScore, Campaign[]>,
    offset: number,
    fallback: Campaign[],
  ): Campaign | undefined {
    const normalized: LeadScore = score ?? 'warm';
    const pool = buckets[normalized]?.length ? buckets[normalized] : fallback;
    if (!pool?.length) {
      return undefined;
    }
    return pool[offset % pool.length];
  }
}
