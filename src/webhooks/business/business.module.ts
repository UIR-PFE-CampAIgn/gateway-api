import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { DatabaseModule } from '../../database/database.module';
import { CampaignRepository } from '../../database/repositories/campaign.repository';
import { MessageTemplateRepository } from 'src/database/repositories/message-template.repository';
@Module({
  imports: [DatabaseModule],
  controllers: [BusinessController],
  providers: [BusinessService, CampaignRepository, MessageTemplateRepository],
  exports: [BusinessService],
})
export class BusinessModule {}