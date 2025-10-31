import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { DatabaseModule } from '../../database/database.module';
import { WhatsappWebhookModule } from '../whatsapp/whatsapp.module';
import { BusinessSocialMediaRepository } from 'src/database/repositories/business-social-media.repository';

@Module({
  imports: [DatabaseModule, WhatsappWebhookModule],
  controllers: [ChatsController],
  providers: [ChatsService, BusinessSocialMediaRepository],
  exports: [ChatsService],
})
export class ChatsModule {}