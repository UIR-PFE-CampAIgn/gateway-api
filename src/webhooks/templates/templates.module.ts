import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageTemplateSchema } from '../../database/schemas/message-template.schema';
import { MessageTemplateRepository } from '../../database/repositories/message-template.repository';
import { MessageTemplateService } from './message-template.service';
import { MessageTemplateController } from './message-template.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MessageTemplate', schema: MessageTemplateSchema },
    ]),
  ],
  controllers: [MessageTemplateController],
  providers: [MessageTemplateRepository, MessageTemplateService],
  exports: [MessageTemplateService, MessageTemplateRepository], // Export so other modules can use it
})
export class TemplatesModule {}
