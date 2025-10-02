import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { validateRequest } from 'twilio/lib/webhooks/webhooks';

@Injectable()
export class TwilioSignatureGuard implements CanActivate {
  private readonly logger = new Logger(TwilioSignatureGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const enforce = (process.env.ENFORCE_TWILIO_SIGNATURE || 'false').toLowerCase() === 'true';
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = req.header('x-twilio-signature') || req.header('X-Twilio-Signature');

    if (!enforce) {
      if (!signature) this.logger.warn('Twilio signature not present; enforcement disabled.');
      return true;
    }

    if (!authToken) {
      this.logger.error('TWILIO_AUTH_TOKEN not set; cannot verify signature.');
      return false;
    }
    if (!signature) {
      this.logger.warn('Missing X-Twilio-Signature header');
      return false;
    }

    const url = this.buildFullUrl(req);
    const params = req.body || {};

    try {
      const ok = validateRequest(authToken, signature, url, params);
      if (!ok) {
        this.logger.warn(`Invalid Twilio signature for url=${url}`);
      }
      return ok;
    } catch (e) {
      this.logger.error(`Signature validation failed: ${(e as Error).message}`);
      return false;
    }
  }

  private buildFullUrl(req: Request): string {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    // originalUrl includes path + query string
    const path = (req as any).originalUrl || req.url || '';
    return `${proto}://${host}${path}`;
  }
}

