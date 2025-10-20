import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../../database/repositories/user.repository';

export interface JwtPayload {
  sub: string; // Supabase user ID
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  aud?: string;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersRepository: UsersRepository, // Inject repository directly
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    try {
      // 🎯 THIS IS WHERE USER IS SAVED TO MONGODB
      // Called automatically on every authenticated request
      const user = await this.usersRepository.findOrCreate({
        user_id: payload.sub, // Supabase user_id
        email: payload.email,
        fullname: payload.user_metadata?.full_name,
        photo_url: payload.user_metadata?.avatar_url,
      });

      this.logger.debug(`🔐 User authenticated: ${user.email}`);

      // Return user info - available in controllers via @CurrentUser()
      return {
        id: user._id, // MongoDB UUID
        userId: user.user_id, // Supabase user_id
        email: user.email,
        fullname: user.fullname,
        photoUrl: user.photo_url,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to authenticate user: ${error.message}`);
      throw new UnauthorizedException('Failed to authenticate user');
    }
  }
}