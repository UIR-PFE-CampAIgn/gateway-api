import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { BusinessSocialMedia } from '../schemas/business-social-media.schema';

@Injectable()
export class BusinessSocialMediaRepository extends BaseRepository<BusinessSocialMedia> {
  constructor(
    @InjectModel('BusinessSocialMedia') model: Model<BusinessSocialMedia>,
  ) {
    super(model);
  }

  findByBusiness(businessId: string, session?: ClientSession) {
    return this.findMany({ business_id: businessId }, { session });
  }

  findActiveByPlatform(
    businessId: string,
    platform: string,
    session?: ClientSession,
  ) {
    return this.findOne(
      { business_id: businessId, platform, is_active: true },
      session,
    );
  }

  findByPlatformAndPageId(
    platform: string,
    pageId: string,
    session?: ClientSession,
  ) {
    return this.findOne(
      { platform, page_id: pageId, is_active: true },
      session,
    );
  }
}
