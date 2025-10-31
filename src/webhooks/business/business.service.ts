import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BusinessesRepository } from '../../database/repositories/business.repository';
import { CampaignRepository } from '../../database/repositories/campaign.repository';
import {
  CreateBusinessDto,
  UpdateBusinessDto,
  BusinessResponse,
} from './types';
import { MessageTemplateResponse } from '../templates/types';
import { Campaign } from '../campaigns/types';
import { LeadsRepository } from '../../database/repositories/lead.repository';
import { MessageTemplateRepository } from 'src/database/repositories/message-template.repository';
import { MlClientService } from 'src/clients/ml/ml-client.service';
@Injectable()
export class BusinessService {
  constructor(
    private readonly businessRepository: BusinessesRepository,
    private readonly campaignRepository: CampaignRepository,
    private readonly LeadsRepository: LeadsRepository,
    private readonly MessageTemplateRepository: MessageTemplateRepository,
    private readonly mlClientService: MlClientService,
  ) {}

  async create(
    userId: string,
    dto: CreateBusinessDto,
  ): Promise<BusinessResponse> {
    console.log('📦 Backend received create business request:', dto);

    // 1. Create the business
    const business = await this.businessRepository.create({
      ...dto,
      user_id: userId,
      is_active: true,
      timezone: dto.timezone || 'UTC',
    });

    // 2. Send business data to ML service (feed vector)
    try {
      await this.mlClientService.feedVector({
        content: `${business.name} ${business.description || ''}`,
        business_id: business._id,
        metadata: {
          industry: business.industry,
          email: business.email,
          phone: business.phone,
          website: business.website,
        },
      });
      console.log(`✅ Business ${business._id} fed to ML service`);
    } catch (error) {
      console.warn(
        `⚠️ Failed to feed business ${business._id} to ML service:`,
        error,
      );
    }

    // 3. Return formatted response
    return this.formatBusiness(business, 0);
  }

  async findAll(userId: string): Promise<BusinessResponse[]> {
    const businesses = await this.businessRepository.findByOwner(userId);

    // Get campaign counts for all businesses
    const businessesWithCounts = await Promise.all(
      businesses.map(async (business) => {
        const campaignCount = await this.campaignRepository.count({
          business_id: (business as any)._id,
        });
        const leadsCount = await this.LeadsRepository.count({
          business_id: (business as any)._id,
        });
        return this.formatBusiness(business, campaignCount, leadsCount);
      }),
    );

    return businessesWithCounts;
  }

  async findById(
    businessId: string,
    userId: string,
  ): Promise<BusinessResponse> {
    const business = await this.businessRepository.findById(businessId);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Check ownership
    if ((business as any).user_id !== userId) {
      throw new ForbiddenException('You do not have access to this business');
    }

    const businessIdStr = String((business as any)._id); // ✅ Convert once, reuse

    // Get campaigns with details (latest 3)
    const recentCampaignsFromDb = await this.campaignRepository.findMany(
      { business_id: businessIdStr },
      { sort: { created_at: -1 }, limit: 3 },
    );

    // Map database campaigns to Campaign interface
    const recentCampaigns: Campaign[] = recentCampaignsFromDb.map(
      (campaign) => ({
        _id: campaign._id,
        business_id: campaign.business_id,
        template_id: campaign.template_id,
        name: campaign.name,
        schedule_type: campaign.schedule_type,
        scheduled_at: campaign.scheduled_at,
        cron_expression: campaign.cron_expression,
        target_leads: campaign.target_leads,
        status: campaign.status,
        total_recipients: campaign.total_recipients,
        sent_count: campaign.sent_count,
        failed_count: campaign.failed_count,
        created_at: campaign.created_at!,
        updated_at: campaign.updated_at!,
      }),
    );

    // Get total campaign count
    const campaignCount = await this.campaignRepository.count({
      business_id: businessIdStr, // ✅ Fixed
    });
    const leadsCount = await this.LeadsRepository.count({
      business_id: (business as any)._id,
    });

    // Get welcome message template (by template_key)
    const welcomeMessageFromDb =
      await this.MessageTemplateRepository.findByTemplateKey(
        businessIdStr,
        'WELCOME_MESSAGE',
      );

    // Map database message template to MessageTemplateResponse
    const welcomeTemplate: MessageTemplateResponse | null = welcomeMessageFromDb
      ? {
          id: welcomeMessageFromDb._id,
          business_id: welcomeMessageFromDb.business_id,
          name: welcomeMessageFromDb.name,
          content: welcomeMessageFromDb.content,
          category: welcomeMessageFromDb.category,
          language: welcomeMessageFromDb.language,
          variables: welcomeMessageFromDb.variables,
          usage_count: welcomeMessageFromDb.usage_count,
          last_used_at: welcomeMessageFromDb.last_used_at,
          created_at: welcomeMessageFromDb.created_at,
          updated_at: welcomeMessageFromDb.updated_at,
        }
      : null;

    return {
      _id: business._id,
      name: business.name,
      phone: business.phone,
      address: business.address,
      industry: business.industry,
      email: business.email,
      is_active: business.is_active,
      description: business.description,
      user_id: (business as any).user_id,
      timezone: business.timezone,
      created_at: business.created_at,
      updated_at: business.updated_at,
      campaigns: campaignCount,

      recentCampaigns,
      welcomeTemplate,
      Leads: leadsCount,
    };
  }

  async update(
    businessId: string,
    userId: string,
    dto: UpdateBusinessDto,
  ): Promise<BusinessResponse> {
    const business = await this.businessRepository.findById(businessId);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Check ownership
    if ((business as any).user_id !== userId) {
      throw new ForbiddenException('You do not have access to this business');
    }

    const updated = await this.businessRepository.updateById(businessId, dto);

    // Get campaign count
    const campaignCount = await this.campaignRepository.count({
      business_id: businessId,
    });

    return this.formatBusiness(updated, campaignCount);
  }

  async delete(businessId: string, userId: string): Promise<void> {
    const business = await this.businessRepository.findById(businessId);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // 🔒 Ensure ownership
    if ((business as any).user_id !== userId) {
      throw new ForbiddenException('You do not have access to this business');
    }

    let session = null;

    try {
      // 🧩 Try to start a transaction (works on Atlas)
      session = await this.businessRepository.startSession();
      session.startTransaction();

      // 🔹 1. Delete related data
      await this.campaignRepository.deleteMany(
        { business_id: businessId },
        { session },
      );
      await this.LeadsRepository.deleteMany(
        { business_id: businessId },
        { session },
      );
      await this.MessageTemplateRepository.deleteMany(
        { business_id: businessId },
        { session },
      );

      // 🔹 2. Delete the business itself
      await this.businessRepository.deleteOne({ _id: businessId }, { session });

      // ✅ Commit transaction (Atlas)
      await session.commitTransaction();
    } catch (error: any) {
      if (session) {
        await session.abortTransaction(); // rollback if failed
      }

      // ⚠️ If transactions aren't supported (local Compass)
      if (
        error.message?.includes(
          'Transaction numbers are only allowed on a replica set member',
        )
      ) {
        console.warn(
          '⚠️ Transactions not supported in this environment — using fallback deletes.',
        );

        await Promise.all([
          this.campaignRepository.deleteMany({ business_id: businessId }),
          this.LeadsRepository.deleteMany({ business_id: businessId }),
          this.MessageTemplateRepository.deleteMany({
            business_id: businessId,
          }),
        ]);
        await this.businessRepository.deleteOne({ _id: businessId });
      } else {
        throw error;
      }
    } finally {
      if (session) session.endSession();
    }
  }

  async deactivate(
    businessId: string,
    userId: string,
  ): Promise<BusinessResponse> {
    return this.update(businessId, userId, { is_active: false });
  }

  async activate(
    businessId: string,
    userId: string,
  ): Promise<BusinessResponse> {
    return this.update(businessId, userId, { is_active: true });
  }

  private formatBusiness(
    business: any,
    campaigns?: number,
    Leads?: number,
  ): BusinessResponse {
    return {
      _id: business._id,
      name: business.name,
      description: business.description,
      industry: business.industry,
      website: business.website,
      email: business.email,
      phone: business.phone,
      address: business.address,
      city: business.city,
      country: business.country,
      timezone: business.timezone,
      logo_url: business.logo_url,
      is_active: business.is_active,
      user_id: business.user_id,
      campaigns: campaigns,
      Leads: Leads,
      created_at: business.created_at,
      updated_at: business.updated_at,
    };
  }
}
