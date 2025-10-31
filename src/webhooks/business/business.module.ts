import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { DatabaseModule } from '../../database/database.module';
import { CampaignRepository } from '../../database/repositories/campaign.repository';
import { MessageTemplateRepository } from 'src/database/repositories/message-template.repository';
import { MlClientService } from 'src/clients/ml/ml-client.service';
@Module({
  imports: [DatabaseModule],
  controllers: [BusinessController],
  providers: [
    BusinessService,
    CampaignRepository,
    MessageTemplateRepository,
    MlClientService,
  ],
  exports: [BusinessService],
})
export class BusinessModule {}
