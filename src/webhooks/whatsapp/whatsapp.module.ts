import { Module } from '@nestjs/common';
import { WhatsappWebhookController } from './whatsapp.controller';
import { WhatsappWebhookService } from './whatsapp.service';
import { TwilioSignatureGuard } from './twilio.guard';

@Module({
  controllers: [WhatsappWebhookController],
  providers: [WhatsappWebhookService, TwilioSignatureGuard],
})
export class WhatsappWebhookModule {}
