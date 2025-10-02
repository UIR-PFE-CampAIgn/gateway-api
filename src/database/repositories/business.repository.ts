import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Business } from '../schemas/business.schema';

@Injectable()
export class BusinessesRepository extends BaseRepository<Business> {
  constructor(@InjectModel('Business') model: Model<Business>) {
    super(model);
  }

  findByOwner(userId: string) {
    return this.findMany({ user_id: userId });
  }
}
