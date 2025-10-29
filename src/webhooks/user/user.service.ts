import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersRepository } from '../../database/repositories/user.repository';
import { createClient } from '@supabase/supabase-js';
import { AppUser, AppUserResponse } from './types';
import { User } from '../../database/schemas/user.schema';

@Injectable()
export class UsersService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // use service key (server side)
  );

  constructor(private readonly usersRepository: UsersRepository) {}

  async getCurrentUser(accessToken: string): Promise<AppUserResponse> {
    // 1️⃣ Verify token with Supabase
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser(accessToken);

    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired Supabase token');
    }

    // 2️⃣ Check if user exists in our DB
    let appUser = await this.usersRepository.findByUserId(user.id);

    // 3️⃣ If not, create it
    if (!appUser) {
      const newUser: Partial<User> = {
        user_id: user.id,
        email: user.email ?? '',
        fullname: user.user_metadata?.full_name ?? '',
        photo_url: user.user_metadata?.avatar_url ?? '',
      };

      appUser = await this.usersRepository.create(newUser as User);
    }

    // 4️⃣ Return combined data
    return {
      supabaseUser: {
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
        avatar_url: user.user_metadata?.avatar_url ?? '',
      },
      appUserData: (appUser as any)?.toObject
        ? (appUser as any).toObject()
        : appUser,
    };
  }

  async updateUserProfile(
    userId: string,
    data: Partial<AppUser>,
  ): Promise<AppUserResponse> {
    // 1️⃣ Update DB
    const updatedUser = await this.usersRepository.updateByUserId(userId, data);
    console.log(data, 'data');

    // 2️⃣ Optional: update email in Supabase if changed
    if (data.email) {
      await this.supabase.auth.admin.updateUserById(userId, {
        email: data.email,
      });
    }

    return {
      supabaseUser: {
        id: updatedUser.user_id,
        email: updatedUser.email,
        full_name: updatedUser.fullname,
        avatar_url: updatedUser.photo_url,
      },
      appUserData: (updatedUser as any)?.toObject
        ? (updatedUser as any).toObject()
        : updatedUser,
    };
  }
  async changePassword(userId: string, newPassword: string) {
    try {
      // Supabase Admin API updates password for the user
      const { data, error } = await this.supabase.auth.admin.updateUserById(
        userId,
        {
          password: newPassword,
        },
      );

      if (error) throw error;

      return { success: true };
    } catch (err) {
      throw new UnauthorizedException(
        'Failed to change password: ' + err.message,
      );
    }
  }
}
