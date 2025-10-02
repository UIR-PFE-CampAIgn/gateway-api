import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappWebhookModule } from './webhooks/whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RouterModule.register([
      { path: 'webhooks/whatsapp', module: WhatsappWebhookModule },
    ]),
    WhatsappWebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
