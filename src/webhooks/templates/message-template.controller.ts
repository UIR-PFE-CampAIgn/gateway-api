import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { MessageTemplateService } from './message-template.service';
import { CreateMessageTemplateDto, UpdateMessageTemplateDto } from './types';

@Controller('message-templates')
export class MessageTemplateController {
  constructor(
    private readonly messageTemplateService: MessageTemplateService,
  ) {}

  @Post()
  async create(@Request() req, @Body() createDto: CreateMessageTemplateDto) {
    // Get businessId from authenticated user/token
    const businessId = req.user?.businessId || 'default-business-id';
    return this.messageTemplateService.create(businessId, createDto);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const businessId = req.user?.businessId || 'default-business-id';
    return this.messageTemplateService.findAll(businessId, category, search);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const businessId = req.user?.businessId || 'default-business-id';
    return this.messageTemplateService.findOne(id, businessId);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateMessageTemplateDto,
  ) {
    const businessId = req.user?.businessId || 'default-business-id';
    return this.messageTemplateService.update(id, businessId, updateDto);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    const businessId = req.user?.businessId || 'default-business-id';
    return this.messageTemplateService.delete(id, businessId);
  }

  @Post(':id/duplicate')
  async duplicate(@Request() req, @Param('id') id: string) {
    const businessId = req.user?.businessId || 'default-business-id';
    return this.messageTemplateService.duplicate(id, businessId);
  }
}
