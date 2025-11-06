import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessSchema } from './schemas/business.schema';
import { BusinessSocialMediaSchema } from './schemas/business-social-media.schema';
import { ChatSchema } from './schemas/chat.schema';
import { LeadSchema } from './schemas/lead.schema';
import { MessageSchema } from './schemas/message.schema';
import { UserSchema } from './schemas/user.schema';
import { BusinessesRepository } from './repositories/business.repository';
import { BusinessSocialMediaRepository } from './repositories/business-social-media.repository';
import { ChatsRepository } from './repositories/chat.repository';
import { LeadsRepository } from './repositories/lead.repository';
import { MessagesRepository } from './repositories/message.repository';
import { UsersRepository } from './repositories/user.repository';
import { CampaignSchema } from './schemas/campaign.schema';
import { CampaignRepository } from './repositories/campaign.repository';
import { CampaignLogSchema } from './schemas/campaign-log.schema';
import { CampaignLogRepository } from './repositories/campaign-log.repository';
import { MessageTemplateSchema } from './schemas/message-template.schema';
import { ProductSchema } from './schemas/product.schema';
import { ProductRepository } from './repositories/product.repository';
import { MessageTemplateRepository } from './repositories/message-template.repository';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Business', schema: BusinessSchema },
      { name: 'BusinessSocialMedia', schema: BusinessSocialMediaSchema },
      { name: 'Chat', schema: ChatSchema },
      { name: 'Lead', schema: LeadSchema },
      { name: 'Message', schema: MessageSchema },
      { name: 'Campaign', schema: CampaignSchema },
      { name: 'CampaignLog', schema: CampaignLogSchema },
      { name: 'MessageTemplate', schema: MessageTemplateSchema },
      { name: 'Product', schema: ProductSchema },
    ]),
  ],
  providers: [
    UsersRepository,
    BusinessesRepository,
    BusinessSocialMediaRepository,
    ChatsRepository,
    LeadsRepository,
    MessagesRepository,
    CampaignLogRepository,
    CampaignRepository,
    MessageTemplateRepository,
    ProductRepository,
  ],
  exports: [
    MongooseModule,
    UsersRepository,
    BusinessesRepository,
    BusinessSocialMediaRepository,
    ChatsRepository,
    LeadsRepository,
    MessagesRepository,
    CampaignLogRepository,
    CampaignRepository,
    MessageTemplateRepository,
    ProductRepository,
  ],
})
export class DatabaseModule {}
