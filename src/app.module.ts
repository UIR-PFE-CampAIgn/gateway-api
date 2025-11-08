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
import { BusinessModule } from './webhooks/business/business.module';
import { DashboardModule } from './webhooks/dashboard/dashboard.module';
import { UsersModule } from './webhooks/user/user.module';
import { ProductsModule } from './webhooks/products/products.module';
import { MlClientModule } from './clients/ml/ml-client.module';

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
    BusinessModule,
    DashboardModule,
    UsersModule,
    ProductsModule,
    MlClientModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
