import { Injectable, Logger } from '@nestjs/common';
import twilio, { Twilio } from 'twilio';

@Injectable()
export class TwilioSenderService {
  private readonly logger = new Logger(TwilioSenderService.name);
  private client: Twilio | null = null;

  private getClient(): Twilio | null {
    if (this.client) return this.client;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      this.logger.warn(
        'Twilio credentials missing; cannot send outbound messages',
      );
      return null;
    }
    this.client = twilio(sid, token);
    return this.client;
  }

  private formatWhatsApp(number: string): string {
    return number?.startsWith('whatsapp:') ? number : `whatsapp:${number}`;
  }

  async sendWhatsAppMessage(
    from: string,
    to: string,
    body: string,
  ): Promise<void> {
    const client = this.getClient();
    if (!client) return;
    try {
      await client.messages.create({
        from: this.formatWhatsApp(from),
        to: this.formatWhatsApp(to),
        body,
      });
    } catch (e) {
      this.logger.error(
        `Failed sending WhatsApp message: ${(e as Error).message}`,
      );
    }
  }
}
