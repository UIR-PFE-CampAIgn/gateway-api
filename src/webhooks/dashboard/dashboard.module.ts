import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DatabaseModule } from '../../database/database.module';
import { BusinessesRepository } from '../../database/repositories/business.repository';
import { CampaignRepository } from '../../database/repositories/campaign.repository';
import { LeadsRepository } from '../../database/repositories/lead.repository';
import { ChatsRepository } from '../../database/repositories/chat.repository';
import { MessagesRepository } from '../../database/repositories/message.repository';
import { BusinessSocialMediaRepository } from '../../database/repositories/business-social-media.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    BusinessesRepository,
    CampaignRepository,
    LeadsRepository,
    ChatsRepository,
    MessagesRepository,
    BusinessSocialMediaRepository,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
