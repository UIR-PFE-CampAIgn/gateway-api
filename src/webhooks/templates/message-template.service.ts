import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageTemplateRepository } from '../../database/repositories/message-template.repository';
import {
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
  MessageTemplateResponse,
} from './types';

@Injectable()
export class MessageTemplateService {
  constructor(
    private readonly messageTemplateRepository: MessageTemplateRepository,
  ) {}

  private extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(regex);
    return Array.from(new Set(Array.from(matches, (m) => m[1])));
  }

  async create(
    dto: CreateMessageTemplateDto,
  ): Promise<MessageTemplateResponse> {
    const variables = this.extractVariables(dto.content);

    const template = await this.messageTemplateRepository.create({
      business_id: dto.business_id,
      name: dto.name,
      content: dto.content,
      category: dto.category,
      language: dto.language || 'EN',
      variables,
      usage_count: 0,
      is_active: true,
      template_key: dto.template_key,
    });
    console.log('temaplte data', template);

    return this.formatResponse(template);
  }

  async findAll(
    businessId: string,
    category?: string,
    search?: string,
  ): Promise<MessageTemplateResponse[]> {
    let templates;

    if (search) {
      templates = await this.messageTemplateRepository.searchTemplates(
        businessId,
        search,
      );
    } else if (category && category !== 'all') {
      templates = await this.messageTemplateRepository.findByCategory(
        businessId,
        category,
      );
    } else {
      templates =
        await this.messageTemplateRepository.findByBusiness(businessId);
    }
    console.log('Finding templates for businessId:', businessId);
    console.log('Found templates:', templates);

    return templates.map((t) => this.formatResponse(t));
  }

  async findOne(id: string): Promise<MessageTemplateResponse> {
    const template = await this.messageTemplateRepository.findById(id);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.formatResponse(template);
  }

  async update(
    id: string,
    dto: UpdateMessageTemplateDto,
  ): Promise<MessageTemplateResponse> {
    const template = await this.messageTemplateRepository.findById(id);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const updateData: any = { ...dto };

    if (dto.content) {
      updateData.variables = this.extractVariables(dto.content);
    }

    const updated = await this.messageTemplateRepository.updateById(
      id,
      updateData,
    );
    return this.formatResponse(updated);
  }

  async delete(id: string): Promise<{ message: string }> {
    const template = await this.messageTemplateRepository.findById(id);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.messageTemplateRepository.softDelete(id);

    return { message: 'Template deleted successfully' };
  }

  async duplicate(id: string): Promise<MessageTemplateResponse> {
    const template = await this.messageTemplateRepository.findById(id);

    if (!template) {
      throw new NotFoundException('Template not found');
    }
    const duplicated = await this.messageTemplateRepository.create({
      business_id: template.business_id,
      name: `${template.name} (Copy)`,
      content: template.content,
      category: template.category,
      language: template.language,
      variables: template.variables,
      usage_count: 0,
      is_active: true,
    });

    return this.formatResponse(duplicated);
  }

  async incrementUsage(id: string): Promise<void> {
    await this.messageTemplateRepository.incrementUsage(id);
  }

  private formatResponse(template: any): MessageTemplateResponse {
    return {
      id: template._id,
      business_id: template.business_id,
      name: template.name,
      content: template.content,
      category: template.category,
      language: template.language,
      variables: template.variables,
      usage_count: template.usage_count,
      last_used_at: template.last_used_at || null,
      created_at: template.created_at,
      updated_at: template.updated_at,
    };
  }
}
