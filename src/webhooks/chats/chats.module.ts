import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { DatabaseModule } from '../../database/database.module';
import { WhatsappWebhookModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [DatabaseModule, WhatsappWebhookModule],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}