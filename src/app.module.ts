import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RouterModule } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappWebhookModule } from './webhooks/whatsapp/whatsapp.module';
import { TemplatesModule } from './webhooks/templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI || ''),
    RouterModule.register([
      { path: 'webhooks/whatsapp', module: WhatsappWebhookModule },
    ]),
    WhatsappWebhookModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
