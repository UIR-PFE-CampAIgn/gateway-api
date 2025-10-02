import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { User } from '../schemas/user.schema';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(@InjectModel('User') model: Model<User>) {
    super(model);
  }

  findByUserId(userId: string) {
    return this.findOne({ user_id: userId });
  }
}
