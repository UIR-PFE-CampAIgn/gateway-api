import { Injectable, Logger } from '@nestjs/common';
import { normalizeTwilioWhatsAppPayload } from './whatsapp.helper';
import { NormalizedInboundMessage, TwilioWhatsAppWebhookDto } from './types';

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  processIncoming(
    body: TwilioWhatsAppWebhookDto,
  ): NormalizedInboundMessage | null {
    try {
      const normalized = normalizeTwilioWhatsAppPayload(body);
      if (!normalized) {
        this.logger.warn(
          'Received unsupported or empty Twilio WhatsApp payload',
        );
        return null;
      }

      this.logger.log(
        `Inbound WhatsApp from=${normalized.from.phone} name=${normalized.from.name ?? ''} text=${normalized.body ?? ''} media=${normalized.numMedia}`,
      );

      // TODO: persist `normalized` to Mongo (repository to be added later)
      return normalized;
    } catch (e) {
      this.logger.error(
        `Failed to process Twilio webhook: ${(e as Error).message}`,
      );
      return null;
    }
  }
}
