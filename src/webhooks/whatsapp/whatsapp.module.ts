import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { WhatsappWebhookController } from './whatsapp.controller';
import { WhatsappWebhookService } from './whatsapp.service';
import { TwilioSignatureGuard } from './twilio.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappWebhookService, TwilioSignatureGuard],
})
export class WhatsappWebhookModule {}
