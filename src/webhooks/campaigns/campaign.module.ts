import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { WhatsappWebhookModule } from '../whatsapp/whatsapp.module';
import { DatabaseModule } from '../../database/database.module';
import { MlClientModule } from 'src/clients/ml/ml-client.module';

@Module({
  imports: [DatabaseModule, WhatsappWebhookModule, MlClientModule],
  controllers: [CampaignController],
  providers: [CampaignService, CampaignSchedulerService],
  exports: [CampaignService, CampaignSchedulerService],
})
export class CampaignsModule {}
