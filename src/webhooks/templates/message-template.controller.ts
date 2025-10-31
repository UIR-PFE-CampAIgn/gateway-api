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
    return this.messageTemplateService.create(createDto);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('businessId') businessId?: string,
  ) {
    return this.messageTemplateService.findAll(businessId, category, search);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.messageTemplateService.findOne(id);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateMessageTemplateDto,
  ) {
    return this.messageTemplateService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return this.messageTemplateService.delete(id);
  }

  @Post(':id/duplicate')
  async duplicate(@Request() req, @Param('id') id: string) {
    return this.messageTemplateService.duplicate(id);
  }
}
