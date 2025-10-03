import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { WhatsappWebhookController } from './whatsapp.controller';
import { WhatsappWebhookService } from './whatsapp.service';
import { TwilioSignatureGuard } from './twilio.guard';
import { TwilioSenderService } from './twilio.sender';
import { AiResponderService } from './ai-responder.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WhatsappWebhookController],
  providers: [
    WhatsappWebhookService,
    TwilioSignatureGuard,
    TwilioSenderService,
    AiResponderService,
  ],
})
export class WhatsappWebhookModule {}
