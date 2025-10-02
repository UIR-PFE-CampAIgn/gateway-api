import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { WhatsappWebhookService } from './whatsapp.service';
import { TwilioWhatsAppWebhookDto } from './types';
import { TwilioSignatureGuard } from './twilio.guard';

@Controller()
export class WhatsappWebhookController {
  constructor(private readonly service: WhatsappWebhookService) {}

  @Post()
  @UseGuards(TwilioSignatureGuard)
  @HttpCode(200)
  async receive(
    @Body() body: TwilioWhatsAppWebhookDto,
  ): Promise<{ status: 'ok' }> {
    await this.service.processIncoming(body);
    return { status: 'ok' };
  }
}
