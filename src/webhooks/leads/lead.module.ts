import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadSchema } from '../../database/schemas/lead.schema';
import { LeadsRepository } from '../../database/repositories/lead.repository';
import { LeadService } from './lead.service';
import { LeadController } from './lead.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Lead', schema: LeadSchema }])],
  controllers: [LeadController],
  providers: [LeadsRepository, LeadService],
  exports: [LeadService],
})
export class LeadModule {}
