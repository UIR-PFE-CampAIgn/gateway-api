import { Body, Controller, Get, Headers, Post, Put, Req } from '@nestjs/common';
import { UsersService } from './user.service';
import { AppUser, AppUserResponse } from './types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getCurrentUser(
    @Headers('authorization') authHeader: string,
  ): Promise<AppUserResponse> {
    if (!authHeader?.startsWith('Bearer')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    return this.usersService.getCurrentUser(token);
  }

  @Put('me')
  async updateCurrentUser(
    @Headers('authorization') authHeader: string,
    @Body() data: Partial<AppUser>,
  ): Promise<AppUserResponse> {
    if (!authHeader?.startsWith('Bearer')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const current = await this.usersService.getCurrentUser(token);
    const payload = (data as any)?.appUserData ?? data;
    return this.usersService.updateUserProfile(
      current.supabaseUser.id,
      payload,
    );
  }
  // e.g., users.controller.ts
  @Post('change-password')
  async changePassword(
    @Headers('authorization') authHeader: string,
    @Body() body: { newPassword: string },
  ) {
    if (!authHeader?.startsWith('Bearer')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const currentUser = await this.usersService.getCurrentUser(token);
    return this.usersService.changePassword(
      currentUser.supabaseUser.id,
      body.newPassword,
    );
  }
}
