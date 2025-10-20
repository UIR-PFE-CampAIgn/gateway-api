import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { User } from '../schemas/user.schema';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(@InjectModel('User') model: Model<User>) {
    super(model);
  }

  findByUserId(userId: string) {
    return this.findOne({ user_id: userId });
  }

  findByEmail(email: string) {
    return this.findOne({ email });
  }

  /**
   * 🎯 THIS IS THE KEY METHOD
   * Find or create user - called automatically on first request
   */
  async findOrCreate(data: {
    user_id: string;
    email: string;
    fullname?: string;
    photo_url?: string;
  }): Promise<User> {
    try {
      // Try to find existing user
      let user = await this.findByUserId(data.user_id);

      if (!user) {
        // User doesn't exist, create new one
        user = await this.create({
          user_id: data.user_id,
          email: data.email,
          fullname: data.fullname,
          photo_url: data.photo_url,
        });
        
        this.logger.log(`✅ New user created: ${user.email} (${user.user_id})`);
      } else {
        // User exists, optionally update their info if changed
        const updates: Partial<User> = {};
        
        if (data.fullname && data.fullname !== user.fullname) {
          updates.fullname = data.fullname;
        }
        if (data.photo_url && data.photo_url !== user.photo_url) {
          updates.photo_url = data.photo_url;
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          user = await this.updateById(user._id, updates);
          this.logger.log(`🔄 User updated: ${user.email}`);
        }
      }

      return user;
    } catch (error) {
      this.logger.error(`❌ Error in findOrCreate: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<Pick<User, 'fullname' | 'photo_url'>>,
  ): Promise<User | null> {
    const user = await this.findByUserId(userId);
    if (!user) {
      return null;
    }
    return this.updateById(user._id, updates);
  }
}