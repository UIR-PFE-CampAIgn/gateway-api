import { Injectable } from '@nestjs/common';
import { BusinessesRepository } from '../../database/repositories/business.repository';
import { CampaignRepository } from '../../database/repositories/campaign.repository';
import { LeadsRepository } from '../../database/repositories/lead.repository';
import { ChatsRepository } from '../../database/repositories/chat.repository';
import { MessagesRepository } from '../../database/repositories/message.repository';
import { BusinessSocialMediaRepository } from '../../database/repositories/business-social-media.repository';

export interface DashboardStats {
  totalBusinesses: number;
  activeCampaigns: number;
  messagesSent: number;
  totalLeads: number;
  trends: {
    businesses: string;
    campaigns: string;
    messages: string;
    leads: string;
  };
  trendData?: Array<{
    date: string;
    messages: number;
    leads: number;
  }>;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly businessesRepository: BusinessesRepository,
    private readonly campaignsRepository: CampaignRepository,
    private readonly leadsRepository: LeadsRepository,
    private readonly chatsRepository: ChatsRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly businessSocialMediaRepository: BusinessSocialMediaRepository,
  ) {}

  async getOverallStats(userId: string, days = 30): Promise<DashboardStats> {
    // 1️⃣ Get user businesses
    const userBusinesses = await this.businessesRepository.findByOwner(userId);
    const businessIds = userBusinesses.map((b) => (b as any)._id);

    if (businessIds.length === 0) {
      return {
        totalBusinesses: 0,
        activeCampaigns: 0,
        messagesSent: 0,
        totalLeads: 0,
        trends: {
          businesses: '+0%',
          campaigns: '+0%',
          messages: '+0%',
          leads: '+0%',
        },
        trendData: [],
      };
    }

    // 2️⃣ Related business_social_media + chats
    const businessSocialMedias =
      await this.businessSocialMediaRepository.findMany({
        business_id: { $in: businessIds },
      });
    const businessSocialMediaIds = businessSocialMedias.map(
      (bsm) => (bsm as any)._id,
    );

    const chats = await this.chatsRepository.findMany({
      business_social_media_id: { $in: businessSocialMediaIds },
    });
    const chatIds = chats.map((c) => (c as any)._id);

    // 3️⃣ Current & previous periods
    const now = new Date();
    const currentPeriodStart = new Date(
      now.getTime() - days * 24 * 60 * 60 * 1000,
    );
    const previousPeriodStart = new Date(
      now.getTime() - 2 * days * 24 * 60 * 60 * 1000,
    );
    const previousPeriodEnd = currentPeriodStart;

    // 4️⃣ Parallel stats fetch
    const [totalBusinesses, activeCampaigns, messagesSentCurrent, totalLeads] =
      await Promise.all([
        this.businessesRepository.count({ user_id: userId }),
        this.campaignsRepository.count({
          business_id: { $in: businessIds },
          status: 'running',
        }),
        this.messagesRepository.count({
          chat_id: { $in: chatIds },
          direction: 'outbound',
          created_at: { $gte: currentPeriodStart },
        }),
        this.leadsRepository.count({ business_id: { $in: businessIds } }),
      ]);

    // 5️⃣ Previous period data
    const [
      businessesPrevious,
      campaignsPrevious,
      messagesPrevious,
      leadsPrevious,
    ] = await Promise.all([
      this.businessesRepository.count({
        user_id: userId,
        created_at: { $gte: previousPeriodStart, $lt: previousPeriodEnd },
      }),
      this.campaignsRepository.count({
        business_id: { $in: businessIds },
        created_at: { $gte: previousPeriodStart, $lt: previousPeriodEnd },
      }),
      this.messagesRepository.count({
        chat_id: { $in: chatIds },
        direction: 'outbound',
        created_at: { $gte: previousPeriodStart, $lt: previousPeriodEnd },
      }),
      this.leadsRepository.count({
        business_id: { $in: businessIds },
        created_at: { $gte: previousPeriodStart, $lt: previousPeriodEnd },
      }),
    ]);

    // 6️⃣ Trends calculation
    const trends = {
      businesses: this.calculateTrend(totalBusinesses, businessesPrevious),
      campaigns: this.calculateTrend(activeCampaigns, campaignsPrevious),
      messages: this.calculateTrend(messagesSentCurrent, messagesPrevious),
      leads: this.calculateTrend(totalLeads, leadsPrevious),
    };

    // 7️⃣ Generate trend data (for chart)
    const trendData = await this.getDailyTrends(chatIds, businessIds, 7);

    return {
      totalBusinesses,
      activeCampaigns,
      messagesSent: messagesSentCurrent,
      totalLeads,
      trends,
      trendData,
    };
  }

  // 📊 Daily trend generator for chart
  private async getDailyTrends(
    chatIds: string[],
    businessIds: string[],
    days = 7,
  ) {
    const data: Array<{ date: string; messages: number; leads: number }> = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - i,
          0,
          0,
          0,
        ),
      );
      const end = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - i + 1,
          0,
          0,
          0,
        ),
      );

      // Debug log — helps verify the date window
      console.log(`Counting for ${start.toISOString()} → ${end.toISOString()}`);

      const [dailyMessages, dailyLeads] = await Promise.all([
        this.messagesRepository.count({
          chat_id: { $in: chatIds },
          direction: 'outbound',
          created_at: { $gte: start, $lt: end },
        }),
        this.leadsRepository.count({
          business_id: { $in: businessIds },
          created_at: { $gte: start, $lt: end },
        }),
      ]);

      data.push({
        date: start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        messages: dailyMessages,
        leads: dailyLeads,
      });
    }

    return data;
  }

  private calculateTrend(current: number, previous: number): string {
    if (current === 0 && previous === 0) return '+0%';
    if (previous === 0) return current > 0 ? '+100%' : '+0%';
    if (current === 0) return '-100%';

    const percentChange = ((current - previous) / previous) * 100;
    const sign = percentChange >= 0 ? '+' : '';
    return `${sign}${percentChange.toFixed(0)}%`;
  }
}
