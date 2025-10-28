import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LeadsRepository } from '../../database/repositories/lead.repository';
import { UpdateLeadScoreDto, UpdateLeadScoreResponse } from './types';

@Injectable()
export class LeadService {
  constructor(private readonly leadsRepository: LeadsRepository) {}

  async findAll(options: {
    businessId: string;
    search?: string;
    provider?: string;
    score?: 'hot' | 'warm' | 'cold';
    limit?: number;
  }) {
    // Pass businessId to repository search
    const leads = await this.leadsRepository.search(
      {
        businessId: options.businessId, // ✅ Add businessId to filter
        search: options.search,
        provider: options.provider,
        score: options.score,
      },
      options.limit || 100,
    );

    return leads.map((lead) => this.formatResponse(lead));
  }

  async findOne(id: string) {
    const lead = await this.leadsRepository.findById(id);
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    return this.formatResponse(lead);
  }

  async updateScore(dto: UpdateLeadScoreDto): Promise<UpdateLeadScoreResponse> {
    const { lead_id, score } = dto;

    // Validate score value
    if (!['hot', 'warm', 'cold'].includes(score)) {
      throw new BadRequestException('Score must be one of: hot, warm, cold');
    }

    // Check if lead exists
    const existingLead = await this.leadsRepository.findById(lead_id);
    if (!existingLead) {
      throw new NotFoundException(`Lead with ID ${lead_id} not found`);
    }

    // Update the score
    const updatedLead = await this.leadsRepository.updateScore(lead_id, score);

    return {
      success: true,
      lead: this.formatResponse(updatedLead),
      message: `Lead score updated to ${score} successfully`,
    };
  }

  private formatResponse(lead: any) {
    const response: any = {
      id: lead._id,
      provider: lead.provider,
      provider_user_id: lead.provider_user_id,
      display_name: lead.display_name,
      created_at: lead.created_at,
      business_id: lead.business_id,
    };

    // Only include score if it exists
    if (lead.score) {
      response.score = lead.score;
    }

    return response;
  }
}