import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Lead } from '../schemas/lead.schema';

@Injectable()
export class LeadsRepository extends BaseRepository<Lead> {
  constructor(@InjectModel('Lead') model: Model<Lead>) {
    super(model);
  }

  findByProviderId(
    provider: string,
    providerUserId: string,
    session?: ClientSession,
  ) {
    return this.findOne(
      { provider, provider_user_id: providerUserId },
      session,
    );
  }
}
