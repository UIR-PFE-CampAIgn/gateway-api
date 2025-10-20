import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RouterModule } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappWebhookModule } from './webhooks/whatsapp/whatsapp.module';
import { TemplatesModule } from './webhooks/templates/templates.module';
import { CampaignsModule } from './webhooks/campaigns/campaign.module';
import { LeadModule } from './webhooks/leads/lead.module';
import { ChatsModule } from './webhooks/chats/chats.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI || ''),
    RouterModule.register([
      { path: 'webhooks/whatsapp', module: WhatsappWebhookModule },
    ]),
    WhatsappWebhookModule,
    TemplatesModule,
    CampaignsModule,
    LeadModule,
    ChatsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Apply JWT guard globally
    },
  ],
})
export class AppModule {}
